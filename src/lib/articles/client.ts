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

  const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
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
