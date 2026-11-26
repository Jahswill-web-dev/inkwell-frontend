import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Article } from "@/lib/consultant/client";
import { ConsultantArticleScreen } from "./consultant-article";

const { api, router, writeText } = vi.hoisted(() => ({
  api: vi.fn(),
  router: { push: vi.fn() },
  writeText: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/consultant/client", () => ({ consultantRequest: api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
function editorState(text: string) {
  return JSON.stringify({
    root: {
      children: [{ type: "paragraph", children: [{ type: "text", text }] }],
    },
  });
}
vi.mock("@/components/articles/draft-editor/draft-rich-section", () => ({
  DraftRichSection: ({
    section,
    onChange,
  }: {
    section: { id: string; editorState: string };
    onChange: (id: string, state: string) => void;
  }) => (
    <textarea
      aria-label="Edit body"
      value={JSON.parse(section.editorState).root.children[0].children[0].text}
      onChange={(event) =>
        onChange(section.id, editorState(event.target.value))
      }
    />
  ),
}));
let article: Article;
beforeEach(() => {
  api.mockReset();
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  article = {
    id: "article",
    title: "Better handoffs",
    description: "A practical article.",
    status: "draft",
    interviews: [],
    job: null,
    sections: [
      {
        id: "opening",
        title: "Opening",
        outline_section_id: null,
        goal: "",
        checklist: [],
        editor_state: editorState("A decision needs an owner."),
      },
    ],
    revisions: [],
    findings: [],
    open_finding_count: 0,
    draft_updated_at: "2026-11-26T12:00:00Z",
  };
  api.mockImplementation(
    async (
      path: string,
      method: string = "GET",
      body?: Record<string, unknown>,
    ) => {
      if (method === "PUT" && path.endsWith("/draft"))
        article.sections = body!.sections as Article["sections"];
      if (method === "PUT" && path.endsWith("/details")) {
        article.title = body!.title as string;
        article.description = body!.description as string;
      }
      if (method === "POST" && path.endsWith("/ai-requests"))
        article.job = {
          id: "ai-job",
          state: "running",
          stage: "plan",
          attempts: 1,
          request_kind: "ask_ai",
          error: null,
        };
      return structuredClone(article);
    },
  );
});
afterEach(cleanup);

async function openArticle() {
  render(<ConsultantArticleScreen articleId="article" />);
  await screen.findByRole("heading", { name: "Better handoffs", level: 1 });
}

it("presents saved state as status and keeps the editable article separate from read-only Markdown", async () => {
  await openArticle();
  expect(screen.getByRole("status")).toHaveTextContent("Saved");
  expect(
    screen.queryByRole("button", { name: "Saved" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save changes" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Article" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.queryByRole("button", { name: "Preview" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "My articles" })).toHaveAttribute(
    "href",
    "/consultant",
  );
});

it("retains unsaved edits across source switching and saves with the current version header", async () => {
  await openArticle();
  fireEvent.change(screen.getByLabelText("Edit body"), {
    target: { value: "An edited argument." },
  });
  expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
  expect(
    screen.getByRole("region", { name: "Article Markdown view" }),
  ).toHaveTextContent("An edited argument.");
  expect(screen.queryByLabelText("Edit body")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Article" }));
  expect(screen.getByLabelText("Edit body")).toHaveValue("An edited argument.");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "articles/article/draft",
      "PUT",
      { sections: expect.any(Array) },
      { "If-Unmodified-Since": article.draft_updated_at },
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getAllByRole("status").some((node) => node.textContent === "Saved"),
  ).toBe(true);
});

it("does not claim a failed save succeeded", async () => {
  await openArticle();
  api.mockRejectedValueOnce(new Error("Please retry saving."));
  fireEvent.change(screen.getByLabelText("Edit body"), {
    target: { value: "Keep this edit." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please retry saving.",
  );
  expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
  expect(screen.getByLabelText("Edit body")).toHaveValue("Keep this edit.");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
});

it("keeps article details behind the toolbar disclosure and persists metadata edits", async () => {
  await openArticle();
  const trigger = screen.getByRole("button", { name: "Article details" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("textbox", { name: "Working title" }), {
    target: { value: "Clearer handoffs" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(
    await screen.findByRole("heading", { name: "Clearer handoffs", level: 1 }),
  ).toBeVisible();
  expect(api).toHaveBeenCalledWith("articles/article/details", "PUT", {
    title: "Clearer handoffs",
    description: "A practical article.",
  });
});

it("preserves the existing export formats and copies article text", async () => {
  await openArticle();
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  const menu = screen.getByRole("menu", { name: "Export article" });
  expect(
    within(menu).getByRole("menuitem", { name: /Download Markdown/ }),
  ).toBeVisible();
  expect(
    within(menu).getByRole("menuitem", { name: /Download HTML/ }),
  ).toBeVisible();
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: /Copy formatted article/ }),
  );
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("A decision needs an owner."),
    ),
  );
});

it("opens Ask AI and requests a reviewable preview while retaining the current draft", async () => {
  await openArticle();
  fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
  const assistant = screen.getByRole("complementary", {
    name: "Ask AI to improve this article",
  });
  expect(assistant).toHaveTextContent(
    "Your draft changes only when you approve a preview.",
  );
  fireEvent.change(
    within(assistant).getByRole("textbox", {
      name: "What would you like to change?",
    }),
    { target: { value: "Make the opening clearer" } },
  );
  fireEvent.click(
    within(assistant).getByRole("button", { name: "Generate preview" }),
  );
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "articles/article/ai-requests",
      "POST",
      expect.objectContaining({ instruction: "Make the opening clearer" }),
      expect.any(Object),
    ),
  );
  expect(screen.getByLabelText("Edit body")).toHaveValue(
    "A decision needs an owner.",
  );
});

it("closes Ask AI with Escape and returns focus to its toolbar control", async () => {
  await openArticle();
  const trigger = screen.getByRole("button", { name: "Ask AI" });
  fireEvent.click(trigger);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    screen.queryByRole("complementary", {
      name: "Ask AI to improve this article",
    }),
  ).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
