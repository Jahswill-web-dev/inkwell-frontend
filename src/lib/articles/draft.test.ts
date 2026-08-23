import { describe, expect, it } from "vitest";
import {
  articleDraftPatchSchema,
  articleDraftSchema,
  talkingPointsInputSchema,
  talkingPointsResultSchema,
} from "./draft";

const section = {
  id: "20000000-0000-4000-8000-000000000000",
  outline_section_id: "10000000-0000-4000-8000-000000000000",
  title: "Introduction",
  goal: "Introduce the article’s central problem",
  checklist: [{ id: "opening", label: "Set the context", completed: false }],
  editor_state: '{"root":{"children":[]}}',
};
const draft = {
  id: "30000000-0000-4000-8000-000000000000",
  article_id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  sections: [section],
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

describe("article draft contracts", () => {
  it("validates persisted and patchable API drafts", () => {
    expect(articleDraftSchema.parse(draft).sections[0].goal).toBe(section.goal);
    expect(articleDraftPatchSchema.parse({ sections: [section] })).toEqual({
      sections: [section],
    });
  });

  it("requires linked section IDs and non-empty goals", () => {
    expect(
      articleDraftSchema.safeParse({
        ...draft,
        sections: [{ ...section, goal: "" }],
      }).success,
    ).toBe(false);
    expect(
      articleDraftSchema.safeParse({
        ...draft,
        sections: [{ ...section, outline_section_id: null }],
      }).success,
    ).toBe(true);
  });

  it("validates talking-point instructions and results", () => {
    expect(
      talkingPointsInputSchema.parse({ instruction: "  Focus on costs  " }),
    ).toEqual({ instruction: "Focus on costs" });
    expect(
      talkingPointsResultSchema.parse({
        section_id: section.id,
        points: ["First point", "Second point", "Third point"],
      }).points,
    ).toHaveLength(3);
    expect(
      talkingPointsInputSchema.safeParse({ instruction: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
});
