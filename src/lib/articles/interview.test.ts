import { describe, expect, it } from "vitest";
import {
  createSectionInterviewInputSchema,
  replaceSectionInterviewAnswersInputSchema,
  sectionInterviewSchema,
} from "./interview";

const question = {
  id: "50000000-0000-4000-8000-000000000000",
  missing_piece: "A concrete personal example",
  question: "What happened?",
  answer_guidance: "Describe the people and outcome.",
};
const interview = {
  id: "40000000-0000-4000-8000-000000000000",
  draft_id: "30000000-0000-4000-8000-000000000000",
  section_id: "20000000-0000-4000-8000-000000000000",
  status: "awaiting_answers",
  questions: [
    question,
    { ...question, id: "50000000-0000-4000-8000-000000000001" },
  ],
  answers: [{ question_id: question.id, answer: "  A useful answer.  " }],
  generated_blocks: null,
  is_stale: false,
  created_at: "2026-08-25T12:00:00Z",
  updated_at: "2026-08-25T12:00:00Z",
};

describe("section interview contracts", () => {
  it("validates and trims a complete interview", () => {
    const parsed = sectionInterviewSchema.parse(interview);
    expect(parsed.answers[0].answer).toBe("A useful answer.");
    expect(parsed.questions).toHaveLength(2);
  });

  it("supports every generated content block", () => {
    expect(
      sectionInterviewSchema.parse({
        ...interview,
        status: "generated",
        generated_blocks: [
          { type: "paragraph", text: "Opening" },
          { type: "subheading", text: "Key lesson" },
          { type: "bulleted_list", items: ["First", "Second"] },
          { type: "numbered_list", items: ["One", "Two"] },
        ],
      }).generated_blocks,
    ).toHaveLength(4);
  });

  it("enforces question counts, answer limits, and unique question IDs", () => {
    expect(
      sectionInterviewSchema.safeParse({
        ...interview,
        questions: [question],
      }).success,
    ).toBe(false);
    expect(
      sectionInterviewSchema.safeParse({
        ...interview,
        questions: Array.from({ length: 5 }, (_, index) => ({
          ...question,
          id: `50000000-0000-4000-8000-00000000000${index}`,
        })),
      }).success,
    ).toBe(false);
    expect(
      replaceSectionInterviewAnswersInputSchema.safeParse({
        answers: [
          { question_id: question.id, answer: "One" },
          { question_id: question.id, answer: "Two" },
        ],
      }).success,
    ).toBe(false);
    expect(
      replaceSectionInterviewAnswersInputSchema.safeParse({
        answers: [{ question_id: question.id, answer: "x".repeat(10_001) }],
      }).success,
    ).toBe(false);
    expect(
      sectionInterviewSchema.safeParse({
        ...interview,
        answers: [
          {
            question_id: "50000000-0000-4000-8000-000000000099",
            answer: "Unknown question",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      sectionInterviewSchema.safeParse({
        ...interview,
        status: "generated",
        generated_blocks: null,
      }).success,
    ).toBe(false);
  });

  it("validates optional interview instructions", () => {
    expect(
      createSectionInterviewInputSchema.parse({
        instruction: "  Focus on practical lessons  ",
      }),
    ).toEqual({ instruction: "Focus on practical lessons" });
    expect(createSectionInterviewInputSchema.parse({})).toEqual({});
    expect(
      createSectionInterviewInputSchema.safeParse({ instruction: "" }).success,
    ).toBe(false);
  });
});
