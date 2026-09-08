import type {
  AgencyArticleSummary,
  DashboardFilters,
  DueDateFilter,
} from "./agency-dashboard";

const DAY_IN_MILLISECONDS = 86_400_000;

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isDueThisWeek(dueDate: string | null, now = new Date()) {
  if (!dueDate) return false;
  const today = startOfDay(now).getTime();
  const due = startOfDay(new Date(dueDate)).getTime();
  return due >= today && due <= today + 7 * DAY_IN_MILLISECONDS;
}

export function isOverdue(dueDate: string | null, now = new Date()) {
  if (!dueDate) return false;
  return startOfDay(new Date(dueDate)).getTime() < startOfDay(now).getTime();
}

function matchesDueDate(
  article: AgencyArticleSummary,
  filter: DueDateFilter,
  now: Date,
) {
  if (filter === "all") return true;
  if (filter === "overdue") return isOverdue(article.dueDate, now);
  if (filter === "this_week") return isDueThisWeek(article.dueDate, now);
  return article.dueDate === null;
}

export function filterAgencyArticles(
  articles: readonly AgencyArticleSummary[],
  filters: DashboardFilters,
  now = new Date(),
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return articles.filter((article) => {
    const matchesQuery =
      !query ||
      article.working_title.toLocaleLowerCase().includes(query) ||
      article.clientName.toLocaleLowerCase().includes(query);
    const matchesClient =
      filters.client === "all" || article.clientName === filters.client;
    const matchesStatus =
      filters.status === "all" || article.status === filters.status;

    return (
      matchesQuery &&
      matchesClient &&
      matchesStatus &&
      matchesDueDate(article, filters.dueDate, now)
    );
  });
}

export function sortAgencyArticles(articles: readonly AgencyArticleSummary[]) {
  return [...articles].sort((left, right) => {
    if (left.dueDate && right.dueDate) {
      const dueDifference =
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      if (dueDifference !== 0) return dueDifference;
    } else if (left.dueDate) {
      return -1;
    } else if (right.dueDate) {
      return 1;
    }
    return (
      new Date(right.lastActivity).getTime() -
      new Date(left.lastActivity).getTime()
    );
  });
}

export function agencyClientOptions(articles: readonly AgencyArticleSummary[]) {
  return [...new Set(articles.map((article) => article.clientName))].sort(
    (left, right) => left.localeCompare(right),
  );
}
