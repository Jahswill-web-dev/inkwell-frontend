import { z } from "zod";
import {
  articleGoalSchema,
  articleInputSchema,
  contentTypes,
  interviewMethods,
  targetLengths,
  type Article,
  type ArticleInput,
} from "./article";

export { contentTypes, interviewMethods, targetLengths };

export const contentTypeLabels: Record<(typeof contentTypes)[number], string> =
  {
    blog_post: "Blog post",
    thought_leadership: "Thought leadership",
    case_study: "Case study",
    guide: "Guide",
    landing_page: "Landing page",
  };

export const targetLengthLabels: Record<
  (typeof targetLengths)[number],
  string
> = {
  short: "Short · 600–900 words",
  standard: "Standard · 1,000–1,500 words",
  long: "Long-form · 1,800–2,500 words",
};

const required = (label: string, maximum: number) =>
  z.string().trim().min(1, `${label} is required.`).max(maximum);

export const articleSetupSchema = z
  .object({
    clientName: required("Client", 120),
    clientId: z.union([z.string().uuid(), z.literal("")]),
    dueDate: z.union([z.string().date(), z.literal("")]),
    workingTitle: required("Working title", 200),
    contentType: z.enum(contentTypes),
    targetAudience: required("Target audience", 500),
    articleGoal: articleGoalSchema,
    mainAngle: required("Main angle", 1_000),
    keyMessage: required("Key message", 1_000),
    callToAction: z.string().trim().max(500),
    tone: required("Tone or brand voice", 500),
    targetLength: z.enum(targetLengths),
    seoKeyword: z.string().trim().max(200),
    interviewMethod: z.enum(interviewMethods),
    intervieweeName: z.string().trim().max(120),
    interviewInstructions: z.string().trim().max(1_000),
    existingNotes: z.string().trim().max(20_000),
  })
  .superRefine((value, context) => {
    if (value.interviewMethod === "client" && !value.intervieweeName) {
      context.addIssue({
        code: "custom",
        path: ["intervieweeName"],
        message: "Add the client or expert's name.",
      });
    }
    if (value.interviewMethod === "notes" && !value.existingNotes) {
      context.addIssue({
        code: "custom",
        path: ["existingNotes"],
        message: "Add the source notes you want Inkwell to use.",
      });
    }
  });

export type ArticleSetupValues = z.input<typeof articleSetupSchema>;
export type ArticleSetup = z.output<typeof articleSetupSchema>;
export type ArticleSetupField = keyof ArticleSetupValues;
export type ArticleSetupErrors = Partial<Record<ArticleSetupField, string>>;
export type ArticleSetupStep = 1 | 2 | 3 | 4;

export const emptyArticleSetup: ArticleSetupValues = {
  clientName: "",
  clientId: "",
  dueDate: "",
  workingTitle: "",
  contentType: "blog_post",
  targetAudience: "",
  articleGoal: "inform_and_inspire",
  mainAngle: "",
  keyMessage: "",
  callToAction: "",
  tone: "Clear, credible, and conversational",
  targetLength: "standard",
  seoKeyword: "",
  interviewMethod: "client",
  intervieweeName: "",
  interviewInstructions: "",
  existingNotes: "",
};

export const fieldsByStep: Record<
  Exclude<ArticleSetupStep, 4>,
  ArticleSetupField[]
> = {
  1: [
    "clientName",
    "clientId",
    "dueDate",
    "workingTitle",
    "contentType",
    "targetAudience",
    "articleGoal",
  ],
  2: [
    "mainAngle",
    "keyMessage",
    "callToAction",
    "tone",
    "targetLength",
    "seoKeyword",
  ],
  3: [
    "interviewMethod",
    "intervieweeName",
    "interviewInstructions",
    "existingNotes",
  ],
};

