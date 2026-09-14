"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRealtimeInterviewCall } from "@/lib/articles/client-interview-api";

export type RealtimeInterviewStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

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

export function useRealtimeInterview(token: string) {
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<RealtimeInterviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
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

      // This channel will carry interview commands and transcript events next.
      connection.createDataChannel("oai-events");

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
    start,
    status,
    stop,
  };
}