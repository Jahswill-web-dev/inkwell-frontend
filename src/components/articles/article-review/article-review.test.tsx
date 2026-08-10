import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_STORAGE_KEY,
  editorStateText,
  parseDraft,
} from "../draft-editor/draft-editor-data";
import { ArticleReview } from "./article-review";
import { REVIEW_STORAGE_KEY } from "./review-data";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

beforeEach(() => pushMock.mockClear());
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("ArticleReview", () => {
  it("renders triage with functional progress links", async () => {
    render(<ArticleReview />);
    expect(await screen.findByText("Abrupt transition")).toBeVisible();
    const progress = screen.getByRole("navigation", {
      name: "Article progress",
    });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(
      "Review",
    );
    expect(screen.getByRole("link", { name: /Draft/ })).toHaveAttribute(
      "href",
      "/articles/new/draft",
    );
    expect(screen.getByRole("button", { name: /Sources/ })).toHaveTextContent(
      "0",
    );
  });

  it("filters, navigates, ignores, and applies suggestions", async () => {
    render(<ArticleReview />);
    await screen.findByText("Abrupt transition");
    await userEvent.click(screen.getByRole("button", { name: "Next issue" }));
    expect(screen.getByText("Vague phrasing")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Ignore" }));
    expect(screen.getByRole("status")).toHaveTextContent("Suggestion ignored");

    await userEvent.click(screen.getByRole("button", { name: /Important/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Accept suggestion" }),
    );
    const saved = parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY));
    expect(saved).not.toBeNull();
    expect(
      saved && editorStateText(saved.sections[0].editorState),
    ).not.toContain("half-formed observation on a late-night walk");
  });

  it("supports manual edits, summary, preview, and publishing confirmation", async () => {
    render(<ArticleReview />);
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
    expect(pushMock).toHaveBeenCalledWith("/articles/new/export");
    await waitFor(() =>
      expect(window.sessionStorage.getItem(REVIEW_STORAGE_KEY)).toBeTruthy(),
    );
  });
});
