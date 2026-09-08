import { describe, expect, it } from "vitest";
import type { AgencyArticleSummary } from "./agency-dashboard";
import {
  calculateAgencyMetrics,
  selectAttentionArticles,
} from "./agency-metrics";

const base: AgencyArticleSummary = {
  id: "8f433dde-499e-4a76-8378-ad356f088c30",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "Editorial systems",
  target_audience: ["Marketers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-02T12:00:00Z",
  clientName: "Northstar Labs",
  status: "waiting_for_client",
  assignee: "Nina",
  dueDate: "2026-09-10T12:00:00Z",
  lastActivity: "2026-09-02T12:00:00Z",
  attentionReason: "The client needs to respond.",
};

describe("agency dashboard metrics", () => {
  it("calculates operational counts from the complete collection", () => {
    const articles: AgencyArticleSummary[] = [
      base,
      {
        ...base,
        id: "9415a2f0-292d-4eb1-b853-8dfcfb74098e",
        status: "ready_to_draft",
        attentionReason: null,
      },
      {
        ...base,
        id: "5bf63c7c-6586-409a-baa6-e092a487c551",
        status: "published",
      },
    ];

    expect(
      calculateAgencyMetrics(articles, new Date("2026-09-08T12:00:00Z")),
    ).toEqual({
      active: 2,
      waitingForClient: 1,
      readyToDraft: 1,
      dueThisWeek: 2,
    });
    expect(selectAttentionArticles(articles)).toContain(base);
  });
});
