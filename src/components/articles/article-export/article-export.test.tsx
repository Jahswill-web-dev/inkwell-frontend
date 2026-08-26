import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleExport } from "./article-export";
import { createDefaultDraft } from "../draft-editor/draft-editor-data";
import { ArticleRequestError } from "@/lib/articles/client";
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_SETTINGS_STORAGE_KEY,
} from "./export-data";

const { pushMock, getArticleMock, getDraftMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getArticleMock: vi.fn(),
  getDraftMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: getArticleMock,
  getArticleDraft: getDraftMock,
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
    id: `20000000-0000-4000-8000-00000000000${index}`,
    outline_section_id: `10000000-0000-4000-8000-00000000000${index}`,
    title: section.title,
    goal: section.goal,
    checklist: section.checklist,
    editor_state: section.editorState,
  })),
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

const writeTextMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  pushMock.mockClear();
  getArticleMock.mockResolvedValue(article);
  getDraftMock.mockResolvedValue(persistedDraft);
  writeTextMock.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: writeTextMock },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:article-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("ArticleExport", () => {
  it("links back to Draft when no persisted draft exists", async () => {
    getDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(404, "draft_not_found", "Draft not found."),
    );
    render(<ArticleExport articleId={articleId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Start the article draft",
    );
    expect(screen.getByRole("link", { name: "Open draft" })).toHaveAttribute(
      "href",
      `/articles/new/draft?articleId=${articleId}`,
    );
  });

  it("hydrates the default export and exposes unavailable formats", async () => {
    render(<ArticleExport articleId={articleId} />);
    expect(
      await screen.findByRole("heading", { name: "Export your article" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /Copy formatted text/ }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Word document/ })).toBeDisabled();
    expect(
      screen.getByRole("navigation", { name: "Article progress" }),
    ).toHaveTextContent("Export");
  });

  it("changes inclusions, persists settings, and navigates back", async () => {
    render(<ArticleExport articleId={articleId} />);
    await screen.findByRole("heading", { name: "Export your article" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Author" }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const saved = JSON.parse(
      window.sessionStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) ?? "{}",
    );
    expect(saved.inclusions.author).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("settings saved");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(pushMock).toHaveBeenCalledWith(
      `/articles/new/review?articleId=${articleId}`,
    );
  });

  it("copies formatted text and downloads Markdown", async () => {
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const createObjectUrlMock = vi.spyOn(URL, "createObjectURL");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<ArticleExport articleId={articleId} />);
    await screen.findByRole("heading", { name: "Export your article" });
    await userEvent.click(
      screen.getByRole("button", { name: "Export article" }),
    );
    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("copied");

    await userEvent.click(screen.getByRole("radio", { name: /Markdown/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Export article" }),
    );
    expect(createObjectUrlMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("downloaded");
  });

  it("hydrates valid saved export settings", async () => {
    window.sessionStorage.setItem(
      EXPORT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_EXPORT_SETTINGS, format: "html" }),
    );
    render(<ArticleExport articleId={articleId} />);
    expect(await screen.findByRole("radio", { name: /HTML/ })).toBeChecked();
  });
});
