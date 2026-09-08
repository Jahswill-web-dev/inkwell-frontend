import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleRequestError } from "@/lib/articles/client";
import { DEFAULT_AUTH_IDENTITY } from "@/lib/auth/identity";
import { ArticleWorkspace } from "./article-workspace";

const { articleMock, briefMock, outlineMock, draftMock } = vi.hoisted(() => ({
  articleMock: vi.fn(),
  briefMock: vi.fn(),
  outlineMock: vi.fn(),
  draftMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: articleMock,
  getArticleBrief: briefMock,
  getArticleOutline: outlineMock,
  getArticleDraft: draftMock,
}));

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Useful client context",
  working_title: "Expert-led content",
  target_audience: ["Content leaders"],
  article_goal: "inform_and_inspire" as const,
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

const missing = () =>
  Promise.reject(new ArticleRequestError(404, "not_found", "Not found"));

beforeEach(() => {
  vi.clearAllMocks();
  articleMock.mockResolvedValue(article);
  briefMock.mockImplementation(missing);
  outlineMock.mockImplementation(missing);
  draftMock.mockImplementation(missing);
  sessionStorage.setItem(
    `inkwell:article-setup:${article.id}`,
    JSON.stringify({
      clientName: "Northstar Labs",
      contentType: "thought_leadership",
      mainAngle: "A clear angle",
      keyMessage: "A useful message",
      callToAction: "",
      tone: "Clear and credible",
      targetLength: "standard",
      seoKeyword: "",
      interviewMethod: "client",
      intervieweeName: "Avery Chen",
      interviewInstructions: "Ask for examples",
    }),
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("ArticleWorkspace", () => {
  it("loads the article, setup metadata, and recommended next action", async () => {
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Loading article workspace/ }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Expert-led content" }),
    ).toBeVisible();
    expect(screen.getAllByText("Northstar Labs").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Create the client interview link" }),
    ).toBeVisible();
    expect(screen.getByText("Avery Chen")).toBeVisible();
    expect(screen.getByRole("link", { name: /Edit setup/ })).toHaveAttribute(
      "href",
      `/articles/${article.id}/edit`,
    );
  });

  it("uses persisted pipeline resources to recommend the next stage", async () => {
    briefMock.mockResolvedValue({});
    outlineMock.mockResolvedValue({});
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    const action = await screen.findByRole("link", { name: /Continue/ });
    expect(action).toHaveAttribute(
      "href",
      `/articles/new/draft?articleId=${article.id}`,
    );
  });

  it("keeps transient failures retryable", async () => {
    articleMock.mockRejectedValueOnce(
      new ArticleRequestError(503, "unavailable", "Unavailable"),
    );
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    await waitFor(() => expect(articleMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("heading", { name: "Expert-led content" }),
    ).toBeVisible();
  });
});
