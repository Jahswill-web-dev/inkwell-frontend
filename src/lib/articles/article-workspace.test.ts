import { describe, expect, it } from "vitest";
import type { Article } from "./article";
import type { ArticleSetupMetadata } from "./article-setup";
import { toArticleWorkspaceViewModel } from "./article-workspace";

const article: Article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Useful source notes",
  working_title: "A useful article",
  target_audience: ["Content leaders"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

const metadata: ArticleSetupMetadata = {
  clientName: "Northstar Labs",
  contentType: "thought_leadership",
  mainAngle: "A clear angle",
  keyMessage: "A useful message",
  callToAction: "",
  tone: "Clear and credible",
  targetLength: "standard",
  seoKeyword: "",
  interviewMethod: "client",
  intervieweeName: "Avery Chen",
  interviewInstructions: "Ask for examples",
};

describe("article workspace view model", () => {
  it("prioritizes the selected client interview before the brief", () => {
    const view = toArticleWorkspaceViewModel(article, "writer", metadata, {
      hasBrief: false,
      hasOutline: false,
      hasDraft: false,
    });
    expect(view.clientName).toBe("Northstar Labs");
    expect(view.participants[0]).toMatchObject({
      name: "Avery Chen",
      state: "Link not created",
    });
    expect(view.nextAction.href).toBeNull();
    expect(view.nextAction.title).toContain("interview link");
  });

  it("derives the next available stage from persisted resources", () => {
    const view = toArticleWorkspaceViewModel(article, "writer", null, {
      hasBrief: true,
      hasOutline: true,
      hasDraft: false,
    });
    expect(view.nextAction.href).toContain("/draft?articleId=");
    expect(view.readiness.find((item) => item.id === "outline")?.state).toBe(
      "complete",
    );
  });
});
