"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CloudSlash,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  addFinalInterviewDetail,
  clientInterviewProgress,
  completeClientInterview,
  createClientInterviewSession,
  currentInterviewQuestion,
  pauseClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
  type ClientInterviewSession,
} from "@/lib/articles/client-interview-session";
import {
  loadClientInterviewSession,
  saveClientInterviewSession,
} from "@/lib/articles/client-interview-session-storage";
import {
  isInterviewInvitationExpired,
  type InterviewInvitation,
} from "@/lib/articles/client-interview-invitation";
import {
  findInterviewInvitationByToken,
  saveInterviewInvitation,
} from "@/lib/articles/client-interview-storage";
import styles from "./client-interview.module.css";

type GuestContext =
  | { type: "loading" }
  | { type: "invalid" }
  | { type: "expired"; invitation: InterviewInvitation }
  | { type: "revoked"; invitation: InterviewInvitation }
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

function resolveGuestContext(token: string): GuestContext {
  const invitation = findInterviewInvitationByToken(token);
  if (!invitation) return { type: "invalid" };
  if (invitation.status === "revoked") return { type: "revoked", invitation };
  if (isInterviewInvitationExpired(invitation)) {
    return { type: "expired", invitation };
  }
  const storedSession = loadClientInterviewSession(token);
  const session =
    storedSession ??
    (invitation.progressState === "completed"
      ? completeClientInterview(createClientInterviewSession(token))
      : createClientInterviewSession(token));
  return { type: "ready", invitation, session };
}

function updateInvitationFromSession(
  invitation: InterviewInvitation,
  session: ClientInterviewSession,
  openedAt: string | null = invitation.openedAt,
): InterviewInvitation {
  return {
    ...invitation,
    progressState:
      session.state === "completed"
        ? "completed"
        : session.answers.length > 0
          ? "in_progress"
          : openedAt
            ? "opened"
            : "not_opened",
    questionsAnswered: session.answers.length,
    estimatedQuestions: Math.max(6, session.questions.length),
    openedAt,
    completedAt:
      session.state === "completed" ? new Date().toISOString() : null,
  };
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
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    connectivitySnapshot,
    () => true,
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setContext(resolveGuestContext(token));
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

  const { invitation, session } = context;
  const articleTitle = invitation.articleTitle ?? "the upcoming article";
  const clientName = invitation.clientName ?? "your team";
  const writerName = invitation.writerName ?? "your writer";

  function persist(nextSession: ClientInterviewSession, opened = false) {
    try {
      const openedAt =
        invitation.openedAt ?? (opened ? new Date().toISOString() : null);
      const nextInvitation = updateInvitationFromSession(
        invitation,
        nextSession,
        openedAt,
      );
      saveClientInterviewSession(nextSession);
      saveInterviewInvitation(nextInvitation);
      setContext({
        type: "ready",
        invitation: nextInvitation,
        session: nextSession,
      });
      setServiceError("");
    } catch {
      setServiceError(
        "Inkwell couldn’t save that just now. Your answer is still here—please try again.",
      );
    }
  }

  function begin() {
    const nextSession = startClientInterview(session);
    setAnswer(nextSession.draftAnswer);
    persist(nextSession, true);
  }

  function submitAnswer() {
    if (!answer.trim() || !online) return;
    const nextSession = submitClientInterviewAnswer(session, answer);
    setAnswer(nextSession.draftAnswer);
    persist(nextSession, true);
  }

  function pause() {
    const nextSession = pauseClientInterview(session, answer);
    persist(nextSession, true);
  }

  function finish() {
    persist(completeClientInterview(session), true);
  }

  function addFinalDetail() {
    const nextSession = addFinalInterviewDetail(session);
    setAnswer("");
    persist(nextSession, true);
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
            shape this article. Inkwell asks one focused question at a time and
            may finish early once it has enough useful detail.
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
            onClick={begin}
            type="button"
          >
            Start interview <ArrowRight size={18} aria-hidden />
          </button>
          <small>You can save your progress and continue later.</small>
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
            onClick={begin}
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
          <CloudSlash size={19} aria-hidden /> Connection lost. Your current
          answer stays here until you’re back online.
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
            onClick={pause}
            type="button"
          >
            <ArrowLeft size={17} aria-hidden /> Save for later
          </button>
          <button
            className={styles.primaryButton}
            disabled={!answer.trim() || !online}
            onClick={submitAnswer}
            type="button"
          >
            Continue <ArrowRight size={18} aria-hidden />
          </button>
        </div>
        {session.answers.length >= 2 ? (
          <button
            className={styles.finishButton}
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
