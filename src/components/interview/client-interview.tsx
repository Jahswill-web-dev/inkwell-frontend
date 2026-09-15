"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CloudSlash,
  LockKey,
  Microphone,
  PhoneDisconnect,
  SpinnerGap,
  WarningCircle,
  Waveform,
} from "@phosphor-icons/react";
import {
  addFinalInterviewDetail,
  clientInterviewProgress,
  completeClientInterview,
  currentInterviewQuestion,
  pauseClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
  type ClientInterviewSession,
} from "@/lib/articles/client-interview-session";
import type { InterviewInvitation } from "@/lib/articles/client-interview-invitation";
import {
  getGuestInterview,
  InterviewInvitationRequestError,
  updateGuestInterview,
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
      session: ClientInterviewSession;
    };

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function connectivitySnapshot() {
  return navigator.onLine;
}

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
  const [answer, setAnswer] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isCompletingVoice, setIsCompletingVoice] = useState(false);
  const voice = useRealtimeInterview(token, {
    onComplete: completeVoiceInterview,
  });
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    connectivitySnapshot,
    () => true,
  );

  useEffect(() => {
    let active = true;
    getGuestInterview(token)
      .then((interview) => {
        if (active) {
          setContext({ type: "ready", ...interview });
          setAnswer(interview.session.draftAnswer);
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

  const { invitation, session } = context;
  const articleTitle = invitation.articleTitle ?? "the upcoming article";
  const clientName = invitation.clientName ?? "your team";
  const writerName = invitation.writerName ?? "your writer";

  function startVoiceInterview() {
    void voice.start();
  }

  async function persist(nextSession: ClientInterviewSession) {
    setSaving(true);
    try {
      const nextInterview = await updateGuestInterview(token, nextSession);
      setAnswer(nextInterview.session.draftAnswer);
      setContext({
        type: "ready",
        invitation: nextInterview.invitation,
        session: nextInterview.session,
      });
      setServiceError("");
    } catch (error) {
      if (error instanceof InterviewInvitationRequestError) {
        if (error.status === 403) setContext({ type: "revoked" });
        else if (error.status === 410) setContext({ type: "expired" });
        else setServiceError(error.message);
      } else {
        setServiceError(
          "Inkwell couldn’t save that just now. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function beginTextInterview() {
    const nextSession = startClientInterview(session);
    setAnswer(nextSession.draftAnswer);
    void persist(nextSession);
  }

  function submitAnswer() {
    if (!answer.trim() || !online || saving) return;
    const nextSession = submitClientInterviewAnswer(session, answer);
    setAnswer(nextSession.draftAnswer);
    void persist(nextSession);
  }

  function pause() {
    const nextSession = pauseClientInterview(session, answer);
    void persist(nextSession);
  }

  function finish() {
    void persist(completeClientInterview(session));
  }

  function completeVoiceInterview(
    reason: "participant_finished" | "questions_complete",
  ) {
    setIsCompletingVoice(true);
    voice.stop();
    void persist(
      completeClientInterview(
        session,
        reason === "participant_finished"
          ? "participant_finished"
          : "question_limit",
      ),
    ).finally(() => setIsCompletingVoice(false));
  }

  function addFinalDetail() {
    const nextSession = addFinalInterviewDetail(session);
    setAnswer("");
    void persist(nextSession);
  }

  function skipFinalDetail() {
    void persist(completeClientInterview(session));
  }

  if (isCompletingVoice) {
    return (
      <main className={styles.loading} aria-busy="true">
        <span>Finishing your interview…</span>
      </main>
    );
  }

  if (voice.status === "connecting" || voice.status === "connected") {
    const isConnected = voice.status === "connected";

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
            {isConnected ? "Voice connection ready" : "Connecting securely"}
          </span>
          <h1>
            {isConnected
              ? "Your interviewer is ready"
              : "Preparing your voice interview"}
          </h1>
          <p>
            {isConnected
              ? "Your microphone is on. Your interviewer will begin shortly."
              : "Allow microphone access when your browser asks. This usually takes only a moment."}
          </p>
          <div className={styles.voicePrivacy}>
            <Microphone size={19} aria-hidden />
            <span>Your microphone is shared only during this interview.</span>
          </div>
          <button
            className={styles.endVoiceButton}
            onClick={() => completeVoiceInterview("participant_finished")}
            type="button"
          >
            <PhoneDisconnect size={18} aria-hidden /> End voice interview
          </button>
        </section>
      </main>
    );
  }

  if (session.state === "welcome") {
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
              <LockKey size={20} aria-hidden /> Your answers go only to the
              writer
            </span>
          </div>
          <button
            className={styles.primaryButton}
            onClick={startVoiceInterview}
            type="button"
          >
            <Microphone size={18} aria-hidden /> Start voice interview
          </button>
          {voice.error ? (
            <div className={styles.serviceError} role="alert">
              <WarningCircle size={19} aria-hidden />
              <span>{voice.error}</span>
            </div>
          ) : null}
          <small>You&apos;ll be asked to allow microphone access.</small>
        </section>
      </main>
    );
  }

  if (session.state === "paused") {
    return (
      <main className={styles.statePage}>
        <div className={styles.brand}>Inkwell</div>
        <section className={styles.stateCard}>
          <CheckCircle size={36} aria-hidden />
          <h1>Your progress is saved</h1>
          <p>
            Return whenever you’re ready. You’ll continue from this question.
          </p>
          <button
            className={styles.primaryButton}
            disabled={saving}
            onClick={beginTextInterview}
            type="button"
          >
            Continue interview <ArrowRight size={18} aria-hidden />
          </button>
        </section>
      </main>
    );
  }

  if (session.state === "completed") {
    return (
      <main className={styles.statePage}>
        <div className={styles.brand}>Inkwell</div>
        <section className={styles.thankYou}>
          <CheckCircle size={44} weight="fill" aria-hidden />
          <span>Interview complete</span>
          <h1>Thank you, {invitation.participantName}</h1>
          <p>
            Your responses have been saved for {writerName}. They’ll review the
            material before using it in “{articleTitle}”.
          </p>
          {!session.finalDetailAdded ? (
            <button onClick={addFinalDetail} type="button">
              Add one final detail
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  const question = currentInterviewQuestion(session);
  if (!question) return null;
  const progress = clientInterviewProgress(session);

  return (
    <main className={styles.page}>
      <header className={styles.publicHeader}>
        <div className={styles.brand}>Inkwell</div>
        <button onClick={pause} type="button">
          Save and continue later
        </button>
      </header>
      {!online ? (
        <div className={styles.offline} role="alert">
          <CloudSlash size={19} aria-hidden /> Connection lost. Reconnect before
          saving your answer.
        </div>
      ) : null}
      <section className={styles.conversation}>
        <div className={styles.progressHeader}>
          <span>{progress}% complete</span>
          <span>{session.answers.length} responses saved</span>
        </div>
        <div
          className={styles.progressTrack}
          aria-label={`${progress}% complete`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.eyebrow}>
          {question.kind === "follow_up"
            ? "A quick follow-up"
            : "Your perspective"}
        </p>
        <h1>{question.text}</h1>
        <label className={styles.answerField}>
          <span>Your answer</span>
          <textarea
            aria-label="Your answer"
            autoFocus
            maxLength={10_000}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write naturally—specific examples and details are especially helpful."
            rows={7}
            value={answer}
          />
          <small>{answer.length.toLocaleString()} / 10,000</small>
        </label>
        {serviceError ? (
          <div className={styles.serviceError} role="alert">
            <WarningCircle size={19} aria-hidden />
            <span>{serviceError}</span>
            <button onClick={submitAnswer} type="button">
              Try again
            </button>
          </div>
        ) : null}
        <div className={styles.questionActions}>
          <button
            className={styles.secondaryButton}
            disabled={saving || !online}
            onClick={pause}
            type="button"
          >
            <ArrowLeft size={17} aria-hidden /> Save for later
          </button>
          <button
            className={styles.primaryButton}
            disabled={!answer.trim() || !online || saving}
            onClick={submitAnswer}
            type="button"
          >
            Continue <ArrowRight size={18} aria-hidden />
          </button>
        </div>
        {question.kind === "final_detail" ? (
          <button
            className={styles.finishButton}
            disabled={saving || !online}
            onClick={skipFinalDetail}
            type="button"
          >
            Skip this detail
          </button>
        ) : null}
        {session.answers.length >= 2 ? (
          <button
            className={styles.finishButton}
            disabled={saving || !online}
            onClick={finish}
            type="button"
          >
            I’ve shared everything important
          </button>
        ) : null}
      </section>
    </main>
  );
}
