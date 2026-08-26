import { z } from "zod";

const requiredText = z.string().trim().min(1, "This field is required.");
const answerSchema = z.string().trim().max(10_000).nullable();

export const sectionContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: requiredText }).strict(),
  z.object({ type: z.literal("subheading"), text: requiredText }).strict(),
  z
    .object({
      type: z.literal("bulleted_list"),
      items: z.array(requiredText).min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("numbered_list"),
      items: z.array(requiredText).min(1),
    })
    .strict(),
]);

export const sectionQuestionSchema = z
  .object({
    id: z.string().uuid(),
    missing_piece: requiredText,
    question: requiredText,
    answer_guidance: requiredText,
  })
  .strict();

export const sectionAnswerSchema = z
  .object({
    question_id: z.string().uuid(),
    answer: answerSchema,
  })
  .strict();

const uniqueAnswersSchema = z
  .array(sectionAnswerSchema)
  .superRefine((answers, context) => {
    const seen = new Set<string>();
    answers.forEach((answer, index) => {
      if (seen.has(answer.question_id)) {
        context.addIssue({
          code: "custom",
          message: "Each question may appear at most once.",
          path: [index, "question_id"],
        });
      }
      seen.add(answer.question_id);
    });
  });

export const createSectionInterviewInputSchema = z
  .object({
    instruction: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const replaceSectionInterviewAnswersInputSchema = z
  .object({ answers: uniqueAnswersSchema })
  .strict();

export const sectionInterviewSchema = z
  .object({
    id: z.string().uuid(),
    draft_id: z.string().uuid(),
    section_id: z.string().uuid(),
    status: z.enum(["awaiting_answers", "generated"]),
    questions: z.array(sectionQuestionSchema).min(2).max(4),
    answers: uniqueAnswersSchema,
    generated_blocks: z.array(sectionContentBlockSchema).min(1).nullable(),
    is_stale: z.boolean(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((interview, context) => {
    const questionIds = new Set<string>();
    interview.questions.forEach((question, index) => {
      if (questionIds.has(question.id)) {
        context.addIssue({
          code: "custom",
          message: "Question IDs must be unique.",
          path: ["questions", index, "id"],
        });
      }
      questionIds.add(question.id);
    });
    interview.answers.forEach((answer, index) => {
      if (!questionIds.has(answer.question_id)) {
        context.addIssue({
          code: "custom",
          message: "Answers must reference an interview question.",
          path: ["answers", index, "question_id"],
        });
      }
    });
    if (interview.status === "generated" && !interview.generated_blocks) {
      context.addIssue({
        code: "custom",
        message: "Generated interviews require generated blocks.",
        path: ["generated_blocks"],
      });
    }
    if (
      interview.status === "awaiting_answers" &&
      interview.generated_blocks !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "Awaiting interviews cannot include generated blocks.",
        path: ["generated_blocks"],
      });
    }
  });

export type SectionContentBlock = z.infer<typeof sectionContentBlockSchema>;
export type SectionQuestion = z.infer<typeof sectionQuestionSchema>;
export type SectionAnswer = z.infer<typeof sectionAnswerSchema>;
export type CreateSectionInterviewInput = z.infer<
  typeof createSectionInterviewInputSchema
>;
export type ReplaceSectionInterviewAnswersInput = z.infer<
  typeof replaceSectionInterviewAnswersInputSchema
>;
export type SectionInterview = z.infer<typeof sectionInterviewSchema>;
