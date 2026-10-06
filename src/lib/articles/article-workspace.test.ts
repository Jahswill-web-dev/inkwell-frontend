import { describe, expect, it } from "vitest";
import { articleSchema, type Article } from "./article";
import type { ArticleSetupMetadata } from "./article-setup";
import { toArticleWorkspaceViewModel } from "./article-workspace";
import type { InterviewInvitation } from "./client-interview-invitation";
import { createWriterInterviewMaterial } from "./writer-interview-storage";
import {
  completeClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";

const article: Article = articleSchema.parse({
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Useful source notes",
  working_title: "A useful article",
  target_audience: ["Content leaders"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
});

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

function clientInvitation(
  update: Partial<InterviewInvitation> = {},
): InterviewInvitation {
  return {
    id: "8fbc56aa-9fcd-4b28-9c44-a6904dbbd748",
    articleId: article.id,
    participantName: "Avery Chen",
    participantEmail: "avery@client.com",
    token: "a".repeat(48),
    status: "active",
    createdAt: "2026-09-08T12:00:00.000Z",
    expiresAt: null,
    progressState: "not_opened",
    questionsAnswered: 0,
    estimatedQuestions: 8,
    openedAt: null,
    completedAt: null,
    ...update,
  };
}

describe("article workspace view model", () => {
  it("shows only the live client workflow before an interview starts", () => {
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
    expect(view.readiness).toEqual([
      {
        id: "setup",
        label: "Article setup",
        detail: "Article details and source approach are saved.",
        state: "complete",
      },
      {
        id: "collection",
        label: "Client interview",
        detail: "No client interview has been started.",
        state: "not_started",
      },
      {
        id: "notes",
        label: "Interview notes",
        detail: "Available after the client interview is complete.",
        state: "not_started",
      },
    ]);
    expect(view.progress).toBe(33);
    expect(view.progressLabel).toBe("1 of 3 stages complete");
  });

  it.each([
    ["not_opened", 0, "The client interview has not been opened yet."],
    ["opened", 0, "The client has opened the interview."],
    ["in_progress", 3, "3 of 8 questions answered."],
  ] as const)(
    "reflects the %s client interview state",
    (progressState, questionsAnswered, detail) => {
      const view = toArticleWorkspaceViewModel(
        article,
        "writer",
        metadata,
        { hasBrief: false, hasOutline: false, hasDraft: false },
        clientInvitation({ progressState, questionsAnswered }),
      );
      expect(view.readiness[1]).toMatchObject({
        state: "in_progress",
        detail,
      });
      expect(view.progressLabel).toBe("1 of 3 stages complete");
    },
  );

  it.each([
    ["pending", "in_progress", 67],
    ["ready", "complete", 100],
    ["failed", "needs_attention", 67],
    ["unavailable", "needs_attention", 67],
  ] as const)(
    "maps %s client notes to %s readiness",
    (notesState, state, progress) => {
      const view = toArticleWorkspaceViewModel(
        article,
        "writer",
        metadata,
        { hasBrief: false, hasOutline: false, hasDraft: false },
        clientInvitation({
          progressState: "completed",
          questionsAnswered: 6,
          completedAt: "2026-09-08T12:09:00.000Z",
        }),
        null,
        null,
        notesState,
      );
      expect(view.readiness[2].state).toBe(state);
      expect(view.progress).toBe(progress);
      expect(view.status).toBe("ready_to_draft");
    },
  );

  it("tracks writer interview progress using two live stages", () => {
    const selfMetadata = { ...metadata, interviewMethod: "self" as const };
    const notStarted = toArticleWorkspaceViewModel(
      article,
      "writer",
      selfMetadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
    );
    expect(notStarted.readiness[1]).toMatchObject({
      label: "Writer interview",
      state: "not_started",
    });
    expect(notStarted.progressLabel).toBe("1 of 2 stages complete");

    const material = createWriterInterviewMaterial(article.id);
    const answered = submitClientInterviewAnswer(
      startClientInterview(material.session),
      "A detailed writer perspective based on direct experience with agency content workflows.",
    );
    const inProgress = toArticleWorkspaceViewModel(
      article,
      "writer",
      selfMetadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
      null,
      { ...material, session: answered },
    );
    expect(inProgress.readiness[1]).toMatchObject({
      state: "in_progress",
      detail: "1 response saved. Continue the whole-article interview.",
    });
    expect(inProgress.progress).toBe(50);

    const view = toArticleWorkspaceViewModel(
      article,
      "writer",
      selfMetadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
      null,
      { ...material, session: completeClientInterview(answered) },
    );
    expect(view.readiness[1]).toMatchObject({
      label: "Writer interview",
      state: "complete",
    });
    expect(view.progress).toBe(100);
    expect(view.progressLabel).toBe("2 of 2 stages complete");
  });

  it("marks existing source notes complete without legacy production stages", () => {
    const view = toArticleWorkspaceViewModel(
      article,
      "writer",
      { ...metadata, interviewMethod: "notes" },
      { hasBrief: true, hasOutline: true, hasDraft: false },
    );
    expect(view.readiness.map((item) => item.id)).toEqual([
      "setup",
      "collection",
    ]);
    expect(view.readiness[1]).toMatchObject({
      label: "Source material",
      state: "complete",
    });
    expect(view.progress).toBe(100);
    expect(view.progressLabel).toBe("2 of 2 stages complete");
  });
});
