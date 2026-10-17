"use client";
import { useEffect, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  consultantRequest as api,
  type Interview,
} from "@/lib/consultant/client";
import type { VoiceSessionResponse } from "@/lib/articles/client-interview-api";
import { useRealtimeInterview } from "@/components/interview/use-realtime-interview";
import styles from "./consultant.module.css";
export function ConsultantInterviewScreen({
  interviewId,
}: {
  interviewId: string;
}) {
  return (
    <ConversationProvider>
      <ConsultantInterviewContent interviewId={interviewId} />
    </ConversationProvider>
  );
}
function ConsultantInterviewContent({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"prepare" | "voice" | "typed">("prepare");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const finishing = useRef(false);
  const answerId = useRef(crypto.randomUUID());
  const [micStatus, setMicStatus] = useState("");
  async function reload() {
    const next = await api<Interview>(`interviews/${interviewId}`);
    setInterview(next);
    return next;
  }
  useEffect(() => {
    api<Interview>(`interviews/${interviewId}`)
      .then(setInterview)
      .catch((e) => setError(e.message));
  }, [interviewId]);
  const voice = useRealtimeInterview(
    `consultant:${interviewId}`,
    "openai_webrtc",
    {
      createSession: (_token, sdp) =>
        api<VoiceSessionResponse>(
          `interviews/${interviewId}/voice/session`,
          "POST",
          { sdp },
        ),
      onTranscriptTurn: async (turn) => {
        const saved = {
          item_id: turn.itemId,
          speaker: turn.speaker,
          text: turn.text,
          ...(turn.voiceSessionId
            ? { voice_session_id: turn.voiceSessionId }
            : {}),
          ...(turn.provider ? { provider: turn.provider } : {}),
        };
        await api(`interviews/${interviewId}/transcript`, "POST", {
          turns: [saved],
        });
        setInterview(
          (current) =>
            current && {
              ...current,
              turns: current.turns.some((t) => t.item_id === saved.item_id)
                ? current.turns
                : [...current.turns, saved],
            },
        );
      },
      onComplete: () => {
        void finish();
      },
    },
  );
  useEffect(() => {
    if (voice.status !== "connected") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [voice.status]);
  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setError("");
    try {
      voice.stop("manual_end_button");
      await voice.flushTranscript();
      await api(`interviews/${interviewId}/finish`, "POST");
      const current = interview ?? (await reload());
      router.push(`/consultant/articles/${current.article_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      finishing.current = false;
    }
  }
  async function submit(skip = false) {
    if (!skip && !answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ complete: boolean }>(
        `interviews/${interviewId}/answer`,
        "POST",
        {
          item_id: answerId.current,
          text: skip ? "Skip this question" : answer,
          skip,
        },
      );
      answerId.current = crypto.randomUUID();
      setAnswer("");
      await reload();
      if (result.complete) await finish();
    } catch (e) {
      setError((e as Error).message);
      await reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!interview)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Preparing your interview…"}
      </p>
    );
  if (interview.state === "completed")
    return (
      <>
        <h1>Your interview is saved.</h1>
        <Link
          className={styles.primary}
          href={`/consultant/articles/${interview.article_id}`}
        >
          View draft progress
        </Link>
      </>
    );
  const lastQuestion =
    [...interview.turns].reverse().find((t) => t.speaker === "interviewer")
      ?.text ?? interview.questions[0]?.text;
  return (
    <>
      <p className={styles.eyebrow}>Your interview</p>
      <h1>{interview.title}</h1>
      <p>{interview.description}</p>
      <p className={styles.muted}>
        Your conversation is transcribed. Finishing automatically creates your
        draft. You can pause and return later.
      </p>
      {(error || voice.error) && (
        <p role="alert" className={styles.error}>
          {error || voice.error}
        </p>
      )}
      {mode === "prepare" ? (
        <section className={styles.card}>
          <h2>Let’s talk through your idea.</h2>
          <p>
            Inkwell will ask about your perspective, examples, and practical
            advice. Allow about 10–15 minutes.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.secondary}
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                  });
                  stream.getTracks().forEach((t) => t.stop());
                  setMicStatus("Microphone is ready.");
                } catch {
                  setMicStatus(
                    "Microphone unavailable. Check permissions or answer by typing.",
                  );
                }
              }}
            >
              Check microphone
            </button>
            <span role="status">{micStatus}</span>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={() => {
                setMode("voice");
                voice.start();
              }}
            >
              Start conversation
            </button>
            <button
              className={styles.secondary}
              onClick={() => setMode("typed")}
            >
              Answer by typing
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className={styles.actions}>
            <span className={styles.status} role="status">
              {mode === "typed"
                ? "Written conversation"
                : voice.status === "connected"
                  ? voice.activity === "speaking"
                    ? "Inkwell is speaking"
                    : "Listening to you"
                  : voice.status === "idle"
                    ? "Paused"
                    : voice.status}{" "}
              · {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
            {mode === "voice" && (
              <>
                <button className={styles.secondary} onClick={voice.toggleMute}>
                  {voice.muted ? "Unmute" : "Mute"}
                </button>
                <button
                  className={styles.secondary}
                  onClick={async () => {
                    if (voice.status === "idle" || voice.status === "error")
                      voice.start();
                    else {
                      voice.stop();
                      try {
                        await voice.flushTranscript();
                        await api(`interviews/${interviewId}/pause`, "POST");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }
                  }}
                >
                  {voice.status === "idle" || voice.status === "error"
                    ? "Resume"
                    : "Pause"}
                </button>
                <button
                  className={styles.secondary}
                  onClick={async () => {
                    voice.stop();
                    try {
                      await voice.flushTranscript();
                      setMode("typed");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Switch to typing
                </button>
              </>
            )}
          </div>
          <p className={styles.muted}>Current question: {lastQuestion}</p>
          <section
            className={`${styles.card} ${styles.transcript}`}
            aria-label="Interview transcript"
            aria-live="polite"
          >
            {interview.turns.map((turn) => (
              <div
                key={turn.item_id}
                className={`${styles.turn} ${turn.speaker === "participant" ? styles.participant : ""}`}
              >
                <strong>
                  {turn.speaker === "participant" ? "You" : "Inkwell"}
                </strong>
                <p>{turn.text}</p>
              </div>
            ))}
            {interview.turns.length === 0 && <p>Ready when you are.</p>}
          </section>
          {mode === "typed" && (
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label>
                {lastQuestion}
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={20000}
                  disabled={busy}
                />
              </label>
              <div className={styles.actions}>
                <button
                  disabled={busy || !answer.trim()}
                  className={styles.primary}
                >
                  Send answer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={styles.secondary}
                  onClick={() => void submit(true)}
                >
                  Skip question
                </button>
              </div>
            </form>
          )}
          <button
            className={styles.primary}
            disabled={busy || (mode === "typed" && !!answer.trim())}
            onClick={() => void finish()}
          >
            {busy ? "Saving…" : "Finish and create draft"}
          </button>
          <p className={styles.muted}>
            Only server-acknowledged turns appear above. Send any typed answer
            before finishing.
          </p>
        </>
      )}
    </>
  );
}
