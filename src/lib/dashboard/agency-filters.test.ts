import { describe, expect, it } from "vitest";
import type { AgencyArticleSummary } from "./agency-dashboard";
import {
  agencyClientOptions,
  filterAgencyArticles,
  isDueThisWeek,
  isOverdue,
  sortAgencyArticles,
} from "./agency-filters";

const now = new Date("2026-09-08T12:00:00Z");

function summary(
  id: string,
  overrides: Partial<AgencyArticleSummary> = {},
): AgencyArticleSummary {
  return {
    id,
    user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    notes: "Notes",
    working_title: "Editorial systems",
    target_audience: ["Marketers"],
    article_goal: "inform_and_inspire",
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-02T12:00:00Z",
    clientName: "Northstar Labs",
    status: "drafting",
    assignee: "Nina",
    dueDate: "2026-09-10T12:00:00Z",
    lastActivity: "2026-09-02T12:00:00Z",
    attentionReason: null,
    ...overrides,
  };
}

describe("agency dashboard filters", () => {
  const articles = [
    summary("8f433dde-499e-4a76-8378-ad356f088c30"),
    summary("9415a2f0-292d-4eb1-b853-8dfcfb74098e", {
      working_title: "Customer research",
      clientName: "Field Notes Studio",
      status: "ready_to_draft",
      dueDate: "2026-09-07T12:00:00Z",
    }),
  ];

  it("combines query, client, status, and due-date filters", () => {
    expect(
      filterAgencyArticles(
        articles,
        {
          query: "field notes",
          client: "Field Notes Studio",
          status: "ready_to_draft",
          dueDate: "overdue",
        },
        now,
      ),
    ).toEqual([articles[1]]);
  });

  it("classifies dates and sorts due work before undated work", () => {
    expect(isDueThisWeek(articles[0].dueDate, now)).toBe(true);
    expect(isOverdue(articles[1].dueDate, now)).toBe(true);
    const undated = summary("5bf63c7c-6586-409a-baa6-e092a487c551", {
      dueDate: null,
    });
    expect(sortAgencyArticles([undated, ...articles])).toEqual([
      articles[1],
      articles[0],
      undated,
    ]);
  });

  it("returns unique alphabetical client options", () => {
    expect(agencyClientOptions([...articles, articles[0]])).toEqual([
      "Field Notes Studio",
      "Northstar Labs",
    ]);
  });
});
