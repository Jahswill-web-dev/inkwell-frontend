import { beforeEach, describe, expect, it } from "vitest";
import {
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";
import {
  createWriterInterviewMaterial,
  loadWriterInterviewMaterial,
  saveWriterInterviewMaterial,
  writerInterviewSummary,
} from "./writer-interview-storage";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";

beforeEach(() => localStorage.clear());

describe("writer interview storage", () => {
  it("keeps whole-article writer answers in a separately labeled record", () => {
    const material = createWriterInterviewMaterial(articleId);
    const session = submitClientInterviewAnswer(
      startClientInterview(material.session),
      "My first-hand perspective comes from running this process with a dozen content teams.",
    );
    saveWriterInterviewMaterial(material, session);

    expect(loadWriterInterviewMaterial(articleId)).toMatchObject({
      articleId,
      sourceType: "writer",
      sourceLabel: "Writer-supplied material",
      scope: "whole_article",
      session: { answers: [{ questionId: "key-message" }] },
    });
    expect(
      writerInterviewSummary(loadWriterInterviewMaterial(articleId)),
    ).toMatchObject({
      state: "in_progress",
      responses: 1,
    });
  });
});
