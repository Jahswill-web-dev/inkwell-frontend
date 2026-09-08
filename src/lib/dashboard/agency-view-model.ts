import type { Article } from "@/lib/articles/article";
import type { AgencyArticleSummary } from "./agency-dashboard";
import {
  agencyArticleFixtures,
  type AgencyArticleFixture,
} from "./agency-fixtures";

const DAY_IN_MILLISECONDS = 86_400_000;

function dateFromOffset(now: Date, offset: number | null) {
  if (offset === null) return null;
  return new Date(now.getTime() + offset * DAY_IN_MILLISECONDS).toISOString();
}

export function toAgencyArticleSummary(
  article: Article,
  currentAssignee: string,
  now = new Date(),
  fixtures: Readonly<
    Record<string, AgencyArticleFixture>
  > = agencyArticleFixtures,
): AgencyArticleSummary {
  const metadata = fixtures[article.id];

  return {
    ...article,
    clientName: metadata?.clientName ?? "Unassigned client",
    status: metadata?.status ?? "setup",
    assignee: metadata?.assignee ?? currentAssignee,
    dueDate: dateFromOffset(now, metadata?.dueInDays ?? null),
    lastActivity: article.updated_at,
    attentionReason: metadata?.attentionReason ?? null,
  };
}

export function toAgencyArticleSummaries(
  articles: readonly Article[],
  currentAssignee: string,
  now = new Date(),
): AgencyArticleSummary[] {
  return articles.map((article) =>
    toAgencyArticleSummary(article, currentAssignee, now),
  );
}
