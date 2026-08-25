import {
  articleApiErrorSchema,
  articleInputSchema,
  articleListSchema,
  articlePatchSchema,
  articleSchema,
  type Article,
  type ArticleInput,
  type ArticleList,
  type ArticlePatch,
} from "./article";
import {
  articleBriefPatchSchema,
  articleBriefSchema,
  type ArticleBrief,
  type ArticleBriefPatch,
} from "./brief";
import {
  articleOutlinePatchSchema,
  articleOutlineSchema,
  type ArticleOutline,
  type ArticleOutlinePatch,
} from "./outline";
import {
  articleDraftPatchSchema,
  articleDraftSchema,
  talkingPointsInputSchema,
  talkingPointsResultSchema,
  type ArticleDraft,
  type ArticleDraftPatch,
  type TalkingPointsInput,
  type TalkingPointsResult,
} from "./draft";
import {
  createSectionInterviewInputSchema,
  replaceSectionInterviewAnswersInputSchema,
  sectionInterviewSchema,
  type CreateSectionInterviewInput,
  type ReplaceSectionInterviewAnswersInput,
  type SectionInterview,
} from "./interview";

export class ArticleRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ArticleRequestError";
  }
}

async function articleRequest<T>(
  url: string,
  init: RequestInit,
  parse: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = articleApiErrorSchema.safeParse(payload);
    throw new ArticleRequestError(
      response.status,
      error.success ? error.data.error.code : "articles_unavailable",
      error.success
        ? error.data.error.message
        : "Articles are temporarily unavailable.",
      error.success ? error.data.error.details : undefined,
    );
  }

  try {
    return parse(payload);
  } catch {
    throw new ArticleRequestError(
      502,
      "invalid_article_response",
      "Articles are temporarily unavailable.",
    );
  }
}

export function listArticles(offset = 0, limit = 20): Promise<ArticleList> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  return articleRequest(`/api/articles?${query}`, {}, (value) =>
    articleListSchema.parse(value),
  );
}

export function getArticle(articleId: string): Promise<Article> {
  return articleRequest(`/api/articles/${articleId}`, {}, (value) =>
    articleSchema.parse(value),
  );
}

export function createArticle(input: ArticleInput): Promise<Article> {
  const body = articleInputSchema.parse(input);
  return articleRequest(
    "/api/articles",
    { method: "POST", body: JSON.stringify(body) },
    (value) => articleSchema.parse(value),
  );
}

export function getArticleBrief(articleId: string): Promise<ArticleBrief> {
  return articleRequest(`/api/articles/${articleId}/brief`, {}, (value) =>
    articleBriefSchema.parse(value),
  );
}

export function generateArticleBrief(articleId: string): Promise<ArticleBrief> {
  return articleRequest(
    `/api/articles/${articleId}/brief`,
    { method: "POST" },
    (value) => articleBriefSchema.parse(value),
  );
}

export function updateArticleBrief(
  articleId: string,
  input: ArticleBriefPatch,
): Promise<ArticleBrief> {
  const body = articleBriefPatchSchema.parse(input);
  return articleRequest(
    `/api/articles/${articleId}/brief`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => articleBriefSchema.parse(value),
  );
}

export function getArticleOutline(articleId: string): Promise<ArticleOutline> {
  return articleRequest(`/api/articles/${articleId}/outline`, {}, (value) =>
    articleOutlineSchema.parse(value),
  );
}

export function generateArticleOutline(
  articleId: string,
): Promise<ArticleOutline> {
  return articleRequest(
    `/api/articles/${articleId}/outline`,
    { method: "POST" },
    (value) => articleOutlineSchema.parse(value),
  );
}

export function updateArticleOutline(
  articleId: string,
  input: ArticleOutlinePatch,
): Promise<ArticleOutline> {
  const body = articleOutlinePatchSchema.parse(input);
  return articleRequest(
    `/api/articles/${articleId}/outline`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => articleOutlineSchema.parse(value),
  );
}

export function deleteArticleOutline(articleId: string): Promise<void> {
  return articleRequest(
    `/api/articles/${articleId}/outline`,
    { method: "DELETE" },
    () => undefined,
  );
}

export function getArticleDraft(articleId: string): Promise<ArticleDraft> {
  return articleRequest(`/api/articles/${articleId}/draft`, {}, (value) =>
    articleDraftSchema.parse(value),
  );
}

export function createArticleDraft(articleId: string): Promise<ArticleDraft> {
  return articleRequest(
    `/api/articles/${articleId}/draft`,
    { method: "POST" },
    (value) => articleDraftSchema.parse(value),
  );
}

export function updateArticleDraft(
  articleId: string,
  input: ArticleDraftPatch,
): Promise<ArticleDraft> {
  const body = articleDraftPatchSchema.parse(input);
  return articleRequest(
    `/api/articles/${articleId}/draft`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => articleDraftSchema.parse(value),
  );
}

export function generateTalkingPoints(
  articleId: string,
  sectionId: string,
  input?: TalkingPointsInput,
): Promise<TalkingPointsResult> {
  const instruction = input?.instruction?.trim();
  const body = talkingPointsInputSchema.parse(
    instruction ? { instruction } : {},
  );
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/talking-points`,
    body.instruction
      ? { method: "POST", body: JSON.stringify(body) }
      : { method: "POST" },
    (value) => talkingPointsResultSchema.parse(value),
  );
}

export function createSectionInterview(
  articleId: string,
  sectionId: string,
  input?: CreateSectionInterviewInput,
): Promise<SectionInterview> {
  const instruction = input?.instruction?.trim();
  const body = createSectionInterviewInputSchema.parse(
    instruction ? { instruction } : {},
  );
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/interviews`,
    body.instruction
      ? { method: "POST", body: JSON.stringify(body) }
      : { method: "POST" },
    (value) => sectionInterviewSchema.parse(value),
  );
}

export function getLatestSectionInterview(
  articleId: string,
  sectionId: string,
): Promise<SectionInterview> {
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/interviews/latest`,
    {},
    (value) => sectionInterviewSchema.parse(value),
  );
}

export function getSectionInterview(
  articleId: string,
  sectionId: string,
  interviewId: string,
): Promise<SectionInterview> {
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/interviews/${interviewId}`,
    {},
    (value) => sectionInterviewSchema.parse(value),
  );
}

export function replaceSectionInterviewAnswers(
  articleId: string,
  sectionId: string,
  interviewId: string,
  input: ReplaceSectionInterviewAnswersInput,
): Promise<SectionInterview> {
  const body = replaceSectionInterviewAnswersInputSchema.parse(input);
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/interviews/${interviewId}/answers`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => sectionInterviewSchema.parse(value),
  );
}

export function generateSectionInterview(
  articleId: string,
  sectionId: string,
  interviewId: string,
): Promise<SectionInterview> {
  return articleRequest(
    `/api/articles/${articleId}/draft/sections/${sectionId}/interviews/${interviewId}/generate`,
    { method: "POST" },
    (value) => sectionInterviewSchema.parse(value),
  );
}

export function updateArticle(
  articleId: string,
  input: ArticlePatch,
): Promise<Article> {
  const body = articlePatchSchema.parse(input);
  return articleRequest(
    `/api/articles/${articleId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    (value) => articleSchema.parse(value),
  );
}

export function deleteArticle(articleId: string): Promise<void> {
  return articleRequest(
    `/api/articles/${articleId}`,
    { method: "DELETE" },
    () => undefined,
  );
}
