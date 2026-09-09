import { describe, expect, it } from "vitest";
import type { Article } from "./article";
import type { ArticleSetupMetadata } from "./article-setup";
import { toArticleWorkspaceViewModel } from "./article-workspace";
import { createWriterInterviewMaterial } from "./writer-interview-storage";
import {
  completeClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";

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
    expect(view.nextAction.href).toBe(
      "/articles/" + article.id + "/interviews",
    );
    expect(view.nextAction.title).toContain("interview link");
  });

  it("reflects completed interview progress in readiness and status", () => {
    const view = toArticleWorkspaceViewModel(
      article,
      "writer",
      metadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
      {
        articleId: article.id,
        participantName: "Avery Chen",
        participantEmail: "avery@client.com",
        token: "a".repeat(48),
        status: "active",
        createdAt: "2026-09-08T12:00:00.000Z",
        expiresAt: null,
        progressState: "completed",
        questionsAnswered: 6,
        estimatedQuestions: 8,
        openedAt: "2026-09-08T12:03:00.000Z",
        completedAt: "2026-09-08T12:09:00.000Z",
        generation: 1,
      },
    );
    expect(view.status).toBe("ready_to_draft");
    expect(view.participants[0].state).toBe("Completed");
    expect(view.readiness[0].state).toBe("complete");
    expect(view.nextAction.title).toContain("Review");
  });

  it("makes a completed self-interview available as writer-supplied material", () => {
    const selfMetadata = { ...metadata, interviewMethod: "self" as const };
    const material = createWriterInterviewMaterial(article.id);
    const answered = submitClientInterviewAnswer(
      startClientInterview(material.session),
      "A detailed writer perspective based on direct experience with agency content workflows.",
    );
    const writerMaterial = {
      ...material,
      session: completeClientInterview(answered),
    };
    const view = toArticleWorkspaceViewModel(
      article,
      "writer",
      selfMetadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
      null,
      writerMaterial,
    );

    expect(view.writerInterview).toMatchObject({
      state: "completed",
      responses: 1,
    });
    expect(view.readiness[0]).toMatchObject({
      label: "Writer interview",
      state: "complete",
    });
    expect(view.participants[0]).toMatchObject({
      role: "Writer · Whole article",
      state: "Complete",
    });
    expect(view.nextAction.href).toBe(`/articles/${article.id}/sources`);
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
