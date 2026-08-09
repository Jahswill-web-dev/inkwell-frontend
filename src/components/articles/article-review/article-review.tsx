"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ArticleProgress } from "../article-progress/article-progress";
import {
  createDefaultDraft,
  DRAFT_STORAGE_KEY,
  parseDraft,
  type DraftArticleState,
} from "../draft-editor/draft-editor-data";
import { ReviewArticle } from "./review-article";
import { ReviewFilters } from "./review-filters";
import { ReviewIssuePanel } from "./review-issue-panel";
import { ReviewReadiness } from "./review-readiness";
import {
  applyIssueToDraft,
  createDefaultReview,
  ensureIssueAnchors,
  openIssues,
  parseReview,
  REVIEW_STORAGE_KEY,
  type ReviewCategory,
  type ReviewIssue,
  type ReviewState,
} from "./review-data";
import styles from "./article-review.module.css";

function persistReview(review: ReviewState) {
  window.sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
}

export function ArticleReview() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftArticleState>(() =>
    createDefaultDraft(),
  );
  const [review, setReview] = useState<ReviewState>(() =>
    createDefaultReview(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const savedDraft =
      parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)) ??
      createDefaultDraft();
    const savedReview =
      parseReview(window.sessionStorage.getItem(REVIEW_STORAGE_KEY)) ??
      createDefaultReview();
    const nextReview = ensureIssueAnchors(savedDraft, savedReview);
    const timer = window.setTimeout(() => {
      setDraft(savedDraft);
      setReview(nextReview);
      persistReview(nextReview);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredIssues = useMemo(() => openIssues(review), [review]);
  const activeIssue =
    filteredIssues.find((issue) => issue.id === review.activeIssueId) ??
    filteredIssues[0];
  const activeIndex = activeIssue
    ? filteredIssues.findIndex((issue) => issue.id === activeIssue.id)
    : -1;
  const allOpen = openIssues(review, "all");
  const overallPosition = activeIssue
    ? Math.max(
        0,
        allOpen.findIndex((issue) => issue.id === activeIssue.id),
      ) + 1
    : 0;

  const updateReview = (updater: (current: ReviewState) => ReviewState) => {
    setReview((current) => {
      const next = updater(current);
      persistReview(next);
      return next;
    });
  };

  const selectFilter = (activeFilter: ReviewCategory) => {
    updateReview((current) => {
      const first = openIssues(current, activeFilter)[0];
      return { ...current, activeFilter, activeIssueId: first?.id ?? "" };
    });
  };

  const selectAt = (index: number) => {
    const next = filteredIssues[index];
    if (next)
      updateReview((current) => ({ ...current, activeIssueId: next.id }));
  };

  const resolveIssue = (
    issue: ReviewIssue,
    statusValue: "applied" | "ignored",
    replacement?: string,
  ) => {
    let applied = statusValue === "ignored";
    let nextDraft = draft;
    if (statusValue === "applied") {
      const result = applyIssueToDraft(draft, issue, replacement);
      applied = result.applied;
      nextDraft = result.draft;
    }

    if (nextDraft !== draft) {
      setDraft(nextDraft);
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ ...nextDraft, savedAt: new Date().toISOString() }),
      );
    }

    updateReview((current) => {
      const issues = current.issues.map((candidate) =>
        candidate.id === issue.id
          ? {
              ...candidate,
              status: applied ? statusValue : ("obsolete" as const),
            }
          : candidate,
      );
      const provisional = { ...current, issues };
      const remaining = openIssues(provisional, current.activeFilter);
      return {
        ...provisional,
        activeIssueId:
          remaining[Math.min(activeIndex, Math.max(0, remaining.length - 1))]
            ?.id ?? "",
      };
    });
    setStatus(
      applied
        ? statusValue === "applied"
          ? "Suggestion applied."
          : "Suggestion ignored."
        : "This suggestion no longer matches the draft and was marked obsolete.",
    );
  };

  const showSummary = () =>
    updateReview((current) => ({ ...current, view: "summary" }));
  const showTriage = () =>
    updateReview((current) => ({
      ...current,
      view: "triage",
      activeFilter: "all",
      activeIssueId:
        openIssues(current, "all").find(
          (issue) => issue.id === current.activeIssueId,
        )?.id ??
        openIssues(current, "all")[0]?.id ??
        "",
    }));

  const prepare = () => {
    updateReview((current) => ({ ...current, completed: true }));
    setStatus("Review saved. Your article is ready for publishing details.");
  };

  if (!hydrated)
    return <main className={styles.loading}>Opening your review…</main>;

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        showSettings={false}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileBack}
            aria-label="Back to draft"
            onClick={() => router.push("/articles/new/draft")}
            type="button"
          >
            <ArrowLeft size={26} aria-hidden />
          </button>
          <div className={styles.mobileTitle}>
            <Image
              src="/images/inkwell-icon.png"
              alt=""
              width={35}
              height={48}
              priority
            />
            <strong>Review</strong>
          </div>
          <ArticleProgress currentStep="review" compact />
          <div className={styles.topActions}>
            <button onClick={() => setPreviewOpen(true)} type="button">
              Preview
            </button>
            <button onClick={prepare} type="button">
              Prepare for publishing
            </button>
          </div>
        </header>

        {review.view === "triage" ? (
          <ReviewFilters review={review} onSelect={selectFilter} />
        ) : null}
        <section
          className={`${styles.articleCanvas} ${review.view === "summary" ? styles.summaryCanvas : ""}`}
        >
          {review.view === "summary" ? (
            <header className={styles.reviewIntro}>
              <h1>Review your article</h1>
              <p>A final check before you publish.</p>
            </header>
          ) : null}
          <ReviewArticle
            draft={draft}
            activeIssue={review.view === "triage" ? activeIssue : undefined}
          />
        </section>

        {review.view === "triage" ? (
          <ReviewIssuePanel
            key={activeIssue?.id ?? review.activeFilter}
            issue={activeIssue}
            position={overallPosition}
            total={allOpen.length}
            canPrevious={activeIndex > 0}
            canNext={
              activeIndex >= 0 && activeIndex < filteredIssues.length - 1
            }
            onPrevious={() => selectAt(activeIndex - 1)}
            onNext={() => selectAt(activeIndex + 1)}
            onAccept={() => activeIssue && resolveIssue(activeIssue, "applied")}
            onIgnore={() => activeIssue && resolveIssue(activeIssue, "ignored")}
            onManualSave={(value) =>
              activeIssue &&
              value.trim() &&
              resolveIssue(activeIssue, "applied", value.trim())
            }
            onSummary={showSummary}
          />
        ) : (
          <ReviewReadiness
            review={review}
            onReview={showTriage}
            onBack={() => router.push("/articles/new/draft")}
          />
        )}

        <p className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>

      {previewOpen ? (
        <div
          className={styles.preview}
          role="dialog"
          aria-modal="true"
          aria-label="Article preview"
        >
          <header>
            <button onClick={() => setPreviewOpen(false)} type="button">
              <ArrowLeft size={20} aria-hidden /> Back to review
            </button>
            <strong>Preview</strong>
            <button
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
              type="button"
            >
              <X size={22} aria-hidden />
            </button>
          </header>
          <ReviewArticle draft={draft} preview />
        </div>
      ) : null}
    </main>
  );
}
