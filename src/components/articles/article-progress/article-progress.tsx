import Link from "next/link";
import { Check, type IconWeight } from "@phosphor-icons/react";
import styles from "./article-progress.module.css";

export type ArticleWorkflowStep =
  | "setup"
  | "interviews"
  | "sources"
  | "brief"
  | "outline"
  | "draft"
  | "review"
  | "publish";

type ProgressStep = {
  id: ArticleWorkflowStep;
  desktopLabel: string;
  mobileLabel: string;
  href?: string;
  workspaceHref?: "article" | "interviews" | "sources";
};

const steps: readonly ProgressStep[] = [
  {
    id: "setup",
    desktopLabel: "Setup",
    mobileLabel: "Setup",
    workspaceHref: "article",
  },
  {
    id: "interviews",
    desktopLabel: "Interviews",
    mobileLabel: "Interview",
    workspaceHref: "interviews",
  },
  {
    id: "sources",
    desktopLabel: "Sources",
    mobileLabel: "Sources",
    workspaceHref: "sources",
  },
  {
    id: "brief",
    desktopLabel: "Brief",
    mobileLabel: "Brief",
    href: "/articles/new/brief",
  },
  {
    id: "outline",
    desktopLabel: "Outline",
    mobileLabel: "Outline",
    href: "/articles/new/outline",
  },
  {
    id: "draft",
    desktopLabel: "Draft",
    mobileLabel: "Draft",
    href: "/articles/new/draft",
  },
  {
    id: "review",
    desktopLabel: "Review",
    mobileLabel: "Review",
    href: "/articles/new/review",
  },
  { id: "publish", desktopLabel: "Publish", mobileLabel: "Publish" },
];

function progressHref(step: ProgressStep, articleId?: string) {
  if (!articleId) return step.href;
  if (step.workspaceHref === "article") return `/articles/${articleId}`;
  if (step.workspaceHref) return `/articles/${articleId}/${step.workspaceHref}`;
  return step.href
    ? `${step.href}?articleId=${encodeURIComponent(articleId)}`
    : undefined;
}

export function ArticleProgress({
  currentStep,
  compact = false,
  articleId,
}: {
  currentStep: ArticleWorkflowStep;
  compact?: boolean;
  articleId?: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <nav
      className={`${styles.progress} ${compact ? styles.compact : ""}`}
      aria-label="Article progress"
    >
      <ol>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const weight: IconWeight = isComplete ? "bold" : "regular";
          const content = (
            <>
              <span className={styles.marker} aria-hidden>
                {isComplete ? <Check size={17} weight={weight} /> : stepNumber}
              </span>
              <span className={styles.desktopLabel}>{step.desktopLabel}</span>
              <span className={styles.mobileLabel}>{step.mobileLabel}</span>
            </>
          );

          const href = progressHref(step, articleId);
          return (
            <li
              className={
                isCurrent ? styles.current : isComplete ? styles.complete : ""
              }
              key={step.desktopLabel}
            >
              {isComplete && href ? (
                <Link aria-label={step.desktopLabel} href={href}>
                  {content}
                </Link>
              ) : (
                <span
                  aria-label={step.desktopLabel}
                  className={styles.stepContent}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={!isCurrent ? true : undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
