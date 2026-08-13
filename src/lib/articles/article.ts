import { z } from "zod";

export const articleGoals = [
  "inform_and_inspire",
  "educate_with_practical_guidance",
  "persuade_or_change_a_perspective",
  "inspire_readers_to_take_action",
  "entertain_with_a_compelling_story",
] as const;

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
  target_audience: requiredText("Target audience", 500),
  article_goal: articleGoalSchema,
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
  targetAudience: string;
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
    if (next[key] !== original[key]) {
      Object.assign(patch, { [key]: next[key] });
    }
  }

  return patch;
}