export function validateArticleSetupStep(
  values: ArticleSetupValues,
  step: Exclude<ArticleSetupStep, 4>,
): ArticleSetupErrors {
  const result = articleSetupSchema.safeParse(values);
  if (result.success) return {};
  const allowed = new Set(fieldsByStep[step]);
  return result.error.issues.reduce<ArticleSetupErrors>((errors, issue) => {
    const field = issue.path[0] as ArticleSetupField | undefined;
    if (field && allowed.has(field) && !errors[field])
      errors[field] = issue.message;
    return errors;
  }, {});
}

export function toArticleInputFromSetup(values: ArticleSetup): ArticleInput {
  const notes = [
    values.existingNotes,
    `Content type: ${contentTypeLabels[values.contentType]}`,
    `Client: ${values.clientName}`,
    `Main angle: ${values.mainAngle}`,
    `Key message: ${values.keyMessage}`,
    values.callToAction ? `Call to action: ${values.callToAction}` : "",
    `Tone: ${values.tone}`,
    `Target length: ${targetLengthLabels[values.targetLength]}`,
    values.seoKeyword ? `Primary SEO keyword: ${values.seoKeyword}` : "",
    values.interviewInstructions
      ? `Interview focus: ${values.interviewInstructions}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return articleInputSchema.parse({
    notes,
    working_title: values.workingTitle,
    target_audience: [values.targetAudience],
    article_goal: values.articleGoal,
    client_id: values.clientId || null,
    content_type: values.contentType,
    due_date: values.dueDate || null,
    target_length: values.targetLength,
    interview_method: values.interviewMethod,
    interviewee_name: values.intervieweeName,
    interview_instructions: values.interviewInstructions,
    main_angle: values.mainAngle,
    key_message: values.keyMessage,
    call_to_action: values.callToAction,
    tone: values.tone,
    seo_keyword: values.seoKeyword,
  });
}

export const articleSetupMetadataSchema = z.object({
  clientName: z.string().trim().min(1).max(120),
  contentType: z.enum(contentTypes),
  mainAngle: z.string().trim().min(1).max(1_000),
  keyMessage: z.string().trim().min(1).max(1_000),
  callToAction: z.string().trim().max(500),
  tone: z.string().trim().min(1).max(500),
  targetLength: z.enum(targetLengths),
  seoKeyword: z.string().trim().max(200),
  interviewMethod: z.enum(interviewMethods),
  intervieweeName: z.string().trim().max(120),
  interviewInstructions: z.string().trim().max(1_000),
});

export type ArticleSetupMetadata = z.infer<typeof articleSetupMetadataSchema>;

export function toArticleSetupMetadata(
  values: ArticleSetup,
): ArticleSetupMetadata {
  return {
    clientName: values.clientName,
    contentType: values.contentType,
    mainAngle: values.mainAngle,
    keyMessage: values.keyMessage,
    callToAction: values.callToAction,
    tone: values.tone,
    targetLength: values.targetLength,
    seoKeyword: values.seoKeyword,
    interviewMethod: values.interviewMethod,
    intervieweeName: values.intervieweeName,
    interviewInstructions: values.interviewInstructions,
  };
}

export function articleSetupMetadataFromArticle(
  article: Article,
): ArticleSetupMetadata | null {
  const result = articleSetupMetadataSchema.safeParse({
    clientName: article.client?.name ?? "Unassigned client",
    contentType: article.content_type,
    mainAngle: article.main_angle,
    keyMessage: article.key_message,
    callToAction: article.call_to_action,
    tone: article.tone,
    targetLength: article.target_length,
    seoKeyword: article.seo_keyword,
    interviewMethod: article.interview_method,
    intervieweeName: article.interviewee_name,
    interviewInstructions: article.interview_instructions,
  });
  return result.success ? result.data : null;
}

export function nextArticlePath(
  articleId: string,
  method: ArticleSetup["interviewMethod"],
) {
  if (method === "notes") return `/articles/new/brief?articleId=${articleId}`;
  if (method === "client") return `/articles/${articleId}/interviews`;
  return `/articles/${articleId}?next=self-interview`;
}
