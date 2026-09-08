import { describe, expect, it } from "vitest";
import type { Article } from "@/lib/articles/article";
import { toAgencyArticleSummary } from "./agency-view-model";

const article: Article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "A useful article",
  target_audience: ["Marketers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-02T12:00:00Z",
};

describe("agency article view model", () => {
  it("adds typed fixture metadata without mutating the article", () => {
    const result = toAgencyArticleSummary(
      article,
      "Nina",
      new Date("2026-09-08T12:00:00Z"),
    );

    expect(result).toMatchObject({
      clientName: "Northstar Labs",
      status: "waiting_for_client",
      assignee: "Nina",
      dueDate: "2026-09-11T12:00:00.000Z",
      lastActivity: article.updated_at,
    });
    expect(article).not.toHaveProperty("clientName");
  });

  it("uses safe defaults for an article without fixture metadata", () => {
    const result = toAgencyArticleSummary(
      { ...article, id: "526cb828-c217-44fb-9687-35b441e9a455" },
      "Nina",
    );

    expect(result).toMatchObject({
      clientName: "Unassigned client",
      status: "setup",
      assignee: "Nina",
      dueDate: null,
      attentionReason: null,
    });
  });
});
