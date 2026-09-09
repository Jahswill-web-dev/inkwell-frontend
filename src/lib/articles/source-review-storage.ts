import { sourceReviewSchema, type SourceReview } from "./source-review";

const SOURCE_REVIEW_PREFIX = "inkwell:source-review:";
export const SOURCE_REVIEW_UPDATED_EVENT = "inkwell:source-review-updated";

export function loadSourceReview(articleId: string): SourceReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `${SOURCE_REVIEW_PREFIX}${articleId}`,
    );
    if (!raw) return null;
    const result = sourceReviewSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveSourceReview(review: SourceReview) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${SOURCE_REVIEW_PREFIX}${review.articleId}`,
    JSON.stringify(review),
  );
  window.dispatchEvent(
    new CustomEvent(SOURCE_REVIEW_UPDATED_EVENT, {
      detail: { articleId: review.articleId },
    }),
  );
}
