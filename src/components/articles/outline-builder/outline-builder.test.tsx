import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleRequestError } from "@/lib/articles/client";
import { OutlineBuilder } from "./outline-builder";

const {
  pushMock,
  getArticleMock,
  getOutlineMock,
  generateMock,
  updateMock,
  deleteMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getArticleMock: vi.fn(),
  getOutlineMock: vi.fn(),
  generateMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: getArticleMock,
  getArticleOutline: getOutlineMock,
  generateArticleOutline: generateMock,
  updateArticleOutline: updateMock,
  deleteArticleOutline: deleteMock,
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "A useful article",
  target_audience: ["Writers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const outline = {
  id: "a8d789b6-6e71-436e-a981-51d25e66f538",
  article_id: articleId,
  sections: [
    {
      id: "10000000-0000-4000-8000-000000000000",
      heading: "Introduction",
      purpose: "Introduce the publishing problem",
      key_points: ["Set the context"],
    },
    {
      id: "10000000-0000-4000-8000-000000000001",
      heading: "Build the workflow",
      purpose: "Explain a sustainable workflow",
      key_points: ["Define ownership"],
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      heading: "Conclusion",
      purpose: "Close with a practical next step",
      key_points: ["Create a checklist"],
    },
  ],
  model_id: "gemini-2.5-flash",
  prompt_version: "article_outline_v1",
  input_token_count: 10,
  output_token_count: 20,
  generation_duration_ms: 100,
  is_stale: false,
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  getArticleMock.mockResolvedValue(article);
  getOutlineMock.mockResolvedValue(outline);
  generateMock.mockResolvedValue(outline);
  updateMock.mockImplementation((_id, input) =>
    Promise.resolve({ ...outline, sections: input.sections }),
  );
  deleteMock.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("OutlineBuilder", () => {
  it("requires a valid article id", () => {
    render(<OutlineBuilder />);
    expect(
      screen.getByRole("heading", { name: "No article selected" }),
    ).toBeVisible();
    expect(getArticleMock).not.toHaveBeenCalled();
  });

  it("loads a persisted outline without regeneration", async () => {
    render(<OutlineBuilder articleId={articleId} />);
    expect(
      await screen.findByRole("heading", {
        name: "Build your article’s structure",
      }),
    ).toBeVisible();
    expect(screen.getByText("Build the workflow")).toBeVisible();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("generates only after outline_not_found", async () => {
    getOutlineMock.mockRejectedValue(
      new ArticleRequestError(404, "outline_not_found", "Not found"),
    );
    render(<OutlineBuilder articleId={articleId} />);
    expect(await screen.findByText("Build the workflow")).toBeVisible();
    expect(generateMock).toHaveBeenCalledWith(articleId);
  });

  it("edits, reorders, adds, and persists complete API sections", async () => {
    render(<OutlineBuilder articleId={articleId} />);
    await screen.findByText("Build the workflow");
    const heading = screen.getByRole("textbox", { name: "Heading" });
    await userEvent.clear(heading);
    await userEvent.type(heading, "A sharper introduction");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: /^Save$/ }).at(-1)!,
    );
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0][1].sections).toHaveLength(4);
    expect(updateMock.mock.calls[0][1].sections[0].heading).toBe(
      "A sharper introduction",
    );
  });

  it("does not regenerate while dirty and can discard changes", async () => {
    render(<OutlineBuilder articleId={articleId} />);
    await screen.findByText("Build the workflow");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Heading" }),
      " revised",
    );
    expect(
      screen.getByRole("button", { name: "Generate another approach" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Discard changes" }),
    );
    expect(
      screen.getByRole("button", { name: "Generate another approach" }),
    ).toBeEnabled();
  });

  it("saves before drafting without writing a browser projection", async () => {
    render(<OutlineBuilder articleId={articleId} />);
    await screen.findByText("Build the workflow");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Heading" }),
      " revised",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Start drafting" })[0],
    );
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `/articles/new/draft?articleId=${articleId}`,
      ),
    );
    expect(updateMock).toHaveBeenCalled();
    expect(sessionStorage.getItem("inkwell:article-outline")).toBeNull();
  });

  it("deletes with confirmation and returns to the brief", async () => {
    render(<OutlineBuilder articleId={articleId} />);
    await screen.findByText("Build the workflow");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete outline" }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm delete" }),
    );
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(articleId));
    expect(pushMock).toHaveBeenCalledWith(
      `/articles/new/brief?articleId=${articleId}`,
    );
  });
});
