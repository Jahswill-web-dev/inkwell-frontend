import { describe, expect, it } from "vitest";
import { articleSchema, type Article } from "@/lib/articles/article";
import { toAgencyArticleSummary } from "./agency-view-model";

const article: Article = articleSchema.parse({
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "A useful article",
  target_audience: ["Marketers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-02T12:00:00Z",
  client_id: "8d9dd792-78d8-4c9a-84bb-67d84c78b62a",
  client: {
    id: "8d9dd792-78d8-4c9a-84bb-67d84c78b62a",
    name: "Northstar Labs",
  },
  assignee: {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    username: "Nina",
  },
  status: "waiting_for_client",
  due_date: "2026-09-11",
});

describe("agency article view model", () => {
  it("maps persisted agency metadata without mutating the article", () => {
    const result = toAgencyArticleSummary(article, "Nina");

    expect(result).toMatchObject({
      clientName: "Northstar Labs",
      status: "waiting_for_client",
      assignee: "Nina",
      dueDate: "2026-09-11",
      lastActivity: article.updated_at,
    });
    expect(article).not.toHaveProperty("clientName");
  });

  it("uses safe labels for an unassigned article", () => {
    const result = toAgencyArticleSummary(
      {
        ...article,
        id: "526cb828-c217-44fb-9687-35b441e9a455",
        client_id: null,
        client: null,
        assignee_id: null,
        assignee: null,
        status: "setup",
        due_date: null,
      },
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
