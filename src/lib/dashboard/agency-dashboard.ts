import type { Article } from "@/lib/articles/article";

export const agencyArticleStatuses = [
  "setup",
  "waiting_for_client",
  "interview_in_progress",
  "ready_to_draft",
  "drafting",
  "in_review",
  "ready_to_publish",
  "published",
] as const;

export type AgencyArticleStatus = (typeof agencyArticleStatuses)[number];

export type AgencyArticleSummary = Article & {
  clientName: string;
  status: AgencyArticleStatus;
  assignee: string;
  dueDate: string | null;
  lastActivity: string;
  attentionReason: string | null;
};

export type DueDateFilter = "all" | "overdue" | "this_week" | "no_due_date";

export type DashboardFilters = {
  query: string;
  client: string;
  status: AgencyArticleStatus | "all";
  dueDate: DueDateFilter;
};

export const defaultDashboardFilters: DashboardFilters = {
  query: "",
  client: "all",
  status: "all",
  dueDate: "all",
};

export const agencyStatusLabels: Record<AgencyArticleStatus, string> = {
  setup: "Setup",
  waiting_for_client: "Waiting for client",
  interview_in_progress: "Interview in progress",
  ready_to_draft: "Ready to draft",
  drafting: "Drafting",
  in_review: "In review",
  ready_to_publish: "Ready to publish",
  published: "Published",
};

export const agencyStatusActions: Record<AgencyArticleStatus, string> = {
  setup: "Complete setup",
  waiting_for_client: "View interview",
  interview_in_progress: "Check progress",
  ready_to_draft: "Start draft",
  drafting: "Continue drafting",
  in_review: "Review article",
  ready_to_publish: "Prepare to publish",
  published: "View article",
};
