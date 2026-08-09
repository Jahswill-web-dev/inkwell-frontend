import { describe, expect, it } from "vitest";
import {
  createDefaultDraft,
  editorStateText,
} from "../draft-editor/draft-editor-data";
import {
  applyIssueToDraft,
  categoryCount,
  createDefaultReview,
  readinessScore,
} from "./review-data";

describe("review data", () => {
  it("seeds the reference counts and score", () => {
    const review = createDefaultReview();
    expect(categoryCount(review, "all")).toBe(7);
    expect(categoryCount(review, "important")).toBe(2);
    expect(categoryCount(review, "clarity")).toBe(2);
    expect(categoryCount(review, "structure")).toBe(2);
    expect(categoryCount(review, "voice")).toBe(1);
    expect(categoryCount(review, "sources")).toBe(0);
    expect(readinessScore(review)).toBe(82);
  });

  it("replaces only an anchored text node", () => {
    const draft = createDefaultDraft();
    const issue = createDefaultReview().issues.find(
      (candidate) => candidate.id === "abrupt-transition",
    )!;
    const result = applyIssueToDraft(draft, issue);
    expect(result.applied).toBe(true);
    expect(editorStateText(result.draft.sections[0].editorState)).toContain(
      "that’s what makes capturing them so difficult",
    );
    expect(editorStateText(draft.sections[0].editorState)).toContain(
      issue.original,
    );
  });

  it("does not mutate a draft when the anchor is stale", () => {
    const draft = createDefaultDraft();
    const issue = {
      ...createDefaultReview().issues[0],
      original: "missing text",
    };
    const result = applyIssueToDraft(draft, issue);
    expect(result.applied).toBe(false);
    expect(result.draft).toBe(draft);
  });
});
