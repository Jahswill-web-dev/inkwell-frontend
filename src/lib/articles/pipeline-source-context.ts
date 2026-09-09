import { loadClientInterviewSession } from "./client-interview-session-storage";
import { loadInterviewInvitation } from "./client-interview-storage";
import {
  sourceRevisionFor,
  type InterviewReviewSource,
  type SourceReview,
} from "./source-review";
import { loadSourceReview } from "./source-review-storage";
import { loadWriterInterviewMaterial } from "./writer-interview-storage";

export type PipelineSourceState =
  "none" | "review_required" | "source_changed" | "content_stale" | "approved";

export type PipelineSourceContext = {
  state: PipelineSourceState;
  approvedCount: number;
  clientCount: number;
  writerCount: number;
  combinedCount: number;
  approvedAt: string | null;
};

function interviewSources(articleId: string): InterviewReviewSource[] {
  const sources: InterviewReviewSource[] = [];
  const invitation = loadInterviewInvitation(articleId);
  const client = invitation
    ? loadClientInterviewSession(invitation.token)
    : null;
  if (client?.answers.length) {
    sources.push({ type: "client", label: "Client", session: client });
  }
  const writer = loadWriterInterviewMaterial(articleId);
  if (writer?.session.answers.length) {
    sources.push({ type: "writer", label: "Writer", session: writer.session });
  }
  return sources;
}

function sourceCounts(review: SourceReview | null) {
  const included = review?.items.filter((item) => item.included) ?? [];
  return {
    approvedCount: included.length,
    clientCount: included.filter((item) => item.sourceType === "client").length,
    writerCount: included.filter((item) => item.sourceType === "writer").length,
    combinedCount: included.filter((item) => item.sourceType === "combined")
      .length,
  };
}

export function loadPipelineSourceContext(
  articleId: string,
  contentUpdatedAt?: string | null,
): PipelineSourceContext {
  const sources = interviewSources(articleId);
  const review = loadSourceReview(articleId);
  const counts = sourceCounts(review);
  const base = { ...counts, approvedAt: review?.approvedAt ?? null };

  if (sources.length === 0) return { ...base, state: "none" };
  if (!review || review.status !== "approved") {
    return { ...base, state: "review_required" };
  }
  if (review.sourceRevision !== sourceRevisionFor(sources)) {
    return { ...base, state: "source_changed" };
  }
  if (
    contentUpdatedAt &&
    review.approvedAt &&
    new Date(review.approvedAt).getTime() > new Date(contentUpdatedAt).getTime()
  ) {
    return { ...base, state: "content_stale" };
  }
  return { ...base, state: "approved" };
}
