import { z } from "zod";
import { sectionContentBlockSchema } from "./interview";

const requiredText = z.string().trim().min(1, "This field is required.");

export const draftChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: requiredText,
  completed: z.boolean(),
});

export const articleDraftSectionSchema = z.object({
  id: z.string().uuid(),
  outline_section_id: z.string().uuid().nullable(),
  title: requiredText,
  goal: requiredText,
  checklist: z.array(draftChecklistItemSchema),
  editor_state: z.string().min(1),
});

export const articleDraftSchema = z.object({
  id: z.string().uuid(),
  article_id: z.string().uuid(),
  sections: z.array(articleDraftSectionSchema),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const articleDraftPatchSchema = z.object({
  sections: z.array(articleDraftSectionSchema),
});

export const talkingPointsInputSchema = z
  .object({
    instruction: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const talkingPointsResultSchema = z.object({
  section_id: z.string().uuid(),
  points: z.array(requiredText).min(3).max(5),
});

export const sectionDraftGenerationInputSchema = z
  .object({
    instruction: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const sectionDraftGenerationResultSchema = z
  .object({
    section_id: z.string().uuid(),
    blocks: z.array(sectionContentBlockSchema).min(1),
  })
  .strict();

export type ArticleDraft = z.infer<typeof articleDraftSchema>;
export type ArticleDraftSection = z.infer<typeof articleDraftSectionSchema>;
export type ArticleDraftPatch = z.infer<typeof articleDraftPatchSchema>;
export type TalkingPointsInput = z.infer<typeof talkingPointsInputSchema>;
export type TalkingPointsResult = z.infer<typeof talkingPointsResultSchema>;
export type SectionDraftGenerationInput = z.infer<
  typeof sectionDraftGenerationInputSchema
>;
export type SectionDraftGenerationResult = z.infer<
  typeof sectionDraftGenerationResultSchema
>;
