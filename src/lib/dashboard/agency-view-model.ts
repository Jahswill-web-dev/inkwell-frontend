import type { Article } from "@/lib/articles/article";
import type { AgencyArticleSummary } from "./agency-dashboard";
export function toAgencyArticleSummary(
  article: Article,
  currentAssignee: string,
): AgencyArticleSummary {
  return {
    ...article,
    clientName: article.client?.name ?? "Unassigned client",
    status: article.status,
    assignee: article.assignee?.username ?? currentAssignee,
    dueDate: article.due_date,
    lastActivity: article.updated_at,
    attentionReason:
      article.status === "waiting_for_client"
        ? "The client interview is waiting for a response."
        : article.status === "ready_to_draft"
          ? "The source material is ready to draft."
          : null,
  };
}

export function toAgencyArticleSummaries(
  articles: readonly Article[],
  currentAssignee: string,
): AgencyArticleSummary[] {
  return articles.map((article) =>
    toAgencyArticleSummary(article, currentAssignee),
  );
}
