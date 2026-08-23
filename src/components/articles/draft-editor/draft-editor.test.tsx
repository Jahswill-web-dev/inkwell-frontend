import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftEditor } from "./draft-editor";
import { ArticleRequestError } from "@/lib/articles/client";
import { createDefaultDraft, createEditorState } from "./draft-editor-data";

const {
  pushMock,
  getArticleMock,
  getDraftMock,
  createDraftMock,
  updateDraftMock,
  generatePointsMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getArticleMock: vi.fn(),
  getDraftMock: vi.fn(),
  createDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  generatePointsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: getArticleMock,
  getArticleDraft: getDraftMock,
  createArticleDraft: createDraftMock,
  updateArticleDraft: updateDraftMock,
  generateTalkingPoints: generatePointsMock,
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "Why Great Ideas Are Hard to Write Down",
  target_audience: ["Writers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

function apiDraft(state = createDefaultDraft()) {
  return {
    id: "30000000-0000-4000-8000-000000000000",
    article_id: articleId,
    sections: state.sections.map((section, index) => ({
      id: section.id,
      outline_section_id: `10000000-0000-4000-8000-00000000000${index}`,
      title: section.title,
      goal: index === 0 ? "Purpose from the outline" : section.goal,
      checklist: section.checklist,
      editor_state: section.editorState,
    })),
    created_at: "2026-08-18T12:00:00Z",
    updated_at: "2026-08-18T12:00:00Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getArticleMock.mockResolvedValue(article);
  getDraftMock.mockResolvedValue(apiDraft());
  createDraftMock.mockResolvedValue(apiDraft());
  updateDraftMock.mockImplementation((_id, input) =>
    Promise.resolve({
      ...apiDraft(),
      sections: input.sections,
      updated_at: "2026-08-18T12:01:00Z",
    }),
  );
  generatePointsMock.mockImplementation((_articleId, sectionId) =>
    Promise.resolve({
      section_id: sectionId,
      points: [
        "Clarify who owns each publishing stage.",
        "Show how inconsistent review cycles create delays.",
        "Connect unclear completion criteria to repeated rework.",
      ],
    }),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: vi.fn(() => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("DraftEditor", () => {
  it("creates an API draft only when one does not exist", async () => {
    getDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(404, "draft_not_found", "Draft not found."),
    );
    render(<DraftEditor articleId={articleId} />);

    expect(
      (await screen.findAllByText("Why Great Ideas Are Hard to Write Down"))[0],
    ).toBeVisible();
    expect(createDraftMock).toHaveBeenCalledWith(articleId);
  });

  it("does not create a second draft when GET succeeds", async () => {
    render(<DraftEditor articleId={articleId} />);

    await screen.findByRole("complementary", { name: "Writing assistant" });
    expect(getDraftMock).toHaveBeenCalledWith(articleId);
    expect(createDraftMock).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid article ID before calling the API", async () => {
    render(<DraftEditor articleId="not-a-uuid" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose an article",
    );
    expect(
      screen.getByRole("link", { name: "Back to articles" }),
    ).toHaveAttribute("href", "/dashboard?section=articles");
    expect(getArticleMock).not.toHaveBeenCalled();
    expect(getDraftMock).not.toHaveBeenCalled();
  });

  it("links back to Outline when initial draft creation has no outline", async () => {
    getDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(404, "draft_not_found", "Draft not found."),
    );
    createDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(404, "outline_not_found", "Outline not found."),
    );
    render(<DraftEditor articleId={articleId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Create an outline",
    );
    expect(
      screen.getByRole("link", { name: "Create outline" }),
    ).toHaveAttribute("href", `/articles/new/outline?articleId=${articleId}`);
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("retries temporary load failures", async () => {
    getArticleMock.mockRejectedValueOnce(
      new ArticleRequestError(
        503,
        "draft_unavailable",
        "Draft service unavailable.",
      ),
    );
    render(<DraftEditor articleId={articleId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Draft service unavailable",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      (await screen.findAllByText("Why Great Ideas Are Hard to Write Down"))[0],
    ).toBeVisible();
    expect(getArticleMock).toHaveBeenCalledTimes(2);
  });

  it("returns authentication failures to login with the draft URL", async () => {
    getArticleMock.mockRejectedValueOnce(
      new ArticleRequestError(401, "invalid_token", "Session expired."),
    );
    render(<DraftEditor articleId={articleId} />);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent(`/articles/new/draft?articleId=${articleId}`)}`,
      ),
    );
  });

  it("renders the reference article and writing tools", async () => {
    render(<DraftEditor articleId={articleId} />);

    expect(
      (await screen.findAllByText("Why Great Ideas Are Hard to Write Down"))[0],
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Writing assistant" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("textbox", { name: /draft content/ }),
    ).toHaveLength(5);
    expect(screen.getAllByText("Purpose from the outline")[0]).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: /Edit Introduction goal/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Preview" })[0]).toBeVisible();
  });

  it("opens backend drafts whose empty Lexical root has no children", async () => {
    const emptyRootDraft = apiDraft();
    emptyRootDraft.sections[0] = {
      ...emptyRootDraft.sections[0],
      editor_state:
        '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
    };
    getDraftMock.mockResolvedValueOnce(emptyRootDraft);

    render(<DraftEditor articleId={articleId} />);

    expect(
      await screen.findByRole("textbox", {
        name: "Introduction draft content",
      }),
    ).toBeVisible();
  });

  it("uses a compact outline rail and an accessible overlay drawer", async () => {
    render(<DraftEditor articleId={articleId} />);
    const assistant = await screen.findByRole("complementary", {
      name: "Writing assistant",
    });
    expect(
      within(assistant).getByLabelText(
        "Current section: Section 1, Introduction",
      ),
    ).toBeVisible();

    const expandButton = screen.getByRole("button", {
      name: "Expand draft outline",
    });
    const introductionMarker = screen.getByRole("button", {
      name: "Go to Introduction",
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(introductionMarker).toHaveAttribute("aria-current", "location");

    await userEvent.click(
      screen.getByRole("button", { name: "Go to Conclusion" }),
    );
    expect(
      screen.getByRole("button", { name: "Go to Conclusion" }),
    ).toHaveAttribute("aria-current", "location");
    expect(
      within(assistant).getByLabelText(
        "Current section: Section 5, Conclusion",
      ),
    ).toBeVisible();

    await userEvent.click(expandButton);
    const drawer = screen.getByRole("complementary", {
      name: "Outline details",
    });
    const closeButton = screen.getByRole("button", {
      name: "Collapse draft outline",
    });
    expect(drawer).toBeVisible();
    expect(drawer).toHaveAttribute("aria-hidden", "false");
    await waitFor(() => expect(closeButton).toHaveFocus());

    await userEvent.click(
      within(drawer).getByRole("button", {
        name: "1. The messy nature of great ideas",
      }),
    );
    expect(drawer).toHaveAttribute("aria-hidden", "false");

    await userEvent.keyboard("{Escape}");
    expect(drawer).toHaveAttribute("aria-hidden", "true");
    expect(drawer).toHaveAttribute("inert");
    await waitFor(() => expect(expandButton).toHaveFocus());
  });

  it("keeps outline add and reorder controls in the expanded drawer", async () => {
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    await userEvent.click(
      screen.getByRole("button", { name: "Expand draft outline" }),
    );

    const drawer = screen.getByRole("complementary", {
      name: "Outline details",
    });
    await userEvent.click(
      within(drawer).getByRole("button", {
        name: "Move The messy nature of great ideas up",
      }),
    );
    expect(within(drawer).getAllByRole("listitem")[0]).toHaveTextContent(
      "The messy nature of great ideas",
    );

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Add section" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Add a section" });
    const addButton = within(dialog).getByRole("button", {
      name: "Add section",
    });
    expect(addButton).toBeDisabled();
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Section title" }),
      "Practical next steps",
    );
    expect(addButton).toBeDisabled();
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Section goal" }),
      "Give the reader an actionable next step",
    );
    expect(addButton).toBeEnabled();
    updateDraftMock.mockClear();
    await userEvent.click(addButton);

    expect(
      within(drawer).getByRole("button", {
        name: "5. Practical next steps",
      }),
    ).toBeVisible();
    expect(drawer).toHaveAttribute("aria-hidden", "false");
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled(), {
      timeout: 1800,
    });
    expect(updateDraftMock).toHaveBeenLastCalledWith(
      articleId,
      expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({
            outline_section_id: null,
            title: "Practical next steps",
            goal: "Give the reader an actionable next step",
          }),
        ]),
      }),
    );
  }, 10_000);

  it("creates and retries deterministic assistant suggestions", async () => {
    render(<DraftEditor articleId={articleId} />);

    await screen.findByRole("complementary", { name: "Writing assistant" });
    const editor = screen.getByRole("textbox", {
      name: "Introduction draft content",
    });
    await userEvent.click(editor);
    await userEvent.keyboard("{Control>}a{/Control}");

    await userEvent.click(
      screen.getAllByRole("button", { name: /Make clearer/ })[0],
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Preview change" })[0],
    );
    expect(screen.getAllByText("Suggested revision")[0]).toBeVisible();
    const firstSuggestion = screen.getAllByText(
      /Great ideas are hard to capture/,
    )[0];
    expect(firstSuggestion).toBeVisible();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Try again" })[0],
    );
    expect(screen.getAllByText(/Ideas often resist words/)[0]).toBeVisible();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Discard" })[0],
    );
    expect(screen.queryByText("Suggested revision")).not.toBeInTheDocument();
  });

  it("generates API talking points and inserts them as a semantic list", async () => {
    const emptyDraft = createDefaultDraft();
    emptyDraft.sections[0] = {
      ...emptyDraft.sections[0],
      editorState: createEditorState([""]),
    };
    getDraftMock.mockResolvedValueOnce(apiDraft(emptyDraft));
    render(<DraftEditor articleId={articleId} />);

    expect(
      await screen.findByRole("radio", { name: /Help me plan/ }),
    ).toBeChecked();
    await userEvent.type(
      screen.getAllByRole("textbox", { name: /Add a direction/ })[0],
      "Focus on operational costs",
    );
    updateDraftMock.mockClear();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate talking points" })[0],
    );

    expect(
      await screen.findByRole("region", {
        name: "AI talking-points preview",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Talking points ready")[0]).toBeVisible();
    expect(generatePointsMock).toHaveBeenCalledWith(
      articleId,
      emptyDraft.sections[0].id,
      { instruction: "Focus on operational costs" },
    );
    const editor = screen.getByRole("textbox", {
      name: "Introduction draft content",
    });
    expect(editor).not.toHaveTextContent("Clarify who owns");

    await userEvent.click(
      screen.getAllByRole("button", { name: "Insert talking points" })[0],
    );
    await waitFor(() =>
      expect(editor).toHaveTextContent(
        "Clarify who owns each publishing stage",
      ),
    );
    expect(editor.querySelector("ul")).not.toBeNull();
    expect(
      screen.queryByRole("region", { name: "AI talking-points preview" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled(), {
      timeout: 1800,
    });
    const savedPatch = updateDraftMock.mock.calls.at(-1)?.[1];
    expect(savedPatch.sections[0].editor_state).toContain('"type":"list"');
  }, 10_000);

  it("disables unsupported section-draft modes", async () => {
    const emptyDraft = createDefaultDraft();
    emptyDraft.sections[0] = {
      ...emptyDraft.sections[0],
      editorState: createEditorState([""]),
    };
    getDraftMock.mockResolvedValueOnce(apiDraft(emptyDraft));
    render(<DraftEditor articleId={articleId} />);

    expect(
      await screen.findByRole("radio", { name: /Write with me/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /Draft this section/ }),
    ).toBeDisabled();
    expect(screen.getAllByText(/Coming soon/)).toHaveLength(2);
  });

  it("saves dirty section context before requesting talking points", async () => {
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    await userEvent.click(
      screen.getAllByRole("checkbox", { name: /Add a personal example/ })[0],
    );
    updateDraftMock.mockClear();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate talking points" })[0],
    );
    await screen.findAllByText("Talking points ready");

    expect(updateDraftMock).toHaveBeenCalledWith(articleId, expect.any(Object));
    expect(generatePointsMock).toHaveBeenCalledWith(
      articleId,
      createDefaultDraft().sections[0].id,
      {},
    );
    expect(updateDraftMock.mock.invocationCallOrder[0]).toBeLessThan(
      generatePointsMock.mock.invocationCallOrder[0],
    );
  });

  it("ignores a talking-point response after the active section changes", async () => {
    let resolveGeneration!: (value: {
      section_id: string;
      points: string[];
    }) => void;
    generatePointsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGeneration = resolve;
      }),
    );
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate talking points" })[0],
    );
    expect(
      screen.getAllByRole("button", { name: /Generating talking points/ })[0],
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Go to The messy nature of great ideas",
      }),
    );
    resolveGeneration({
      section_id: createDefaultDraft().sections[0].id,
      points: ["First point", "Second point", "Third point"],
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "AI talking-points preview" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("retries service failures and blocks non-retryable generation errors", async () => {
    const emptyDraft = createDefaultDraft();
    emptyDraft.sections[0] = {
      ...emptyDraft.sections[0],
      editorState: createEditorState([""]),
    };
    getDraftMock.mockResolvedValueOnce(apiDraft(emptyDraft));
    generatePointsMock
      .mockRejectedValueOnce(
        new ArticleRequestError(
          503,
          "talking_points_generation_unavailable",
          "Talking-point generation is unavailable.",
        ),
      )
      .mockResolvedValueOnce({
        section_id: emptyDraft.sections[0].id,
        points: ["First point", "Second point", "Third point"],
      })
      .mockRejectedValueOnce(
        new ArticleRequestError(
          422,
          "talking_points_generation_blocked",
          "This article cannot be used for generation.",
        ),
      );
    render(<DraftEditor articleId={articleId} />);
    const assistant = await screen.findByRole("complementary", {
      name: "Writing assistant",
    });

    await userEvent.click(
      within(assistant).getByRole("button", {
        name: "Generate talking points",
      }),
    );
    expect(await within(assistant).findByRole("alert")).toHaveTextContent(
      "generation is unavailable",
    );
    await userEvent.click(
      within(assistant).getByRole("button", { name: "Try again" }),
    );
    expect(
      await within(assistant).findByText("Talking points ready"),
    ).toBeVisible();

    await userEvent.type(
      within(assistant).getByRole("textbox", {
        name: "Refine before inserting",
      }),
      "Focus on cost",
    );
    await userEvent.click(
      within(assistant).getByRole("button", {
        name: "Regenerate with direction",
      }),
    );
    expect(await within(assistant).findByRole("alert")).toHaveTextContent(
      "cannot be used",
    );
    expect(
      within(assistant).queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
    expect(generatePointsMock).toHaveBeenLastCalledWith(
      articleId,
      emptyDraft.sections[0].id,
      { instruction: "Focus on cost" },
    );
  }, 10_000);

  it("does not generate when the latest draft cannot be saved", async () => {
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    await userEvent.click(
      screen.getAllByRole("checkbox", { name: /Add a personal example/ })[0],
    );
    updateDraftMock.mockRejectedValueOnce(
      new ArticleRequestError(503, "draft_unavailable", "Save unavailable."),
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate talking points" })[0],
    );

    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(generatePointsMock).not.toHaveBeenCalled();
  });

  it("returns talking-point authentication failures to login", async () => {
    generatePointsMock.mockRejectedValueOnce(
      new ArticleRequestError(401, "invalid_token", "Session expired."),
    );
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate talking points" })[0],
    );

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent(`/articles/new/draft?articleId=${articleId}`)}`,
      ),
    );
  });

  it("collapses and restores the desktop assistant with focus", async () => {
    render(<DraftEditor articleId={articleId} />);
    const assistant = await screen.findByRole("complementary", {
      name: "Writing assistant",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Close writing assistant" }),
    );
    expect(assistant).toHaveAttribute("aria-hidden", "true");
    expect(assistant).toHaveAttribute("inert");
    const opener = screen.getByRole("button", {
      name: "Open writing assistant",
    });
    await waitFor(() => expect(opener).toHaveFocus());

    await userEvent.click(opener);
    expect(assistant).toHaveAttribute("aria-hidden", "false");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close writing assistant" }),
      ).toHaveFocus(),
    );
  });

  it("clears a temporary result before changing sections", async () => {
    const emptyDraft = createDefaultDraft();
    emptyDraft.sections[0] = {
      ...emptyDraft.sections[0],
      editorState: createEditorState([""]),
    };
    getDraftMock.mockResolvedValueOnce(apiDraft(emptyDraft));
    render(<DraftEditor articleId={articleId} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: "Generate talking points",
        })
      )[0],
    );
    expect(
      await screen.findByRole("region", {
        name: "AI talking-points preview",
      }),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Go to The messy nature of great ideas",
      }),
    );
    expect(
      screen.queryByRole("region", { name: "AI talking-points preview" }),
    ).not.toBeInTheDocument();
  });

  it("adapts the assistant states to the mobile bottom sheet", async () => {
    const emptyDraft = createDefaultDraft();
    emptyDraft.sections[0] = {
      ...emptyDraft.sections[0],
      editorState: createEditorState([""]),
    };
    getDraftMock.mockResolvedValueOnce(apiDraft(emptyDraft));
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: true,
      media: "(max-width: 800px)",
      onchange: null,
      removeEventListener: vi.fn(),
    }));
    render(<DraftEditor articleId={articleId} />);

    expect(
      await screen.findByRole("button", { name: "Assistant" }),
    ).toBeVisible();
  });

  it("opens preview and marks the draft ready for review", async () => {
    render(<DraftEditor articleId={articleId} />);

    await screen.findByRole("complementary", { name: "Writing assistant" });

    await userEvent.click(
      screen.getAllByRole("button", { name: "Preview" })[0],
    );
    expect(
      screen.getByRole("dialog", { name: "Article preview" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Back to editor/ }),
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: "Review article" })[0],
    );
    expect(screen.getAllByRole("status")[1]).toHaveTextContent(
      "Draft saved and ready for review.",
    );
    expect(updateDraftMock).toHaveBeenCalledWith(articleId, expect.any(Object));
    expect(pushMock).toHaveBeenCalledWith(
      `/articles/new/review?articleId=${articleId}`,
    );
  });

  it("persists checklist changes through autosave", async () => {
    render(<DraftEditor articleId={articleId} />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    const checkbox = screen.getAllByRole("checkbox", {
      name: /Add a personal example/,
    })[0];
    await userEvent.click(checkbox);

    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled(), {
      timeout: 1800,
    });
    expect(window.sessionStorage.getItem("inkwell:article-draft")).toBeNull();
    expect(checkbox).toBeChecked();
  });
});
