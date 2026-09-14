import { z } from "zod";

export const articleGoals = [
  "inform_and_inspire",
  "educate_with_practical_guidance",
  "persuade_or_change_a_perspective",
  "inspire_readers_to_take_action",
  "entertain_with_a_compelling_story",
] as const;

export const articleStatuses = [
  "setup",
  "waiting_for_client",
  "interview_in_progress",
  "ready_to_draft",
  "drafting",
  "in_review",
  "ready_to_publish",
  "published",
] as const;
export const contentTypes = [
  "blog_post",
  "thought_leadership",
  "case_study",
  "guide",
  "landing_page",
] as const;
export const targetLengths = ["short", "standard", "long"] as const;
export const interviewMethods = ["client", "self", "notes"] as const;

export const articleGoalSchema = z.enum(articleGoals);
export type ArticleGoal = z.infer<typeof articleGoalSchema>;

export const articleGoalLabels: Record<ArticleGoal, string> = {
  inform_and_inspire: "Inform and inspire",
  educate_with_practical_guidance: "Educate with practical guidance",
  persuade_or_change_a_perspective: "Persuade or change a perspective",
  inspire_readers_to_take_action: "Inspire readers to take action",
  entertain_with_a_compelling_story: "Entertain with a compelling story",
};

const requiredText = (field: string, maximum: number) =>
  z
    .string({ error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`)
    .max(maximum, `${field} must be ${maximum.toLocaleString()} characters or fewer.`);

export const articleInputSchema = z.object({
  notes: requiredText("Notes", 20_000),
  working_title: requiredText("Working title", 200),
  target_audience: z
    .array(requiredText("Target audience", 500), {
      error: "Target audience is required.",
    })
    .min(1, "Target audience is required."),
  article_goal: articleGoalSchema,
  client_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  content_type: z.enum(contentTypes).optional(),
  due_date: z.string().date().nullable().optional(),
  target_length: z.enum(targetLengths).optional(),
  interview_method: z.enum(interviewMethods).optional(),
  interviewee_name: z.string().trim().max(120).optional(),
  interview_instructions: z.string().trim().max(1_000).optional(),
  main_angle: z.string().trim().max(1_000).optional(),
  key_message: z.string().trim().max(1_000).optional(),
  call_to_action: z.string().trim().max(500).optional(),
  tone: z.string().trim().max(500).optional(),
  seo_keyword: z.string().trim().max(200).optional(),
});

export const articlePatchSchema = articleInputSchema.partial().superRefine(
  (value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one article field is required.",
      });
    }
  },
);

export const articleSchema = articleInputSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid().nullable().default(null),
  client_id: z.string().uuid().nullable().default(null),
  client: z
    .object({ id: z.string().uuid(), name: z.string() })
    .nullable()
    .default(null),
  assignee_id: z.string().uuid().nullable().default(null),
  assignee: z
    .object({ id: z.string().uuid(), username: z.string() })
    .nullable()
    .default(null),
  status: z.enum(articleStatuses).default("setup"),
  content_type: z.enum(contentTypes).default("blog_post"),
  due_date: z.string().date().nullable().default(null),
  target_length: z.enum(targetLengths).default("standard"),
  interview_method: z.enum(interviewMethods).default("notes"),
  interviewee_name: z.string().default(""),
  interview_instructions: z.string().default(""),
  main_angle: z.string().default(""),
  key_message: z.string().default(""),
  call_to_action: z.string().default(""),
  tone: z.string().default(""),
  seo_keyword: z.string().default(""),
  draft_readiness: z.boolean().default(false),
  published_at: z.string().datetime({ offset: true }).nullable().default(null),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const articleListSchema = z.object({
  items: z.array(articleSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(100),
});

export const articlePaginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const articleApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type Article = z.infer<typeof articleSchema>;
export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticlePatch = z.infer<typeof articlePatchSchema>;
export type ArticleList = z.infer<typeof articleListSchema>;
export type ArticleApiError = z.infer<typeof articleApiErrorSchema>;

export type ArticleFormValues = {
  notes: string;
  workingTitle: string;
  targetAudience: string[];
  articleGoal: ArticleGoal | "";
};

export function toArticleInput(values: ArticleFormValues): unknown {
  return {
    notes: values.notes,
    working_title: values.workingTitle,
    target_audience: values.targetAudience,
    article_goal: values.articleGoal,
  };
}

export function toArticleFormValues(article: Article): ArticleFormValues {
  return {
    notes: article.notes,
    workingTitle: article.working_title,
    targetAudience: article.target_audience,
    articleGoal: article.article_goal,
  };
}

export function changedArticleFields(
  original: Article,
  values: ArticleFormValues,
): Partial<ArticleInput> {
  const next = articleInputSchema.parse(toArticleInput(values));
  const patch: Partial<ArticleInput> = {};

  for (const key of Object.keys(next) as (keyof ArticleInput)[]) {
    const changed = Array.isArray(next[key])
      ? JSON.stringify(next[key]) !== JSON.stringify(original[key])
      : next[key] !== original[key];
    if (changed) {
      Object.assign(patch, { [key]: next[key] });
    }
  }

  return patch;
}
