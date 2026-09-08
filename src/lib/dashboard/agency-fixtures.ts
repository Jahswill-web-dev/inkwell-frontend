import type { AgencyArticleStatus } from "./agency-dashboard";

export type AgencyArticleFixture = {
  clientName: string;
  status: AgencyArticleStatus;
  assignee?: string;
  dueInDays: number | null;
  attentionReason: string | null;
};

export const agencyArticleFixtures: Readonly<
  Record<string, AgencyArticleFixture>
> = {
  "be5579e3-24fd-4272-a35f-f74740c3887e": {
    clientName: "Northstar Labs",
    status: "waiting_for_client",
    dueInDays: 3,
    attentionReason: "The client interview is waiting for a response.",
  },
  "36dc2b27-f474-4d43-b8cc-c122ef782cd6": {
    clientName: "Field Notes Studio",
    status: "ready_to_draft",
    dueInDays: 1,
    attentionReason: "The client interview is complete and ready to draft.",
  },
};
