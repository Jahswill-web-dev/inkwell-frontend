import { describe, expect, it } from "vitest";
import {
  articleSetupSchema,
  emptyArticleSetup,
  nextArticlePath,
  toArticleInputFromSetup,
  validateArticleSetupStep,
} from "./article-setup";

const complete = articleSetupSchema.parse({
  ...emptyArticleSetup,
  clientName: "Northstar Labs",
  workingTitle: "A useful article",
  targetAudience: "B2B marketing leaders",
  mainAngle: "Expert knowledge is the missing input.",
  keyMessage: "A short interview creates a stronger draft.",
  intervieweeName: "Avery Chen",
});

describe("article setup", () => {
  it("limits step validation to fields shown on that step", () => {
    const errors = validateArticleSetupStep(emptyArticleSetup, 1);
    expect(errors).toMatchObject({
      clientName: "Client is required.",
      workingTitle: "Working title is required.",
      targetAudience: "Target audience is required.",
    });
    expect(errors.mainAngle).toBeUndefined();
  });

  it("adapts the richer setup to the unchanged article API", () => {
    expect(toArticleInputFromSetup(complete)).toMatchObject({
      working_title: "A useful article",
      target_audience: ["B2B marketing leaders"],
      article_goal: "inform_and_inspire",
    });
    expect(toArticleInputFromSetup(complete).notes).toContain(
      "Client: Northstar Labs",
    );
  });

  it("chooses a compatible next route for each collection method", () => {
    expect(nextArticlePath("article-id", "client")).toContain("/interviews");
    expect(nextArticlePath("article-id", "self")).toContain(
      "next=self-interview",
    );
    expect(nextArticlePath("article-id", "notes")).toBe(
      "/articles/new/brief?articleId=article-id",
    );
  });
});
