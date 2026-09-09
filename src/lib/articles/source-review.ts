import { z } from "zod";
import type { ClientInterviewSession } from "./client-interview-session";

export const sourceReviewCategories = [
  "summary",
  "fact",
  "example",
  "quote",
  "opinion",
  "differentiator",
  "verification",
  "takeaway",
  "missing",
  "conflict",
] as const;
export type SourceReviewCategory = (typeof sourceReviewCategories)[number];

export const sourceReviewItemSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum(["client", "writer", "combined"]),
  sourceLabel: z.string().min(1).max(200),
  category: z.enum(sourceReviewCategories),
  title: z.string().min(1).max(200),
  content: z.string().trim().min(1).max(20_000),
  sourceQuestion: z.string().max(1_000).nullable(),
  included: z.boolean(),
});

export const sourceReviewSchema = z.object({
  articleId: z.string().uuid(),
  status: z.enum(["draft", "approved"]),
  sourceRevision: z.string(),
  items: z.array(sourceReviewItemSchema).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
});
export type SourceReviewItem = z.infer<typeof sourceReviewItemSchema>;
export type SourceReview = z.infer<typeof sourceReviewSchema>;
export type InterviewReviewSource = {
  type: "client" | "writer";
  label: string;
  session: ClientInterviewSession;
};

export function sourceRevisionFor(sources: InterviewReviewSource[]) {
  return sources
    .map((source) => `${source.type}:${source.session.updatedAt}`)
    .sort()
    .join("|");
}

const categoryByQuestion: Record<string, SourceReviewCategory> = {
  "key-message": "takeaway",
  experience: "differentiator",
  example: "example",
  misconception: "opinion",
  action: "takeaway",
  evidence: "verification",
  "final-detail": "fact",
};
const categoryTitles: Record<SourceReviewCategory, string> = {
  summary: "Interview summary",
  fact: "Important fact",
  example: "Example or result",
  quote: "Quotable statement",
  opinion: "Point of view",
  differentiator: "Distinctive expertise",
  verification: "Claim to verify",
  takeaway: "Proposed takeaway",
  missing: "Missing information",
  conflict: "Possible source conflict",
};

function itemId(source: string, kind: string, suffix: string | number) {
  return `${source}:${kind}:${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9:-]+/g, "-");
}

function sourceItems(source: InterviewReviewSource): SourceReviewItem[] {
  if (source.session.answers.length === 0) return [];
  const items: SourceReviewItem[] = [
    {
      id: itemId(source.type, "summary", 0),
      sourceType: source.type,
      sourceLabel: source.label,
      category: "summary",
      title: categoryTitles.summary,
      content: source.session.answers
        .slice(0, 2)
        .map((answer) => answer.answer)
        .join(" "),
      sourceQuestion: null,
      included: true,
    },
  ];
  source.session.answers.forEach((answer, index) => {
    const category = answer.questionId.startsWith("follow-up-")
      ? "fact"
      : (categoryByQuestion[answer.questionId] ?? "fact");
    items.push({
      id: itemId(source.type, answer.questionId, index),
      sourceType: source.type,
      sourceLabel: source.label,
      category,
      title: categoryTitles[category],
      content: answer.answer,
      sourceQuestion: answer.question,
      included: true,
    });
  });
  const quote = source.session.answers.find(
    (answer) => answer.answer.trim().split(/\s+/).length >= 8,
  );
  if (quote)
    items.push({
      id: itemId(source.type, "quote", quote.questionId),
      sourceType: source.type,
      sourceLabel: source.label,
      category: "quote",
      title: categoryTitles.quote,
      content: quote.answer,
      sourceQuestion: quote.question,
      included: true,
    });
  return items;
}

function attentionItems(sources: InterviewReviewSource[]): SourceReviewItem[] {
  if (sources.length === 0) return [];
  const answeredIds = new Set(
    sources.flatMap((source) =>
      source.session.answers.map((answer) => answer.questionId),
    ),
  );
  const expected = [
    ["example", "A concrete example, story, or measurable result"],
    ["evidence", "Evidence or claims that should be verified"],
    ["action", "The action readers should take after reading"],
  ] as const;
  const missing = expected
    .filter(([id]) => !answeredIds.has(id))
    .map<SourceReviewItem>(([id, content]) => ({
      id: itemId("combined", "missing", id),
      sourceType: "combined",
      sourceLabel: "Coverage check",
      category: "missing",
      title: categoryTitles.missing,
      content,
      sourceQuestion: null,
      included: false,
    }));
  const client = sources.find((source) => source.type === "client");
  const writer = sources.find((source) => source.type === "writer");
  if (!client || !writer) return missing;
  const clientAnswers = new Map(
    client.session.answers.map((answer) => [answer.questionId, answer]),
  );
  const conflicts = writer.session.answers
    .filter((answer) => {
      const other = clientAnswers.get(answer.questionId);
      return (
        other &&
        other.answer.trim().toLowerCase() !== answer.answer.trim().toLowerCase()
      );
    })
    .slice(0, 2)
    .map<SourceReviewItem>((answer, index) => {
      const other = clientAnswers.get(answer.questionId)!;
      return {
        id: itemId("combined", "conflict", `${answer.questionId}-${index}`),
        sourceType: "combined",
        sourceLabel: `${client.label} + ${writer.label}`,
        category: "conflict",
        title: categoryTitles.conflict,
        content: `Client: ${other.answer}\n\nWriter: ${answer.answer}`,
        sourceQuestion: answer.question,
        included: false,
      };
    });
  return [...missing, ...conflicts];
}

export function createSourceReview(
  articleId: string,
  sources: InterviewReviewSource[],
  now = new Date(),
): SourceReview {
  const timestamp = now.toISOString();
  return sourceReviewSchema.parse({
    articleId,
    status: "draft",
    sourceRevision: sourceRevisionFor(sources),
    items: [...sources.flatMap(sourceItems), ...attentionItems(sources)],
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedAt: null,
  });
}

export function mergeSourceReview(
  generated: SourceReview,
  previous: SourceReview | null,
): SourceReview {
  if (!previous || previous.sourceRevision === generated.sourceRevision)
    return previous ?? generated;
  const saved = new Map(previous.items.map((item) => [item.id, item]));
  return {
    ...generated,
    createdAt: previous.createdAt,
    items: generated.items.map((item) =>
      saved.has(item.id)
        ? {
            ...item,
            content: saved.get(item.id)!.content,
            included: saved.get(item.id)!.included,
          }
        : item,
    ),
  };
}

export function updateSourceReviewItem(
  review: SourceReview,
  itemIdValue: string,
  update: Partial<Pick<SourceReviewItem, "content" | "included">>,
  now = new Date(),
): SourceReview {
  return sourceReviewSchema.parse({
    ...review,
    status: "draft",
    approvedAt: null,
    updatedAt: now.toISOString(),
    items: review.items.map((item) =>
      item.id === itemIdValue ? { ...item, ...update } : item,
    ),
  });
}

export function approveSourceReview(
  review: SourceReview,
  now = new Date(),
): SourceReview {
  const timestamp = now.toISOString();
  return sourceReviewSchema.parse({
    ...review,
    status: "approved",
    updatedAt: timestamp,
    approvedAt: timestamp,
  });
}

export function sourceCategoryLabel(category: SourceReviewCategory) {
  return categoryTitles[category];
}
