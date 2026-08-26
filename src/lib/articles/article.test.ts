import { describe, expect, it } from "vitest";
import { articleGoals, articleGoalLabels, articleInputSchema, articlePatchSchema, changedArticleFields } from "./article";

const valid = { notes: " Notes ", working_title: " Title ", target_audience: [" Writers ", " Editors "], article_goal: "inform_and_inspire" as const };

describe("article schemas", () => {
  it("supports every documented goal label", () => {
    expect(articleGoals).toHaveLength(5);
    expect(articleGoals.map((goal) => articleGoalLabels[goal])).toEqual([
      "Inform and inspire", "Educate with practical guidance", "Persuade or change a perspective", "Inspire readers to take action", "Entertain with a compelling story",
    ]);
  });

  it("trims input and rejects whitespace and limits", () => {
    expect(articleInputSchema.parse(valid)).toMatchObject({ notes: "Notes", working_title: "Title", target_audience: ["Writers", "Editors"] });
    expect(articleInputSchema.safeParse({ ...valid, notes: "   " }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...valid, working_title: "x".repeat(201) }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...valid, target_audience: ["x".repeat(501)] }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...valid, target_audience: [] }).success).toBe(false);
  });

  it("requires a non-empty patch and computes changed fields", () => {
    expect(articlePatchSchema.safeParse({}).success).toBe(false);
    const article = { ...articleInputSchema.parse(valid), id: "be5579e3-24fd-4272-a35f-f74740c3887e", user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31", created_at: "2026-08-12T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" };
    expect(changedArticleFields(article, { notes: "Notes", workingTitle: "New title", targetAudience: ["Writers", "Editors"], articleGoal: "inform_and_inspire" })).toEqual({ working_title: "New title" });
  });
});
