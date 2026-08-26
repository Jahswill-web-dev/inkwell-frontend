import { z } from "zod";

const requiredText = z.string().trim().min(1, "This field is required.");

const briefSeoSchema = z.object({
  suggested_titles: z.array(requiredText),
  primary_keyword: requiredText,
  secondary_keywords: z.array(requiredText),
  meta_description: requiredText,
});

const briefContentSchema = z.object({
  summary: requiredText,
  core_angle: requiredText,
  audience_insights: z.array(requiredText),
  tone_and_style: requiredText,
  key_takeaways: z.array(requiredText),
  evidence_gaps: z.array(requiredText),
  call_to_action: requiredText,
  seo: briefSeoSchema,
});

export const articleBriefSchema = briefContentSchema.extend({
  id: z.string().uuid(),
  article_id: z.string().uuid(),
  model_id: z.string(),
  prompt_version: z.string(),
  input_token_count: z.number().int().nonnegative(),
  output_token_count: z.number().int().nonnegative(),
  generation_duration_ms: z.number().int().nonnegative(),
  is_stale: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const briefSeoPatchSchema = briefSeoSchema
  .partial()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one SEO field is required.",
      });
    }
  });

export const articleBriefPatchSchema = briefContentSchema
  .omit({ seo: true })
  .partial()
  .extend({ seo: briefSeoPatchSchema.optional() })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one brief field is required.",
      });
    }
  });

export type ArticleBrief = z.infer<typeof articleBriefSchema>;
export type ArticleBriefPatch = z.infer<typeof articleBriefPatchSchema>;
