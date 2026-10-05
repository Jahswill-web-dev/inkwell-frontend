"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  LockKey,
  Microphone,
  PhoneDisconnect,
  SpinnerGap,
  WarningCircle,
  Waveform,
} from "@phosphor-icons/react";
import type { InterviewInvitation } from "@/lib/articles/client-interview-invitation";
import {
  getGuestInterview,
  InterviewInvitationRequestError,
  finalizeInterviewTranscript,
  recordInterviewTranscriptTurn,
} from "@/lib/articles/client-interview-api";
import styles from "./client-interview.module.css";
import { useRealtimeInterview } from "./use-realtime-interview";

type GuestContext =
  | { type: "loading" }
  | { type: "invalid" }
  | { type: "expired" }
  | { type: "revoked" }
  | { type: "unavailable"; message: string }
  | {
      type: "ready";
      invitation: InterviewInvitation;
    };

function StateMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className={styles.statePage}>
      <div className={styles.brand}>Inkwell</div>
      <section className={styles.stateCard}>
        <WarningCircle size={35} aria-hidden />
        <h1>{title}</h1>
        <p>{message}</p>
        <small>
          Contact the writer who invited you if you need a new link.
        </small>
      </section>
    </main>
  );
}

export function ClientInterview({ token }: { token: string }) {
  const [context, setContext] = useState<GuestContext>({ type: "loading" });
  const [serviceError, setServiceError] = useState("");
  const [canRetryCompletion, setCanRetryCompletion] = useState(false);
  const [isCompletingVoice, setIsCompletingVoice] = useState(false);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const voice = useRealtimeInterview(token, {
    onComplete: () => void completeVoiceInterview("ai_end_interview_tool"),
    onTranscriptTurn: (turn) =>
      recordInterviewTranscriptTurn(token, turn).then(() => undefined),
  });

  useEffect(() => {
    let active = true;
    getGuestInterview(token)
      .then((interview) => {
        if (active) {
          setContext({ type: "ready", invitation: interview.invitation });
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof InterviewInvitationRequestError) {
          if (error.status === 403) setContext({ type: "revoked" });
          else if (error.status === 410) setContext({ type: "expired" });
          else if (error.status === 404) setContext({ type: "invalid" });
          else setContext({ type: "unavailable", message: error.message });
        } else {
          setContext({
            type: "unavailable",
            message: "The interview could not be loaded. Please try again.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (context.type === "loading") {
    return (
      <main className={styles.loading} aria-busy="true">
        <span>Preparing your interview…</span>
      </main>
    );
  }
  if (context.type === "invalid") {
    return (
      <StateMessage
        title="This interview link isn’t valid"
        message="The link may be incomplete or may have been replaced."
      />
    );
  }
  if (context.type === "expired") {
    return (
      <StateMessage
        title="This interview link has expired"
        message="For privacy, this invitation is no longer accepting responses."
      />
    );
  }
  if (context.type === "revoked") {
    return (
      <StateMessage
        title="This interview link was revoked"
        message="The writer has closed or replaced this invitation."
      />
    );
  }
  if (context.type === "unavailable") {
    return (
      <StateMessage
        title="This interview is temporarily unavailable"
        message={context.message}
      />
    );
  }

  const { invitation } = context;
  const articleTitle = invitation.articleTitle ?? "the upcoming article";
  const clientName = invitation.clientName ?? "your team";
  const writerName = invitation.writerName ?? "your writer";

  function startVoiceInterview() {
    setCanRetryCompletion(false);
    setServiceError("");
    void voice.start();
  }

  async function completeVoiceInterview(
    source: "ai_end_interview_tool" | "manual_end_button",
  ) {
    let stage: "stop" | "flush_transcript" | "finalize" = "stop";
    setIsCompletingVoice(true);
    console.info("[Inkwell voice]", {
      event: "interview_completion_started",
      source,
      at: new Date().toISOString(),
    });
    try {
      voice.stop(source);
      // stop() moves any not-yet-settled transcript fragments into the durable
      // outbox. Drain that outbox before asking the backend to finalize.
      stage = "flush_transcript";
      await voice.flushTranscript();
      stage = "finalize";
      await finalizeInterviewTranscript(token);
      setVoiceCompleted(true);
      setCanRetryCompletion(false);
      setServiceError("");
      console.info("[Inkwell voice]", {
        event: "transcript_finalize_succeeded",
        source,
        at: new Date().toISOString(),
      });
    } catch (error) {
      const diagnostic = {
        event: "transcript_finalize_failed",
        source,
        stage,
        status:
          error instanceof InterviewInvitationRequestError
            ? error.status
            : null,
        code:
          error instanceof InterviewInvitationRequestError ? error.code : null,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : null,
        at: new Date().toISOString(),
      };
      console.error(`[Inkwell voice] ${JSON.stringify(diagnostic)}`);
      setCanRetryCompletion(
        !(
          error instanceof InterviewInvitationRequestError &&
          error.code === "transcript_empty"
        ),
      );
      setServiceError(
        error instanceof InterviewInvitationRequestError
          ? error.message
          : "We couldn’t finish the interview. Please try again.",
      );
    } finally {
      setIsCompletingVoice(false);
    }
  }

  if (isCompletingVoice) {
    return (
      <main className={styles.loading} aria-busy="true">
        <span>Finishing your interview…</span>
      </main>
    );
  }

  if (
    voice.status === "connecting" ||
    voice.status === "connected" ||
    voice.status === "reconnecting"
  ) {
    const isConnected = voice.status === "connected";
    const isReconnecting = voice.status === "reconnecting";

    return (
      <main className={styles.page}>
        <header className={styles.publicHeader}>
          <div className={styles.brand}>Inkwell</div>
          <span>Private voice interview</span>
        </header>
        <section className={styles.voiceInterview} aria-live="polite">
          <div
            className={
              isConnected ? styles.voicePulseConnected : styles.voicePulse
            }
          >
            {isConnected ? (
              <Waveform size={50} weight="fill" aria-hidden />
            ) : (
              <SpinnerGap size={50} aria-hidden />
            )}
          </div>
          <span className={styles.clientLabel}>
            {isConnected
              ? "Voice connection ready"
              : isReconnecting
                ? "Restoring your interview"
                : "Connecting securely"}
          </span>
          <h1>
            {isConnected
              ? "Your interviewer is ready"
              : isReconnecting
                ? "Reconnecting your voice interview"
                : "Preparing your voice interview"}
          </h1>
          <p>
            {isConnected
              ? "Your microphone is on. Your interviewer will introduce the conversation and ask when you’re ready to begin."
              : isReconnecting
                ? "Your conversation is saved. We’re securely restoring the call from where it left off."
                : "Allow microphone access when your browser asks. This usually takes only a moment."}
          </p>
          {isReconnecting && voice.error ? (
            <p className={styles.voiceReconnectMessage} role="status">
              {voice.error}
            </p>
          ) : null}
          <div className={styles.voicePrivacy}>
            <Microphone size={19} aria-hidden />
            <span>Your microphone is shared only during this interview.</span>
          </div>
          <button
            className={styles.endVoiceButton}
            onClick={() => void completeVoiceInterview("manual_end_button")}
            type="button"
          >
            <PhoneDisconnect size={18} aria-hidden /> End voice interview
          </button>
        </section>
      </main>
    );
  }

  if (voiceCompleted || invitation.progressState === "completed") {
    return (
      <main className={styles.statePage}>
        <div className={styles.brand}>Inkwell</div>
        <section className={styles.thankYou}>
          <CheckCircle size={44} weight="fill" aria-hidden />
          <span>Interview complete</span>
          <h1>Thank you, {invitation.participantName}</h1>
          <p>
            Your voice interview has been saved for {writerName}. They’ll review
            the material before using it in “{articleTitle}”.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.publicHeader}>
        <div className={styles.brand}>Inkwell</div>
        <span>Private client interview</span>
      </header>
      <section className={styles.welcome}>
        <span className={styles.clientLabel}>{clientName}</span>
        <h1>Share your expertise for “{articleTitle}”</h1>
        <p>
          Hi {invitation.participantName}. {writerName} invited you to help
          shape this article. Inkwell will guide you through a natural voice
          conversation.
        </p>
        <div className={styles.expectations}>
          <span>
            <Clock size={20} aria-hidden /> About 5–10 minutes
          </span>
          <span>
            <LockKey size={20} aria-hidden /> Your answers go only to the writer
          </span>
        </div>
        <button
          className={styles.primaryButton}
          onClick={startVoiceInterview}
          type="button"
        >
          <Microphone size={18} aria-hidden />{" "}
          {voice.error ? "Reconnect voice interview" : "Start voice interview"}
        </button>
        {canRetryCompletion ? (
          <button
            className={styles.primaryButton}
            onClick={() => void completeVoiceInterview("manual_end_button")}
            type="button"
          >
            Try finishing the saved interview again
          </button>
        ) : null}
        {voice.error ? (
          <div className={styles.serviceError} role="alert">
            <WarningCircle size={19} aria-hidden />
            <span>{voice.error}</span>
          </div>
        ) : null}
        {serviceError ? (
          <div className={styles.serviceError} role="alert">
            <WarningCircle size={19} aria-hidden />
            <span>{serviceError}</span>
          </div>
        ) : null}
        <small>You&apos;ll be asked to allow microphone access.</small>
      </section>
    </main>
  );
}
