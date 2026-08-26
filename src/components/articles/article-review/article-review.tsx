"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import {
  ArticleRequestError,
  getArticle,
  getArticleDraft,
  updateArticleDraft,
} from "@/lib/articles/client";
import { ArticleProgress } from "../article-progress/article-progress";
import {
  createDefaultDraft,
  toArticleDraftPatch,
  toDraftArticleState,
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

const articleIdSchema = z.string().uuid();
type LoadFailure = {
  kind: "missing-id" | "not-found" | "missing-draft" | "error";
  message: string;
  retryable: boolean;
};

function persistReview(review: ReviewState) {
  window.sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
}

export function ArticleReview({
  articleId,
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  articleId?: string;
  identity?: AuthIdentity;
}) {
  const { push } = useRouter();
  const validArticleId = articleIdSchema.safeParse(articleId);
  const savedArticleId = validArticleId.success ? validArticleId.data : null;
  const reviewPath = savedArticleId
    ? `/articles/new/review?articleId=${encodeURIComponent(savedArticleId)}`
    : "/articles/new/review";
  const loginPath = `/login?next=${encodeURIComponent(reviewPath)}`;
  const [draft, setDraft] = useState<DraftArticleState>(() =>
    createDefaultDraft(),
  );
  const [review, setReview] = useState<ReviewState>(() =>
    createDefaultReview(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadFailure(null);
      if (!savedArticleId) {
        setLoadFailure({
          kind: "missing-id",
          message: "Choose an article before opening its review.",
          retryable: false,
        });
        setHydrated(true);
        return;
      }
      try {
        const [article, saved] = await Promise.all([
          getArticle(savedArticleId),
          getArticleDraft(savedArticleId),
        ]);
        if (!active) return;
        const savedDraft = toDraftArticleState(article, saved);
        const savedReview =
          parseReview(window.sessionStorage.getItem(REVIEW_STORAGE_KEY)) ??
          createDefaultReview();
        const nextReview = ensureIssueAnchors(savedDraft, savedReview);
        setDraft(savedDraft);
        setReview(nextReview);
        persistReview(nextReview);
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          push(loginPath);
          return;
        }
        const code =
          caught instanceof ArticleRequestError ? caught.code : "review_error";
        setLoadFailure({
          kind:
            code === "article_not_found"
              ? "not-found"
              : code === "draft_not_found"
                ? "missing-draft"
                : "error",
          message:
            code === "article_not_found"
              ? "This article could not be found."
              : code === "draft_not_found"
                ? "Start the article draft before opening Review."
                : caught instanceof ArticleRequestError
                  ? caught.message
                  : "We couldn’t load this draft for review.",
          retryable:
            !(caught instanceof ArticleRequestError) ||
            [502, 503, 504].includes(caught.status),
        });
      } finally {
        if (active) setHydrated(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loginPath, push, retryKey, savedArticleId]);

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
      if (savedArticleId) {
        void updateArticleDraft(
          savedArticleId,
          toArticleDraftPatch(nextDraft),
        ).catch((caught) => {
          if (caught instanceof ArticleRequestError && caught.status === 401) {
            push(loginPath);
            return;
          }
          setStatus(
            caught instanceof ArticleRequestError && caught.status === 422
              ? caught.message
              : "The draft change could not be saved.",
          );
        });
      }
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
    setStatus("Review saved. Opening export options.");
    push(`/articles/new/export?articleId=${savedArticleId}`);
  };

  if (!hydrated)
    return <main className={styles.loading}>Opening your review…</main>;

  if (loadFailure)
    return (
      <main className={styles.loading}>
        <div className={styles.loadState}>
          <span role="alert">{loadFailure.message}</span>
          {loadFailure.kind === "missing-draft" && savedArticleId ? (
            <Link href={`/articles/new/draft?articleId=${savedArticleId}`}>
              Open draft
            </Link>
          ) : null}
          {loadFailure.kind === "missing-id" ||
          loadFailure.kind === "not-found" ? (
            <Link href="/dashboard?section=articles">Back to articles</Link>
          ) : null}
          {loadFailure.retryable ? (
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Try again
            </button>
          ) : null}
        </div>
      </main>
    );

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
        showSettings={false}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileBack}
            aria-label="Back to draft"
            onClick={() =>
              push(`/articles/new/draft?articleId=${savedArticleId}`)
            }
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
          <ArticleProgress currentStep="review" compact articleId={articleId} />
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
            onBack={() =>
              push(`/articles/new/draft?articleId=${savedArticleId}`)
            }
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
