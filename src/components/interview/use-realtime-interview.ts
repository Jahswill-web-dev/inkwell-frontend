"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRealtimeInterviewCall } from "@/lib/articles/client-interview-api";
import type { InterviewTranscriptTurn } from "@/lib/articles/client-interview-api";

export type RealtimeInterviewStatus =
  "idle" | "connecting" | "connected" | "reconnecting" | "error";
export type RealtimeCompletionReason =
  "participant_finished" | "questions_complete";
export type VoiceEndReason =
  | "manual_end_button"
  | "ai_end_interview_tool"
  | "webrtc_failed"
  | "reconnect_exhausted"
  | "microphone_access_denied"
  | "component_unmounted";

type RealtimeInterviewOptions = {
  onComplete?: (reason: RealtimeCompletionReason) => void;
  onTranscriptTurn?: (turn: InterviewTranscriptTurn) => Promise<void>;
};

const FINAL_AUDIO_CLOSE_DELAY_MS = 2_000;
const DISCONNECTED_GRACE_MS = 2_500;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 8_000;

function createDiagnosticId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `voice-${Date.now()}-${Math.random()}`
  );
}

function logVoiceDiagnostic(
  event: string,
  fields: Record<string, boolean | number | string | null> = {},
) {
  // Keep diagnostics useful without exposing the invitation token or transcript text.
  console.info("[Inkwell voice]", {
    event,
    at: new Date().toISOString(),
    ...fields,
  });
}

function waitForIceGatheringComplete(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const onChange = () => {
      if (connection.iceGatheringState !== "complete") return;
      connection.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    connection.addEventListener("icegatheringstatechange", onChange);
  });
}

function outboxKey(token: string) {
  return `inkwell:voice-interview-transcript-outbox:${token}`;
}

function isTranscriptTurn(value: unknown): value is InterviewTranscriptTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<InterviewTranscriptTurn>;
  return (
    typeof turn.itemId === "string" &&
    turn.itemId.length > 0 &&
    (turn.speaker === "participant" || turn.speaker === "interviewer") &&
    typeof turn.text === "string" &&
    turn.text.trim().length > 0
  );
}

function loadOutbox(token: string) {
  try {
    const raw = window.localStorage.getItem(outboxKey(token));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isTranscriptTurn) : [];
  } catch {
    return [];
  }
}

