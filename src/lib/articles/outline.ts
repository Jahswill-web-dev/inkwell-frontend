import { z } from "zod";

const requiredText = z.string().trim().min(1, "This field is required.");

export const articleOutlineSectionSchema = z.object({
  heading: requiredText,
  purpose: requiredText,
  key_points: z.array(requiredText).min(1).max(5),
});

export const articleOutlineSchema = z.object({
  id: z.string().uuid(),
  article_id: z.string().uuid(),
  sections: z.array(articleOutlineSectionSchema).min(3).max(10),
  model_id: z.string(),
  prompt_version: z.string(),
  input_token_count: z.number().int().nonnegative(),
  output_token_count: z.number().int().nonnegative(),
  generation_duration_ms: z.number().int().nonnegative(),
  is_stale: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const articleOutlinePatchSchema = z.object({
  sections: z.array(articleOutlineSectionSchema).min(3).max(10),
});

export type ArticleOutline = z.infer<typeof articleOutlineSchema>;
export type ArticleOutlineSection = z.infer<typeof articleOutlineSectionSchema>;
export type ArticleOutlinePatch = z.infer<typeof articleOutlinePatchSchema>;
