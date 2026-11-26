"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Article } from "@/lib/consultant/client";
import styles from "./consultant-generation.module.css";

type Props = {
  title: string;
  job: NonNullable<Article["job"]>;
  error: string;
  busy: boolean;
  onRetry: () => void;
  onRefresh: () => void;
};

export function ConsultantGeneration({
  title,
  job,
  error,
  busy,
  onRetry,
  onRefresh,
}: Props) {
  const failed = job.state === "failed";
  const queued = job.state === "queued";
  const saving = !queued && job.stage === "saving";
  const heading = failed
    ? "Your interview is safe. Let’s try that again."
    : queued
      ? job.attempts > 0
        ? "Your draft will retry shortly."
        : "Your draft is waiting to begin."
      : "Your ideas are becoming an article.";
  const activeLabel = failed
    ? "Draft generation paused"
    : queued
      ? "Waiting to begin"
      : saving
        ? "Saving your article"
        : "Writing your draft";
  const steps = [
    { label: "Interview saved", detail: "Ready to use", state: "complete" },
    {
      label: "Writing your draft",
      detail: queued
        ? job.attempts > 0
          ? "Retrying shortly"
          : "Waiting to begin"
        : saving
          ? "Draft written"
          : failed
            ? "Ready to retry"
            : "Shaping your argument and examples",
      state: saving
        ? "complete"
        : failed
          ? "failed"
          : queued
            ? "pending"
            : "active",
    },
    {
      label: "Saving your article",
      detail: saving ? (failed ? "Ready to retry" : "Finishing up") : "Up next",
      state: saving ? (failed ? "failed" : "active") : "pending",
    },
  ];

  return (
    <section className={styles.generation} data-consultant-generation>
      <Link className={styles.back} href="/consultant">
        <ArrowLeft aria-hidden="true" size={23} />
        My articles
      </Link>
      <p className={styles.srOnly} role="status">
        {activeLabel}
      </p>
      <div className={styles.body}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            {failed ? "Draft needs attention" : "Draft in progress"}
          </p>
          <h1>{heading}</h1>
          <p className={styles.description}>
            {failed
              ? "Your interview is saved. Try again when you’re ready."
              : "Your interview is saved. You can leave this page while Inkwell writes."}
          </p>
          <div className={styles.article}>
            <p>Your article</p>
            <h2>{title}</h2>
          </div>
          {failed && (
            <p className={styles.failure} role="alert">
              {error ||
                job.error ||
                "We couldn’t create your draft. Please try again."}
            </p>
          )}
          {!failed && error && (
            <div className={styles.refreshError} role="alert">
              <p>
                We couldn’t refresh your progress. Your draft may still be
                running.
              </p>
              <button disabled={busy} onClick={onRefresh} type="button">
                Refresh progress
              </button>
            </div>
          )}
          <div className={styles.actions}>
            {failed ? (
              <>
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={onRetry}
                  type="button"
                >
                  {busy ? "Retrying…" : "Retry generation"}
                </button>
                <Link className={styles.secondary} href="/consultant">
                  Back to my articles
                </Link>
              </>
            ) : (
              <Link className={styles.primary} href="/consultant">
                Back to my articles
              </Link>
            )}
          </div>
          {!failed && (
            <p className={styles.ready}>
              Your draft will appear here when it’s ready.
            </p>
          )}
        </div>
        <ol className={styles.steps} aria-label="Draft progress">
          {steps.map((step) => {
            const Icon =
              step.state === "complete"
                ? CheckCircle
                : step.state === "active"
                  ? CircleNotch
                  : step.state === "failed"
                    ? WarningCircle
                    : Circle;
            return (
              <li
                key={step.label}
                className={styles.step}
                data-state={step.state}
                aria-current={step.state === "active" ? "step" : undefined}
              >
                <Icon
                  aria-hidden="true"
                  className={styles.stepIcon}
                  size={52}
                  weight="light"
                />
                <div>
                  <span className={styles.srOnly}>
                    {step.state === "complete"
                      ? "Completed: "
                      : step.state === "failed"
                        ? "Failed: "
                        : ""}
                  </span>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
