"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChatCircle,
  Clock,
  Microphone,
  PauseCircle,
} from "@phosphor-icons/react";
import styles from "./consultant.module.css";

export function ConsultantInterviewPreparation({
  articleId,
  title,
  error,
  onStart,
}: {
  articleId: string;
  title: string;
  error?: string;
  onStart: () => void;
}) {
  return (
    <div className={styles.interviewPreparation}>
      <Link
        className={styles.interviewBack}
        href={`/consultant/articles/${articleId}`}
      >
        <ArrowLeft size={20} aria-hidden="true" />
        Back to article
      </Link>
      <section
        className={styles.preparationWelcome}
        aria-labelledby="interview-preparation-title"
      >
        <header className={styles.preparationIntro}>
          <p className={styles.eyebrow}>Ready when you are</p>
          <h1 id="interview-preparation-title">{title}</h1>
          <p className={styles.preparationDescription}>
            Inkwell will ask about your perspective, examples, and practical
            advice. Your answers will shape your draft.
          </p>
        </header>
        <ul
          className={styles.preparationExpectations}
          aria-label="Conversation details"
        >
          <li>
            <Clock size={20} aria-hidden="true" />
            <span>About 10–15 minutes</span>
          </li>
          <li>
            <ChatCircle size={20} aria-hidden="true" />
            <span>No script needed. Just talk naturally.</span>
          </li>
          <li>
            <PauseCircle size={20} aria-hidden="true" />
            <span>You can pause whenever you need.</span>
          </li>
        </ul>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button
          className={`${styles.primary} ${styles.preparationStart}`}
          type="button"
          aria-describedby="interview-microphone-notice"
          onClick={onStart}
        >
          <Microphone size={25} aria-hidden="true" />
          Start conversation
        </button>
        <p
          id="interview-microphone-notice"
          className={styles.preparationNotice}
        >
          Microphone access begins when you start.
        </p>
      </section>
    </div>
  );
}