export function useRealtimeInterview(
  token: string,
  { onComplete, onTranscriptTurn }: RealtimeInterviewOptions = {},
) {
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const eventsRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completionReasonRef = useRef<RealtimeCompletionReason | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTranscriptTurnRef = useRef(onTranscriptTurn);
  const seenTranscriptItemsRef = useRef(new Set<string>());
  const transcriptBuffersRef = useRef(
    new Map<
      string,
      {
        itemId: string;
        speaker: InterviewTranscriptTurn["speaker"];
        text: string;
        timer: number;
      }
    >(),
  );
  const completionTimerRef = useRef<number | null>(null);
  const outboxRef = useRef(new Map<string, InterviewTranscriptTurn>());
  const flushPromiseRef = useRef<Promise<void> | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const disconnectedTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const callAttemptIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const activeRef = useRef(false);
  const statusRef = useRef<RealtimeInterviewStatus>("idle");
  const attemptRef = useRef<(reconnecting: boolean) => void>(() => {});
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const [status, setStatus] = useState<RealtimeInterviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const setInterviewStatus = useCallback((next: RealtimeInterviewStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (disconnectedTimerRef.current !== null) {
      window.clearTimeout(disconnectedTimerRef.current);
      disconnectedTimerRef.current = null;
    }
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);
  const closeTransport = useCallback(() => {
    const connection = connectionRef.current;
    connectionRef.current = null;
    eventsRef.current = null;
    if (connection) {
      connection.onconnectionstatechange = null;
      connection.ontrack = null;
      connection.close();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);
  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  const persistOutbox = useCallback(() => {
    try {
      const turns = Array.from(outboxRef.current.values());
      if (turns.length)
        window.localStorage.setItem(outboxKey(token), JSON.stringify(turns));
      else window.localStorage.removeItem(outboxKey(token));
    } catch {
      // The in-memory queue still covers a recoverable connection interruption.
    }
  }, [token]);

  const flushTranscript = useCallback(async () => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const flush = async () => {
      while (outboxRef.current.size > 0) {
        const [itemId, turn] = outboxRef.current.entries().next().value as [
          string,
          InterviewTranscriptTurn,
        ];
        const save = onTranscriptTurnRef.current;
        if (!save) {
          outboxRef.current.delete(itemId);
        } else {
          try {
            await save(turn);
            logVoiceDiagnostic("transcript_save_succeeded", {
              callAttemptId: callAttemptIdRef.current,
              pendingTurnCount: outboxRef.current.size - 1,
            });
          } catch (error) {
            logVoiceDiagnostic("transcript_save_failed", {
              callAttemptId: callAttemptIdRef.current,
              errorName: error instanceof Error ? error.name : typeof error,
            });
            throw error;
          }
          outboxRef.current.delete(itemId);
        }
        persistOutbox();
      }
    };
    const promise = flush();
    flushPromiseRef.current = promise;
    void promise
      .finally(() => {
        if (flushPromiseRef.current !== promise) return;
        flushPromiseRef.current = null;
        if (outboxRef.current.size > 0)
          void flushRef.current().catch(() => undefined);
      })
      .catch(() => undefined);
    return promise;
  }, [persistOutbox]);
  useEffect(() => {
    flushRef.current = flushTranscript;
  }, [flushTranscript]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onTranscriptTurnRef.current = onTranscriptTurn;
  }, [onTranscriptTurn]);
  useEffect(() => {
    outboxRef.current.clear();
    for (const turn of loadOutbox(token))
      outboxRef.current.set(turn.itemId, turn);
    void flushTranscript().catch(() => undefined);
  }, [flushTranscript, token]);

  const scheduleReconnect = useCallback(
    (message: string) => {
      if (!activeRef.current) return;
      clearTimers();
      closeTransport();
      setInterviewStatus("reconnecting");
      if (!navigator.onLine) {
        setError(
          "Your connection is offline. We’ll resume when you’re back online.",
        );
        return;
      }
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        releaseMicrophone();
        setInterviewStatus("error");
        logVoiceDiagnostic("reconnect_exhausted", {
          callAttemptId: callAttemptIdRef.current,
          reconnectAttempts: reconnectAttemptRef.current,
        });
        setError(
          "We couldn’t restore the voice connection. Your transcript is saved; try reconnecting when you’re ready.",
        );
        return;
      }
      reconnectAttemptRef.current += 1;
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(
        1_000 * 2 ** (attempt - 1),
        MAX_RECONNECT_DELAY_MS,
      );
      setError(
        `${message} Reconnecting (${attempt}/${MAX_RECONNECT_ATTEMPTS})…`,
      );
      logVoiceDiagnostic("reconnect_scheduled", {
        callAttemptId: callAttemptIdRef.current,
        reconnectAttempt: attempt,
        delayMs: delay,
        online: navigator.onLine,
      });
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        attemptRef.current(true);
      }, delay);
    },
    [clearTimers, closeTransport, releaseMicrophone, setInterviewStatus],
  );

  const attemptConnection = useCallback(
    async (reconnecting: boolean) => {
      if (!activeRef.current) return;
      clearTimers();
      closeTransport();
      const generation = ++generationRef.current;
      logVoiceDiagnostic("realtime_connection_attempted", {
        callAttemptId: callAttemptIdRef.current,
        reconnecting,
        reconnectAttempt: reconnectAttemptRef.current,
      });
      setInterviewStatus(reconnecting ? "reconnecting" : "connecting");
      if (!reconnecting) setError(null);
      try {
        let stream = streamRef.current;
        if (
          !stream ||
          stream.getTracks().every((track) => track.readyState === "ended")
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (generation !== generationRef.current || !activeRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
        }
        const connection = new RTCPeerConnection();
        connectionRef.current = connection;
        const remoteAudio = new Audio();
        remoteAudio.autoplay = true;
        audioRef.current = remoteAudio;
        stream
          .getTracks()
          .forEach((track) => connection.addTrack(track, stream));
        connection.ontrack = (event) => {
          remoteAudio.srcObject = event.streams[0];
          void remoteAudio.play().catch(() => undefined);
        };
        connection.onconnectionstatechange = () => {
          if (generation !== generationRef.current || !activeRef.current)
            return;
          if (connection.connectionState === "connected") {
            clearTimers();
            reconnectAttemptRef.current = 0;
            setInterviewStatus("connected");
            void flushRef.current().catch(() => undefined);
          } else if (connection.connectionState === "failed") {
            logVoiceDiagnostic("webrtc_connection_failed", {
              callAttemptId: callAttemptIdRef.current,
              iceConnectionState: connection.iceConnectionState,
            });
            scheduleReconnect("The voice connection was interrupted.");
          } else if (connection.connectionState === "disconnected") {
            logVoiceDiagnostic("webrtc_connection_disconnected", {
              callAttemptId: callAttemptIdRef.current,
              iceConnectionState: connection.iceConnectionState,
            });
            disconnectedTimerRef.current = window.setTimeout(() => {
              if (
                connection.connectionState === "disconnected" &&
                generation === generationRef.current
              ) {
                scheduleReconnect("The voice connection was interrupted.");
              }
            }, DISCONNECTED_GRACE_MS);
          }
        };
        const events = connection.createDataChannel("oai-events");
        eventsRef.current = events;
        events.addEventListener(
          "open",
          () => {
            logVoiceDiagnostic("realtime_data_channel_opened", {
              callAttemptId: callAttemptIdRef.current,
            });
          },
          { once: true },
        );
        events.addEventListener("close", () => {
          logVoiceDiagnostic("realtime_data_channel_closed", {
            callAttemptId: callAttemptIdRef.current,
          });
        });
        events.addEventListener("error", () => {
          logVoiceDiagnostic("realtime_data_channel_error", {
            callAttemptId: callAttemptIdRef.current,
          });
        });
        events.addEventListener("message", (message) => {
          let event: unknown;
          try {
            event = JSON.parse(String(message.data));
          } catch {
            return;
          }
          if (!event || typeof event !== "object") return;
          const liveEvent = event as {
            delta?: string;
            event?: {
              item?: { arguments?: string; name?: string; type?: string };
              type?: string;
            };
            event_id?: string;
            item?: { arguments?: string; name?: string; type?: string };
            item_id?: string;
            transcript?: string;
            type?: string;
            error?: { code?: string; type?: string };
          };
          if (liveEvent.type === "error") {
            logVoiceDiagnostic("realtime_server_error", {
              callAttemptId: callAttemptIdRef.current,
              errorCode: liveEvent.error?.code ?? null,
              errorType: liveEvent.error?.type ?? null,
            });
            return;
          }
          if (liveEvent.type === "session.started") {
            setInterviewStatus("connected");
            setError(null);
            // Live accepts commands after the session has started, which can
            // happen after the WebRTC data channel itself opens.
            events.send(JSON.stringify({ type: "response.create" }));
            return;
          }
          const completeSpeaker =
            liveEvent.type ===
            "conversation.item.input_audio_transcription.completed"
              ? "participant"
              : liveEvent.type === "response.output_audio_transcript.done"
                ? "interviewer"
                : null;
          if (
            completeSpeaker &&
            liveEvent.item_id &&
            liveEvent.transcript?.trim()
          ) {
            const existing = transcriptBuffersRef.current.get(
              liveEvent.item_id,
            );
            if (existing) window.clearTimeout(existing.timer);
            transcriptBuffersRef.current.delete(liveEvent.item_id);
            outboxRef.current.set(liveEvent.item_id, {
              itemId: liveEvent.item_id,
              speaker: completeSpeaker,
              text: liveEvent.transcript,
            });
            persistOutbox();
            void flushRef.current().catch(() => undefined);
            return;
          }
          const speaker =
            liveEvent.type === "session.input_transcript.delta" ||
            liveEvent.type ===
              "conversation.item.input_audio_transcription.delta"
              ? "participant"
              : liveEvent.type === "session.output_transcript.delta" ||
                  liveEvent.type === "response.output_audio_transcript.delta"
                ? "interviewer"
                : null;
          if (
            speaker &&
            typeof liveEvent.delta === "string" &&
            liveEvent.delta.length > 0
          ) {
            const key = liveEvent.item_id ?? `live:${speaker}`;
            const itemId =
              liveEvent.item_id ?? liveEvent.event_id ?? createDiagnosticId();
            const oppositeKey = `live:${speaker === "participant" ? "interviewer" : "participant"}`;
            const opposite = transcriptBuffersRef.current.get(oppositeKey);
            if (opposite) {
              window.clearTimeout(opposite.timer);
              transcriptBuffersRef.current.delete(oppositeKey);
              outboxRef.current.set(opposite.itemId, {
                itemId: opposite.itemId,
                speaker: opposite.speaker,
                text: opposite.text,
              });
              persistOutbox();
              void flushRef.current().catch(() => undefined);
            }
            const existing = transcriptBuffersRef.current.get(key);
            if (existing) {
              window.clearTimeout(existing.timer);
              existing.text += liveEvent.delta;
              existing.timer = window.setTimeout(() => {
                transcriptBuffersRef.current.delete(key);
                outboxRef.current.set(existing.itemId, {
                  itemId: existing.itemId,
                  speaker: existing.speaker,
                  text: existing.text,
                });
                persistOutbox();
                void flushRef.current().catch(() => undefined);
              }, 1_500);
            } else {
              const buffer: {
                itemId: string;
                speaker: InterviewTranscriptTurn["speaker"];
                text: string;
                timer: number;
              } = {
                itemId,
                speaker,
                text: liveEvent.delta,
                timer: 0,
              };
              buffer.timer = window.setTimeout(() => {
                transcriptBuffersRef.current.delete(key);
                outboxRef.current.set(itemId, {
                  itemId,
                  speaker,
                  text: buffer.text,
                });
                persistOutbox();
                void flushRef.current().catch(() => undefined);
              }, 1_500);
              transcriptBuffersRef.current.set(key, buffer);
            }
            return;
          }
          const toolItem =
            liveEvent.type === "response.output_item.done" &&
            liveEvent.item?.type === "function_call" &&
            liveEvent.item.name === "end_interview"
              ? liveEvent.item
              : liveEvent.type === "response.event" &&
                  liveEvent.event?.type === "response.output_item.done" &&
                  liveEvent.event.item?.type === "function_call" &&
                  liveEvent.event.item.name === "end_interview"
                ? liveEvent.event.item
                : null;
          if (toolItem) {
            logVoiceDiagnostic("interview_completion_requested", {
              callAttemptId: callAttemptIdRef.current,
              source: "ai_end_interview_tool",
            });
            try {
              const value = JSON.parse(toolItem.arguments ?? "{}") as {
                reason?: unknown;
              };
              if (
                value.reason === "participant_finished" ||
                value.reason === "questions_complete"
              ) {
                completionReasonRef.current = value.reason;
                if (completionTimerRef.current !== null)
                  window.clearTimeout(completionTimerRef.current);
                completionTimerRef.current = window.setTimeout(() => {
                  completionTimerRef.current = null;
                  const reason = completionReasonRef.current;
                  completionReasonRef.current = null;
                  if (reason && activeRef.current)
                    onCompleteRef.current?.(reason);
                }, FINAL_AUDIO_CLOSE_DELAY_MS);
              }
            } catch {
              // Keep the interview active on malformed tool input.
            }
            return;
          }
        });
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await waitForIceGatheringComplete(connection);
        const sdp = connection.localDescription?.sdp;
        if (!sdp)
          throw new Error("The browser could not create a voice connection.");

        // A replacement call is given the persisted transcript by the server.
        // Drain the durable outbox first so its context includes the final turns
        // received just before the interrupted connection closed.
        await flushRef.current();
        const answer = await createRealtimeInterviewCall(token, sdp);
        if (generation !== generationRef.current || !activeRef.current) return;
        await connection.setRemoteDescription({
          type: "answer",
          sdp: answer.sdp,
        });
      } catch (caughtError) {
        if (generation !== generationRef.current || !activeRef.current) return;
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "NotAllowedError"
        ) {
          closeTransport();
          releaseMicrophone();
          setInterviewStatus("error");
          logVoiceDiagnostic("microphone_access_denied", {
            callAttemptId: callAttemptIdRef.current,
          });
          setError(
            "Microphone access is required to start the voice interview.",
          );
          return;
        }
        logVoiceDiagnostic("realtime_connection_attempt_failed", {
          callAttemptId: callAttemptIdRef.current,
          errorName:
            caughtError instanceof Error
              ? caughtError.name
              : typeof caughtError,
          reconnecting,
        });
        scheduleReconnect(
          reconnecting
            ? "We couldn’t restore the voice connection."
            : "We couldn’t start the voice connection.",
        );
      }
    },
    [
      clearTimers,
      closeTransport,
      persistOutbox,
      releaseMicrophone,
      scheduleReconnect,
      setInterviewStatus,
      token,
    ],
  );
  useEffect(() => {
    attemptRef.current = (reconnecting) => {
      void attemptConnection(reconnecting);
    };
  }, [attemptConnection]);

  const start = useCallback(() => {
    activeRef.current = true;
    callAttemptIdRef.current = createDiagnosticId();
    completionReasonRef.current = null;
    reconnectAttemptRef.current = 0;
    seenTranscriptItemsRef.current.clear();
    logVoiceDiagnostic("voice_call_started", {
      callAttemptId: callAttemptIdRef.current,
      online: navigator.onLine,
    });
    attemptRef.current(false);
  }, []);
  const stop = useCallback(
    (reason: VoiceEndReason = "component_unmounted") => {
      logVoiceDiagnostic("voice_call_stopped", {
        callAttemptId: callAttemptIdRef.current,
        reason,
        pendingTurnCount: outboxRef.current.size,
      });
      activeRef.current = false;
      completionReasonRef.current = null;
      generationRef.current += 1;
      if (eventsRef.current?.readyState === "open") {
        eventsRef.current.send(JSON.stringify({ type: "session.close" }));
      }
      for (const buffer of transcriptBuffersRef.current.values()) {
        window.clearTimeout(buffer.timer);
        outboxRef.current.set(buffer.itemId, {
          itemId: buffer.itemId,
          speaker: buffer.speaker,
          text: buffer.text,
        });
      }
      transcriptBuffersRef.current.clear();
      persistOutbox();
      clearTimers();
      closeTransport();
      releaseMicrophone();
      seenTranscriptItemsRef.current.clear();
      setInterviewStatus("idle");
    },
    [
      clearTimers,
      closeTransport,
      persistOutbox,
      releaseMicrophone,
      setInterviewStatus,
    ],
  );

  useEffect(() => {
    const resumeWhenOnline = () => {
      if (activeRef.current && statusRef.current === "reconnecting") {
        clearTimers();
        attemptRef.current(true);
      }
      void flushRef.current().catch(() => undefined);
    };
    window.addEventListener("online", resumeWhenOnline);
    return () => window.removeEventListener("online", resumeWhenOnline);
  }, [clearTimers]);
  useEffect(() => stop, [stop]);

  return { error, flushTranscript, start, status, stop };
}
