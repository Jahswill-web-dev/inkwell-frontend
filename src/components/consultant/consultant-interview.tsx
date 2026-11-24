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
import { ConsultantInterviewPreparation } from "./consultant-interview-preparation";
import { ConsultantInterviewLive } from "./consultant-interview-live";
import { useConsultantConversation } from "./use-consultant-conversation";
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
  const [busy, setBusy] = useState<"pause" | "finish" | null>(null);
  const [seconds, setSeconds] = useState(0);
  const finishing = useRef(false);
  const conversation = useConsultantConversation(
    interviewId,
    interview,
    started,
  );
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
      observePlayback: true,
      onEvent: conversation.onEvent,
      onTranscriptChange: conversation.onTranscriptChange,
      onPlayback: conversation.onPlayback,
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
    setBusy("finish");
    setError("");
    try {
      conversation.interrupt();
      voice.stop("manual_end_button");
      await voice.flushTranscript();
      await conversation.flushDelivery();
      await api(`interviews/${interviewId}/finish`, "POST");
      conversation.disconnect();
      const current = interview ?? (await reload());
      router.push(`/consultant/articles/${current.article_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
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
    saving: busy === "pause" ? "Pausing conversation…" : "Creating your draft",
    listening: "Listening to you",
    speaking: "Inkwell is speaking",
    muted: "Microphone muted",
    idle: "Conversation paused",
    connecting: "Connecting…",
    reconnecting: "Reconnecting",
    error: "Connection lost",
  }[voiceState];
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const paused = voice.status === "idle" || voice.status === "error";
  async function togglePause() {
    if (paused) {
      voice.start();
      return;
    }
    setBusy("pause");
    setError("");
    conversation.interrupt();
    voice.stop();
    try {
      await voice.flushTranscript();
      await conversation.flushDelivery();
      await api(`interviews/${interviewId}/pause`, "POST");
      conversation.disconnect();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      {!started ? (
        <ConsultantInterviewPreparation
          articleId={interview.article_id}
          title={interview.title}
          error={error || voice.error || undefined}
          onStart={() => {
            setStarted(true);
            voice.start();
          }}
        />
      ) : (
        <ConsultantInterviewLive
          title={interview.title}
          elapsed={elapsed}
          voiceState={voiceState ?? "idle"}
          voiceLabel={voiceLabel ?? "Connecting…"}
          question={conversation.question?.text ?? null}
          turns={conversation.turns}
          saveStatus={voice.saveStatus ?? "idle"}
          error={error || voice.error}
          questionError={conversation.questionError}
          audioBlocked={voice.audioBlocked ?? false}
          muted={voice.muted}
          paused={paused}
          busy={Boolean(busy)}
          canMute={voice.status === "connected"}
          canPause={
            voice.status !== "connecting" && voice.status !== "reconnecting"
          }
          onMute={voice.toggleMute}
          onPause={() => void togglePause()}
          onFinish={() => void finish()}
          onResumeAudio={() => void voice.resumeAudio()}
          onRetryQuestion={() => void conversation.refresh()}
        />
      )}
    </>
  );
}
