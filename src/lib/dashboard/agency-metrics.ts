import type { AgencyArticleSummary } from "./agency-dashboard";
import { isDueThisWeek, isOverdue } from "./agency-filters";

export type AgencyDashboardMetrics = {
  active: number;
  waitingForClient: number;
  readyToDraft: number;
  dueThisWeek: number;
};

export function calculateAgencyMetrics(
  articles: readonly AgencyArticleSummary[],
  now = new Date(),
): AgencyDashboardMetrics {
  return {
    active: articles.filter((article) => article.status !== "published").length,
    waitingForClient: articles.filter(
      (article) => article.status === "waiting_for_client",
    ).length,
    readyToDraft: articles.filter(
      (article) => article.status === "ready_to_draft",
    ).length,
    dueThisWeek: articles.filter(
      (article) =>
        article.status !== "published" && isDueThisWeek(article.dueDate, now),
    ).length,
  };
}

export function selectAttentionArticles(
  articles: readonly AgencyArticleSummary[],
  now = new Date(),
) {
  return articles.filter(
    (article) =>
      article.attentionReason ||
      (article.status !== "published" && isOverdue(article.dueDate, now)),
  );
}
