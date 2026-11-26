"use client";

import Image from "next/image";
import {
  CheckCircle,
  CaretDown,
  Microphone,
  MicrophoneSlash,
  Pause,
  Play,
  Waveform,
} from "@phosphor-icons/react";
import type { LiveTranscriptTurn } from "@/components/interview/use-realtime-interview";
import styles from "./consultant.module.css";

export function ConsultantInterviewLive({
  title,
  elapsed,
  voiceState,
  voiceLabel,
  question,
  turns,
  saveStatus,
  error,
  questionError,
  audioBlocked,
  muted,
  paused,
  busy,
  canMute,
  canPause,
  onMute,
  onPause,
  onFinish,
  onResumeAudio,
  onRetryQuestion,
}: {
  title: string;
  elapsed: string;
  voiceState: string;
  voiceLabel: string;
  question: string | null;
  turns: LiveTranscriptTurn[];
  saveStatus: "idle" | "saving" | "saved" | "error";
  error?: string | null;
  questionError: boolean;
  audioBlocked: boolean;
  muted: boolean;
  paused: boolean;
  busy: boolean;
  canMute: boolean;
  canPause: boolean;
  onMute: () => void;
  onPause: () => void;
  onFinish: () => void;
  onResumeAudio: () => void;
  onRetryQuestion: () => void;
}) {
  const saveLabel = {
    idle: "Ready",
    saving: "Saving…",
    saved: "Saved",
    error: "Waiting to save",
  }[saveStatus];
  return (
    <section
      className={styles.liveInterview}
      data-voice-state={voiceState}
      aria-label="Live interview"
    >
      <header className={styles.liveHeader}>
        <h1>{title}</h1>
        <div className={styles.liveMetadata}>
          <time aria-label="Interview duration">{elapsed}</time>
          <span className={styles.liveSaveStatus} role="status">
            {saveStatus === "saved" && (
              <CheckCircle size={24} aria-hidden="true" />
            )}
            {saveLabel}
          </span>
        </div>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.liveStage}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.liveOrb}
          src="/images/consultant/voice-orb.png"
          width={240}
          height={240}
          priority
        />
        <p className={styles.liveVoiceStatus} role="status" aria-live="polite">
          <Waveform size={30} aria-hidden="true" />
          {audioBlocked ? "Audio needs your attention" : voiceLabel}
        </p>
        {audioBlocked && (
          <button
            className={styles.liveTextAction}
            onClick={onResumeAudio}
            type="button"
          >
            Enable audio
          </button>
        )}
        {question ? (
          <h2 className={styles.liveQuestion}>{question}</h2>
        ) : (
          <p className={styles.liveQuestionPlaceholder}>
            {paused
              ? "Resume when you’re ready to continue."
              : "Your question will appear here as Inkwell asks it."}
          </p>
        )}
        {questionError && (
          <p className={styles.liveQuestionError} role="status">
            The question display couldn’t update.{" "}
            <button
              className={styles.liveTextAction}
              onClick={onRetryQuestion}
              type="button"
            >
              Retry
            </button>
          </p>
        )}
        <details className={styles.liveTranscript}>
          <summary>
            <span>Show transcript</span>
            <CaretDown size={18} aria-hidden="true" />
          </summary>
          <div
            className={styles.liveTranscriptBody}
            tabIndex={0}
            aria-label="Conversation transcript"
          >
            {turns.length ? (
              <ol>
                {turns.map((turn) => (
                  <li key={turn.itemId}>
                    <span className={styles.liveTranscriptSpeaker}>
                      {turn.speaker === "interviewer" ? "Inkwell" : "You"}
                    </span>
                    <p>{turn.text}</p>
                    {!turn.saved && (
                      <span className={styles.liveTurnSaving}>Saving…</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Your conversation will appear here.</p>
            )}
          </div>
        </details>
      </div>
      <div className={styles.liveControls}>
        <button
          className={styles.liveControl}
          type="button"
          aria-pressed={muted}
          disabled={!canMute || busy}
          onClick={onMute}
        >
          {muted ? (
            <MicrophoneSlash size={23} aria-hidden="true" />
          ) : (
            <Microphone size={23} aria-hidden="true" />
          )}
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          className={styles.liveControl}
          type="button"
          disabled={!canPause || busy}
          onClick={onPause}
        >
          {paused ? (
            <Play size={22} aria-hidden="true" />
          ) : (
            <Pause size={22} aria-hidden="true" />
          )}
          {paused ? "Resume interview" : "Pause interview"}
        </button>
        <button
          className={styles.liveFinish}
          type="button"
          disabled={busy}
          onClick={onFinish}
        >
          {busy ? "Saving…" : "Finish and create draft"}
        </button>
      </div>
    </section>
  );
}
