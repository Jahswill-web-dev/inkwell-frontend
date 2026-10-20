"use client";
import { useEffect, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Microphone,
  MicrophoneSlash,
  Pause,
  Play,
  Stop,
  Waveform,
} from "@phosphor-icons/react";
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
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const finishing = useRef(false);
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
  useEffect(() => {
    if (interview?.state === "completed") {
      router.replace(`/consultant/articles/${interview.article_id}`);
    }
  }, [interview, router]);
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
  if (!interview)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Preparing your interview…"}
      </p>
    );
  if (interview.state === "completed")
    return (
      <>
        <p className={styles.eyebrow}>Interview complete</p>
        <h1>Opening your draft progress…</h1>
        <p className={styles.muted}>
          Your interview is saved and draft generation continues in the
          background.
        </p>
        <Link
          className={styles.primary}
          href={`/consultant/articles/${interview.article_id}`}
        >
          Open draft progress
        </Link>
      </>
    );
  const voiceState = busy
    ? "saving"
    : voice.status === "connected"
      ? voice.muted
        ? "muted"
        : voice.activity
      : voice.status;
  const voiceLabel = {
    saving: "Creating your draft",
    listening: "Inkwell is listening",
    speaking: "Inkwell is speaking",
    muted: "Microphone muted",
    idle: "Conversation paused",
    connecting: "Connecting…",
    reconnecting: "Reconnecting",
    error: "Connection lost",
  }[voiceState];
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <>
      {!started ? (
        <>
          <h1>{interview.title}</h1>
          {(error || voice.error) && (
            <p role="alert" className={styles.error}>
              {error || voice.error}
            </p>
          )}
          <section className={styles.card}>
            <h2>Let’s talk through your idea.</h2>
            <p>
              Inkwell will ask about your perspective, examples, and practical
              advice. Allow about 10–15 minutes.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onClick={() => {
                  setStarted(true);
                  voice.start();
                }}
              >
                Start conversation
              </button>
            </div>
          </section>
        </>
      ) : (
        <section
          className={styles.voiceExperience}
          data-voice-state={voiceState}
        >
          <div className={styles.voiceHeading}>
            <h1>{interview.title}</h1>
          </div>
          {(error || voice.error) && (
            <p role="alert" className={styles.error}>
              {error || voice.error}
            </p>
          )}
          <div className={styles.voiceStage}>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.voiceOrbImage}
              src="/images/consultant/voice-orb.png"
              width={640}
              height={640}
              priority
            />
            <div
              className={styles.voiceOrbContent}
              role="status"
              aria-live="polite"
            >
              <h2>{voiceLabel}</h2>
              <Waveform aria-hidden="true" size={40} weight="bold" />
            </div>
          </div>
          <time className={styles.voiceElapsed} aria-label="Interview duration">
            {elapsed}
          </time>
          <div className={styles.voiceControls}>
            <button
              className={styles.voiceControl}
              type="button"
              aria-pressed={voice.muted}
              disabled={busy || voice.status !== "connected"}
              onClick={voice.toggleMute}
            >
              {voice.muted ? (
                <MicrophoneSlash aria-hidden="true" size={22} weight="bold" />
              ) : (
                <Microphone aria-hidden="true" size={22} weight="bold" />
              )}
              {voice.muted ? "Unmute" : "Mute"}
            </button>
            <button
              className={styles.voiceControl}
              type="button"
              disabled={
                busy ||
                voice.status === "connecting" ||
                voice.status === "reconnecting"
              }
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
              {voice.status === "idle" || voice.status === "error" ? (
                <Play aria-hidden="true" size={22} weight="fill" />
              ) : (
                <Pause aria-hidden="true" size={22} weight="fill" />
              )}
              {voice.status === "idle" || voice.status === "error"
                ? "Resume"
                : "Pause"}
            </button>
            <button
              className={styles.voiceFinish}
              type="button"
              disabled={busy}
              onClick={() => void finish()}
            >
              <Stop aria-hidden="true" size={20} weight="fill" />
              {busy ? "Saving…" : "Finish and create draft"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
