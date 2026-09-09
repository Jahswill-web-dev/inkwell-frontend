"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CloudSlash,
  FileText,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  addFinalInterviewDetail,
  clientInterviewProgress,
  completeClientInterview,
  currentInterviewQuestion,
  pauseClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "@/lib/articles/client-interview-session";
import {
  createWriterInterviewMaterial,
  loadWriterInterviewMaterial,
  saveWriterInterviewMaterial,
  type WriterInterviewMaterial,
} from "@/lib/articles/writer-interview-storage";
import { getArticle } from "@/lib/articles/client";
import { loadArticleSetupMetadata } from "@/lib/articles/article-setup-storage";
import styles from "./client-interview.module.css";

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

export function WriterInterviewScreen({
  articleId,
  writerName,
}: {
  articleId: string;
  writerName: string;
}) {
  const [context, setContext] = useState<
    | { type: "loading" }
    | { type: "error" }
    | { type: "ready"; articleTitle: string; clientName: string }
  >({ type: "loading" });

  useEffect(() => {
    let active = true;
    getArticle(articleId)
      .then((article) => {
        if (!active) return;
        setContext({
          type: "ready",
          articleTitle: article.working_title,
          clientName:
            loadArticleSetupMetadata(articleId)?.clientName ??
            "Article workspace",
        });
      })
      .catch(() => {
        if (active) setContext({ type: "error" });
      });
    return () => {
      active = false;
    };
  }, [articleId]);

  if (context.type === "loading") {
    return (
      <main className={styles.loading} aria-busy="true">
        <span>Preparing your interview…</span>
      </main>
    );
  }
  if (context.type === "error") {
    return (
      <main className={styles.statePage}>
        <div className={styles.brand}>Inkwell</div>
        <section className={styles.stateCard}>
          <WarningCircle size={36} aria-hidden />
          <h1>We couldn’t open this interview</h1>
          <p>
            The article may be unavailable. Return to its workspace and try
            again.
          </p>
          <Link href={`/articles/${encodeURIComponent(articleId)}`}>
            Return to article workspace
          </Link>
        </section>
      </main>
    );
  }

  return (
    <WriterInterview
      articleId={articleId}
      articleTitle={context.articleTitle}
      clientName={context.clientName}
      writerName={writerName}
    />
  );
}

export function WriterInterview({
  articleId,
  articleTitle,
  clientName,
  writerName,
}: {
  articleId: string;
  articleTitle: string;
  clientName: string;
  writerName: string;
}) {
  const [material, setMaterial] = useState<WriterInterviewMaterial>(
    () =>
      loadWriterInterviewMaterial(articleId) ??
      createWriterInterviewMaterial(articleId),
  );
  const [answer, setAnswer] = useState(material.session.draftAnswer);
  const [saveError, setSaveError] = useState("");
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    connectivitySnapshot,
    () => true,
  );
  const session = material.session;
  const workspaceHref = `/articles/${encodeURIComponent(articleId)}`;

  function persist(nextSession: typeof session) {
    try {
      setMaterial(saveWriterInterviewMaterial(material, nextSession));
      setSaveError("");
    } catch {
      setSaveError(
        "Inkwell couldn’t save that just now. Your answer is still here—please try again.",
      );
    }
  }

  function begin() {
    const next = startClientInterview(session);
    setAnswer(next.draftAnswer);
    persist(next);
  }

  function submitAnswer() {
    if (!answer.trim() || !online) return;
    const next = submitClientInterviewAnswer(session, answer);
    setAnswer(next.draftAnswer);
    persist(next);
  }

  function pause() {
    persist(pauseClientInterview(session, answer));
  }

  function finish() {
    persist(completeClientInterview(session));
  }

  function addFinalDetail() {
    const next = addFinalInterviewDetail(session);
    setAnswer("");
    persist(next);
  }

  if (session.state === "welcome") {
    return (
      <main className={styles.page}>
        <header className={styles.publicHeader}>
          <div className={styles.brand}>Inkwell</div>
          <span>Whole-article writer interview</span>
        </header>
        <section className={styles.welcome}>
          <span className={styles.clientLabel}>{clientName}</span>
          <h1>Bring your perspective into “{articleTitle}”</h1>
          <p>
            Hi {writerName}. Answer one focused question at a time so Inkwell
            can capture your expertise before the brief or draft is created.
            Follow-ups adapt to your answers, and the interview ends early once
            there is enough useful material.
          </p>
          <div className={styles.expectations}>
            <span>
              <FileText size={20} aria-hidden /> Saved as writer-supplied
              material
            </span>
            <span>Separate from section interviews in the draft editor</span>
          </div>
          <button
            className={styles.primaryButton}
            onClick={begin}
            type="button"
          >
            Interview me <ArrowRight size={18} aria-hidden />
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
          <h1>Your interview is saved</h1>
          <p>Your workspace already reflects the responses you’ve added.</p>
          <button
            className={styles.primaryButton}
            onClick={begin}
            type="button"
          >
            Continue interview <ArrowRight size={18} aria-hidden />
          </button>
          <Link href={workspaceHref}>Return to article workspace</Link>
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
          <span>Whole-article interview complete</span>
          <h1>Your perspective is ready</h1>
          <p>
            {session.answers.length} responses are saved separately as
            writer-supplied material. You’ll be able to approve or exclude them
            in source review before generation.
          </p>
          <Link href={workspaceHref}>Return to article workspace</Link>
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
          <span>{session.answers.length} writer responses saved</span>
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
            : "Whole-article perspective"}
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
        {saveError ? (
          <div className={styles.serviceError} role="alert">
            <WarningCircle size={19} aria-hidden />
            <span>{saveError}</span>
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
