import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDraft } from "../draft-editor/draft-editor-data";
import { ArticleRequestError } from "@/lib/articles/client";
import { ArticleReview } from "./article-review";
import { REVIEW_STORAGE_KEY } from "./review-data";

const { pushMock, getArticleMock, getDraftMock, updateDraftMock } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    getArticleMock: vi.fn(),
    getDraftMock: vi.fn(),
    updateDraftMock: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: getArticleMock,
  getArticleDraft: getDraftMock,
  updateArticleDraft: updateDraftMock,
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const state = createDefaultDraft();
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: state.title,
  target_audience: ["Writers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const persistedDraft = {
  id: "30000000-0000-4000-8000-000000000000",
  article_id: articleId,
  sections: state.sections.map((section, index) => ({
    id: section.id,
    outline_section_id: `10000000-0000-4000-8000-00000000000${index}`,
    title: section.title,
    goal: section.goal,
    checklist: section.checklist,
    editor_state: section.editorState,
  })),
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

beforeEach(() => {
  pushMock.mockClear();
  getArticleMock.mockResolvedValue(article);
  getDraftMock.mockResolvedValue(persistedDraft);
  updateDraftMock.mockResolvedValue(persistedDraft);
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("ArticleReview", () => {
  it("links back to Draft when no persisted draft exists", async () => {
    getDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(404, "draft_not_found", "Draft not found."),
    );
    render(<ArticleReview articleId={articleId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Start the article draft",
    );
    expect(screen.getByRole("link", { name: "Open draft" })).toHaveAttribute(
      "href",
      `/articles/new/draft?articleId=${articleId}`,
    );
  });

  it("returns authentication failures to login", async () => {
    getArticleMock.mockRejectedValueOnce(
      new ArticleRequestError(401, "invalid_token", "Session expired."),
    );
    render(<ArticleReview articleId={articleId} />);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent(`/articles/new/review?articleId=${articleId}`)}`,
      ),
    );
  });

  it("renders triage with functional progress links", async () => {
    render(<ArticleReview articleId={articleId} />);
    expect(await screen.findByText("Abrupt transition")).toBeVisible();
    const progress = screen.getByRole("navigation", {
      name: "Article progress",
    });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(
      "Review",
    );
    expect(screen.getByRole("link", { name: /Draft/ })).toHaveAttribute(
      "href",
      `/articles/new/draft?articleId=${articleId}`,
    );
    expect(screen.getByRole("button", { name: /Sources/ })).toHaveTextContent(
      "0",
    );
  });

  it("filters, navigates, ignores, and applies suggestions", async () => {
    render(<ArticleReview articleId={articleId} />);
    await screen.findByText("Abrupt transition");
    await userEvent.click(screen.getByRole("button", { name: "Next issue" }));
    expect(screen.getByText("Vague phrasing")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Ignore" }));
    expect(screen.getByRole("status")).toHaveTextContent("Suggestion ignored");

    await userEvent.click(screen.getByRole("button", { name: /Important/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Accept suggestion" }),
    );
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled());
    expect(window.sessionStorage.getItem("inkwell:article-draft")).toBeNull();
  });

  it("supports manual edits, summary, preview, and publishing confirmation", async () => {
    render(<ArticleReview articleId={articleId} />);
    await screen.findByText("Abrupt transition");
    await userEvent.click(
      screen.getByRole("button", { name: /Edit manually/ }),
    );
    const editor = screen.getByRole("textbox", { name: "Suggested revision" });
    await userEvent.clear(editor);
    await userEvent.type(editor, "A deliberately clearer transition.");
    await userEvent.click(
      screen.getByRole("button", { name: "Save revision" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Suggestion applied");

    await userEvent.click(
      screen.getByRole("button", { name: /Review summary/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Almost ready to publish" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Review 6 suggestions/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      screen.getByRole("dialog", { name: "Article preview" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Close preview" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Prepare for publishing" }),
    );
    expect(pushMock).toHaveBeenCalledWith(
      `/articles/new/export?articleId=${articleId}`,
    );
    await waitFor(() =>
      expect(window.sessionStorage.getItem(REVIEW_STORAGE_KEY)).toBeTruthy(),
    );
  });
});
