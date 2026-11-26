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
  const assistant = screen.getByRole("dialog", { name: "Ask AI" });
  expect(assistant).toHaveTextContent(
    "Your draft changes only after you approve.",
  );
  fireEvent.change(
    within(assistant).getByRole("textbox", {
      name: "Your request",
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
    screen.queryByRole("dialog", { name: "Ask AI" }),
  ).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("keeps keyboard focus in the modal, preserves a request on close, and restores scrolling", async () => {
  await openArticle();
  const originalOverflow = document.body.style.overflow;
  const trigger = screen.getByRole("button", { name: "Ask AI" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Ask AI" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(document.body.style.overflow).toBe("hidden");
  const input = within(dialog).getByRole("textbox", { name: "Your request" });
  expect(input).toHaveFocus();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Better structure" }),
  );
  expect(input).toHaveValue("Make the article more structured");
  expect(input).toHaveFocus();
  const submit = within(dialog).getByRole("button", {
    name: "Generate preview",
  });
  const close = within(dialog).getByRole("button", { name: "Close Ask AI" });
  submit.focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
  expect(submit).toHaveFocus();
  fireEvent.click(close);
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe(originalOverflow);
  fireEvent.click(trigger);
  expect(screen.getByRole("textbox", { name: "Your request" })).toHaveValue(
    "Make the article more structured",
  );
});

it("shows submission errors inside the modal and retains the request for retry", async () => {
  await openArticle();
  fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
  fireEvent.click(screen.getByRole("button", { name: "Clearer opening" }));
  api.mockRejectedValueOnce(
    new Error("The draft changed. Reload and try again."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  const dialog = screen.getByRole("dialog", { name: "Ask AI" });
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "The draft changed.",
  );
  expect(
    within(dialog).getByRole("textbox", { name: "Your request" }),
  ).toHaveValue("Make the opening clearer");
  expect(
    within(dialog).getByRole("button", { name: "Generate preview" }),
  ).toBeEnabled();
});

it("hands a prepared suggestion to comparison and applies it only after approval", async () => {
  const replacement = {
    ...article.sections[0],
    editor_state: editorState("Clear ownership makes handoffs work."),
  };
  article.revisions = [
    {
      id: "proposal",
      kind: "proposal",
      sections: [replacement],
      gaps: [],
      created_at: "2026-11-26T12:01:00Z",
      request: "Make the opening clearer",
      summary: "Clarified the opening.",
      findings: [],
    },
  ];
  article.job = {
    id: "ai-job",
    state: "succeeded",
    stage: "complete",
    attempts: 1,
    request_kind: "ask_ai",
    error: null,
  };
  const defaultApi = api.getMockImplementation()!;
  api.mockImplementation(
    async (path: string, method?: string, body?: Record<string, unknown>) => {
      if (path.endsWith("/apply")) {
        article.sections = [replacement];
        article.revisions = [];
      }
      return defaultApi(path, method, body);
    },
  );
  await openArticle();
  fireEvent.click(screen.getByRole("button", { name: "Review AI suggestion" }));
  fireEvent.click(screen.getByRole("button", { name: "Review full article" }));
  expect(
    screen.queryByRole("dialog", { name: "Ask AI" }),
  ).not.toBeInTheDocument();
  expect(article.sections[0].editor_state).toContain(
    "A decision needs an owner.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Use this version" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "articles/article/revisions/proposal/apply",
      "POST",
      undefined,
      { "If-Unmodified-Since": article.draft_updated_at },
    ),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Edit body")).toHaveValue(
      "Clear ownership makes handoffs work.",
    ),
  );
  expect(
    screen.queryByRole("dialog", { name: "Ask AI" }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Ask AI" })).toHaveFocus(),
  );
  expect(document.body.style.overflow).not.toBe("hidden");
});

it("keeps a failed approval visible in the preview without changing the draft", async () => {
  article.revisions = [
    {
      id: "proposal",
      kind: "proposal",
      sections: [
        {
          ...article.sections[0],
          editor_state: editorState("A proposed opening."),
        },
      ],
      gaps: [],
      created_at: "2026-11-26T12:01:00Z",
      findings: [],
    },
  ];
  await openArticle();
  fireEvent.click(screen.getByRole("button", { name: "Review AI suggestion" }));
  fireEvent.click(screen.getByRole("button", { name: "Review full article" }));
  api.mockRejectedValueOnce(
    new Error("This draft changed. Generate a new preview."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Use this version" }));
  const preview = screen.getByRole("dialog", {
    name: "Review AI suggestion",
  });
  expect(await within(preview).findByRole("alert")).toHaveTextContent(
    "This draft changed.",
  );
  expect(article.sections[0].editor_state).toContain(
    "A decision needs an owner.",
  );
});

it("returns to the article without applying or discarding the suggestion", async () => {
  article.revisions = [
    {
      id: "proposal",
      kind: "proposal",
      sections: [
        {
          ...article.sections[0],
          editor_state: editorState("A proposed opening."),
        },
      ],
      gaps: [],
      findings: [],
      created_at: "2026-11-26T12:01:00Z",
    },
  ];
  await openArticle();
  const trigger = screen.getByRole("button", { name: "Review AI suggestion" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Review full article" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to article" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(article.revisions).toHaveLength(1);
  expect(screen.getByLabelText("Edit body")).toHaveValue(
    "A decision needs an owner.",
  );
  await waitFor(() => expect(trigger).toHaveFocus());
});
