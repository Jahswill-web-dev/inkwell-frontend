"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRealtimeInterviewCall } from "@/lib/articles/client-interview-api";
import type { InterviewTranscriptTurn } from "@/lib/articles/client-interview-api";

export type RealtimeInterviewStatus =
  "idle" | "connecting" | "connected" | "error";

export type RealtimeCompletionReason =
  "participant_finished" | "questions_complete";

type RealtimeInterviewOptions = {
  onComplete?: (reason: RealtimeCompletionReason) => void;
  onTranscriptTurn?: (turn: InterviewTranscriptTurn) => Promise<void>;
};

const FINAL_AUDIO_CLOSE_DELAY_MS = 2_000;

function waitForIceGatheringComplete(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (connection.iceGatheringState !== "complete") return;

      connection.removeEventListener(
        "icegatheringstatechange",
        handleStateChange,
      );
      resolve();
    };

    connection.addEventListener("icegatheringstatechange", handleStateChange);
  });
}

export function useRealtimeInterview(
  token: string,
  { onComplete, onTranscriptTurn }: RealtimeInterviewOptions = {},
) {
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completionReasonRef = useRef<RealtimeCompletionReason | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTranscriptTurnRef = useRef(onTranscriptTurn);
  const pendingTranscriptSavesRef = useRef<Promise<void>[]>([]);
  const seenTranscriptItemsRef = useRef(new Set<string>());

  const [status, setStatus] = useState<RealtimeInterviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onTranscriptTurnRef.current = onTranscriptTurn;
  }, [onTranscriptTurn]);

  const stop = useCallback(() => {
    completionReasonRef.current = null;
    pendingTranscriptSavesRef.current = [];
    seenTranscriptItemsRef.current.clear();
    connectionRef.current?.close();
    connectionRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    setStatus("idle");
  }, []);

  const flushTranscript = useCallback(async () => {
    await Promise.all(pendingTranscriptSavesRef.current);
  }, []);

  const start = useCallback(async () => {
    stop();
    setStatus("connecting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      const connection = new RTCPeerConnection();
      connectionRef.current = connection;

      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      audioRef.current = remoteAudio;

      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
      });

      connection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        void remoteAudio.play().catch(() => {
          // The user clicked Start, so most browsers allow playback here.
        });
      };

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "connected") {
          setStatus("connected");
        }

        if (connection.connectionState === "failed") {
          setStatus("error");
          setError("The voice connection was lost. Please try again.");
        }
      };

      const events = connection.createDataChannel("oai-events");
      events.addEventListener("message", (message) => {
        let event: unknown;
        try {
          event = JSON.parse(String(message.data));
        } catch {
          return;
        }
        if (!event || typeof event !== "object") return;

        const realtimeEvent = event as {
          arguments?: string;
          item_id?: string;
          name?: string;
          transcript?: string;
          type?: string;
        };
        const isParticipantTranscript =
          realtimeEvent.type ===
          "conversation.item.input_audio_transcription.completed";
        const isInterviewerTranscript =
          realtimeEvent.type === "response.output_audio_transcript.done";
        if (
          (isParticipantTranscript || isInterviewerTranscript) &&
          realtimeEvent.item_id &&
          realtimeEvent.transcript?.trim()
        ) {
          const itemId = realtimeEvent.item_id;
          if (!seenTranscriptItemsRef.current.has(itemId)) {
            seenTranscriptItemsRef.current.add(itemId);
            const save = onTranscriptTurnRef.current?.({
              itemId,
              speaker: isParticipantTranscript ? "participant" : "interviewer",
              text: realtimeEvent.transcript,
            });
            if (save)
              pendingTranscriptSavesRef.current.push(
                save.catch(() => undefined),
              );
          }
          return;
        }
        if (
          realtimeEvent.type === "response.function_call_arguments.done" &&
          realtimeEvent.name === "end_interview"
        ) {
          try {
            const argumentsValue = JSON.parse(
              realtimeEvent.arguments ?? "{}",
            ) as {
              reason?: unknown;
            };
            if (
              argumentsValue.reason === "participant_finished" ||
              argumentsValue.reason === "questions_complete"
            ) {
              completionReasonRef.current = argumentsValue.reason;
            }
          } catch {
            // Ignore a malformed completion call and keep the interview open.
          }
          return;
        }

        if (
          realtimeEvent.type === "response.done" &&
          completionReasonRef.current !== null
        ) {
          const reason = completionReasonRef.current;
          completionReasonRef.current = null;
          void Promise.all(pendingTranscriptSavesRef.current).then(() =>
            window.setTimeout(() => {
              stop();
              onCompleteRef.current?.(reason);
            }, FINAL_AUDIO_CLOSE_DELAY_MS),
          );
        }
      });
      events.addEventListener(
        "open",
        () => {
          // Request the opening turn explicitly so the interviewer greets the
          // participant instead of waiting for microphone input to begin.
          events.send(JSON.stringify({ type: "response.create" }));
        },
        { once: true },
      );

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await waitForIceGatheringComplete(connection);

      const sdp = connection.localDescription?.sdp;
      if (!sdp) {
        throw new Error("The browser could not create a voice connection.");
      }

      const answer = await createRealtimeInterviewCall(token, sdp);

      await connection.setRemoteDescription({
        type: "answer",
        sdp: answer.sdp,
      });
    } catch (caughtError) {
      stop();
      setStatus("error");

      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotAllowedError"
      ) {
        setError("Microphone access is required to start the voice interview.");
      } else {
        setError(
          "We couldn’t start the voice interview. Please check your connection and try again.",
        );
      }
    }
  }, [stop, token]);

  useEffect(() => stop, [stop]);

  return {
    error,
    flushTranscript,
    start,
    status,
    stop,
  };
}
