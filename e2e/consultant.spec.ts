import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
const articleId = "46a42280-6ad8-4bb6-a29c-1604adbf0c31";
const interviewId = "46a42280-6ad8-4bb6-a29c-1604adbf0c32";
const profile = {
  display_name: "Jo",
  specialty: "Operations",
  audience: "Founders",
  onboarding_complete: true,
};

test("consultant signup choice survives refresh", async ({ page }) => {
  await page.route("**/api/consultant/availability", (route) =>
    route.fulfill({ json: { enabled: true } }),
  );
  await page.goto("/signup");
  await page.getByRole("radio", { name: /I’m a consultant/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.reload();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Back · Consultant/ }),
  ).toBeVisible();
});

test("consultant dashboard presents articles as a responsive workspace", async ({
  page,
}) => {
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/consultant/",
      "",
    );
    if (path === "profile") return route.fulfill({ json: profile });
    if (path === "articles")
      return route.fulfill({
        json: {
          items: [
            {
              id: articleId,
              title: "How to write better articles",
              status: "in_review",
              updated_at: "2026-10-18T10:00:00Z",
            },
          ],
        },
      });
    return route.fulfill({ json: {} });
  });

  await page.goto("/consultant");
  await expect(
    page.getByRole("heading", { name: "What’s on your mind?" }),
  ).toBeVisible();
  await expect(page.getByText("1 article", { exact: true })).toBeVisible();
  await expect(page.getByText("In Review", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Review and refine your draft before exporting it."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Continue editing: How to write better articles",
    }),
  ).toHaveAttribute("href", `/consultant/articles/${articleId}`);
  await expect(page.getByRole("link", { name: "New article" })).toHaveAttribute(
    "href",
    "/consultant/new",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("article details panel supports cancel and save", async ({ page }) => {
  let title = "How to make AI writing sound more human";
  let description = "Practical advice for consultants.";
  let savedPayload: { title: string; description: string } | null = null;

  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/consultant/",
      "",
    );
    if (path === "profile") return route.fulfill({ json: profile });
    if (
      path === `articles/${articleId}/details` &&
      route.request().method() === "PUT"
    ) {
      savedPayload = route.request().postDataJSON();
      title = savedPayload!.title;
      description = savedPayload!.description;
      return route.fulfill({ json: {} });
    }
    if (path === `articles/${articleId}`)
      return route.fulfill({
        json: {
          id: articleId,
          title,
          description,
          status: "setup",
          interviews: [],
          sections: [],
          revisions: [],
          draft_updated_at: null,
          job: null,
        },
      });
    return route.fulfill({ json: {} });
  });

  await page.goto(`/consultant/articles/${articleId}`);
  const trigger = page.getByRole("button", { name: "Article details" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.getByLabel("Working title").fill("A temporary title");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await expect(page.getByLabel("Working title")).toHaveValue(title);
  await page.getByLabel("Working title").fill("A clearer article title");
  await page
    .getByLabel("Article brief")
    .fill("A focused brief for the revised article.");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByRole("heading", { name: "A clearer article title", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Article details saved.")).toBeVisible();
  expect(savedPayload).toEqual({
    title: "A clearer article title",
    description: "A focused brief for the revised article.",
  });
});

test("failed generation shows the draft checker's objections", async ({
  page,
}) => {
  const objection = "The example is not supported by the interview.";
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/consultant/",
      "",
    );
    if (path === "profile") return route.fulfill({ json: profile });
    if (path === `articles/${articleId}`)
      return route.fulfill({
        json: {
          id: articleId,
          title: "Better handoffs",
          description: "Why clear ownership matters",
          status: "ready_to_draft",
          interviews: [{ id: interviewId, state: "completed" }],
          sections: [],
          revisions: [],
          draft_updated_at: null,
          job: {
            id: "failed-job",
            state: "failed",
            stage: "check",
            attempts: 1,
            instruction: "initial",
            error: `We couldn't verify this draft against your interview. The draft checker flagged:\n1. ${objection}\nYour interview is saved. Please review these points before retrying.`,
          },
        },
      });
    return route.fulfill({ json: {} });
  });

  await page.goto(`/consultant/articles/${articleId}`);
  await expect(page.getByText(objection, { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry generation" }),
  ).toBeVisible();
  await expect(page.getByText(objection, { exact: false })).toHaveCSS(
    "white-space",
    "pre-line",
  );
});

test("minimal article opens a voice-only interview and queues its draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Microphone unavailable", "NotAllowedError");
        },
      },
    });
  });
  let finished = false;
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/consultant/",
      "",
    );
    if (path === "profile") return route.fulfill({ json: profile });
    if (path === "articles" && route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        title: "Better handoffs",
        description: "Tools cannot solve unclear ownership.",
        audience: "Founders",
        length: "standard",
      });
      return route.fulfill({ status: 201, json: { id: articleId } });
    }
    if (path === `articles/${articleId}/interviews`)
      return route.fulfill({ json: { id: interviewId } });
    if (path === `interviews/${interviewId}/finish`) {
      finished = true;
      return route.fulfill({ json: { id: "job", state: "queued" } });
    }
    if (path === `interviews/${interviewId}`)
      return route.fulfill({
        json: {
          id: interviewId,
          article_id: articleId,
          title: "Better handoffs",
          description: "Tools cannot solve unclear ownership.",
          state: "active",
          turns: [
            {
              item_id: "one",
              speaker: "interviewer",
              text: "What should readers understand?",
            },
            {
              item_id: "two",
              speaker: "participant",
              text: "I call it expensive confusion.",
            },
          ],
          corrections: {},
          questions: [{ id: "0", text: "What should readers understand?" }],
        },
      });
    if (path === `articles/${articleId}`)
      return route.fulfill({
        json: {
          id: articleId,
          title: "Better handoffs",
          description: "Tools cannot solve unclear ownership.",
          status: "setup",
          interviews: [],
          sections: [],
          revisions: [],
          draft_updated_at: null,
          job: finished
            ? { id: "job", state: "queued", stage: "understand", error: null }
            : null,
        },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto("/consultant/new");
  await expect(page.getByRole("heading", { name: "Your idea" })).toBeVisible();
  await expect(
    page.getByText("Shape the draft", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: /Standard.*800–1,200 words/ }),
  ).toBeChecked();
  await page.getByLabel("Working title").fill("Better handoffs");
  await page
    .getByLabel("What is it about?")
    .fill("Tools cannot solve unclear ownership.");
  await page.getByRole("button", { name: "Start my interview" }).click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await expect(
    page.getByRole("button", { name: "Check microphone" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Answer by typing" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect(
    page.getByRole("heading", { name: "Better handoffs", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("Tools cannot solve unclear ownership.", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mute" })).toBeVisible();
  await expect(page.getByLabel("Interview duration")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pause|Resume/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Interview transcript" }),
  ).toHaveCount(0);
  await expect(page.getByText("I call it expensive confusion.")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Switch to typing" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Finish and create draft" }).click();
  await expect(page).toHaveURL(`/consultant/articles/${articleId}`);
  await expect(
    page.getByRole("heading", { name: "Your draft is waiting to begin" }),
  ).toBeVisible();
  expect(finished).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("draft proposals require explicit acceptance and export the accepted version", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const section = (id: string, text: string) => ({
    id,
    outline_section_id: null,
    title: "The handoff",
    goal: "Explain ownership",
    checklist: [],
    editor_state: JSON.stringify({
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: "ltr",
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text,
                format: 0,
                detail: 0,
                mode: "normal",
                style: "",
              },
            ],
          },
        ],
      },
    }),
  });
  const original = section(
    "46a42280-6ad8-4bb6-a29c-1604adbf0c33",
    "This is my original draft.",
  );
  const proposed = section(
    "46a42280-6ad8-4bb6-a29c-1604adbf0c34",
    "I call that expensive confusion.",
  );
  const proposedEditor = JSON.parse(proposed.editor_state);
  proposedEditor.root.children[0].children.push(
    {
      type: "text",
      version: 1,
      text: " Source: ",
      format: 0,
      detail: 0,
      mode: "normal",
      style: "",
    },
    {
      type: "link",
      version: 1,
      url: "https://example.org/study",
      target: "_blank",
      rel: "noopener noreferrer",
      direction: "ltr",
      format: "",
      indent: 0,
      children: [
        {
          type: "text",
          version: 1,
          text: "Case study",
          format: 0,
          detail: 0,
          mode: "normal",
          style: "",
        },
      ],
    },
  );
  proposed.editor_state = JSON.stringify(proposedEditor);
  let accepted = [original];
  let hasProposal = true;
  let aiRequested = false;
  const revision = {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c35",
    kind: "proposal",
    sections: [proposed],
    gaps: [],
    created_at: "2026-10-17T10:00:00+00:00",
    request: "Add an example with a source",
    summary: "Added a cited example.",
    sources: [
      { id: "s1", title: "Case study", url: "https://example.org/study" },
    ],
  };
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    if (path.endsWith("/apply")) {
      expect(route.request().headers()["if-unmodified-since"]).toBe(
        "2026-10-17T10:00:00+00:00",
      );
      accepted = [proposed];
      hasProposal = false;
      return route.fulfill({ json: { saved: true } });
    }
    if (path.endsWith("/ai-requests")) {
      const body = route.request().postDataJSON();
      expect(body.instruction).toBe("Make the article more structured");
      expect(body.request_key).toBeTruthy();
      expect(route.request().headers()["if-unmodified-since"]).toBe(
        "2026-10-17T10:00:00+00:00",
      );
      aiRequested = true;
      return route.fulfill({
        json: { id: "ai-job", state: "queued", stage: "understand" },
      });
    }
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: accepted,
        revisions: hasProposal ? [revision] : [],
        draft_updated_at: "2026-10-17T10:00:00+00:00",
        job: aiRequested
          ? {
              id: "ai-job",
              state: "running",
              stage: "understand",
              error: null,
              instruction: "Make the article more structured",
            }
          : { id: "job", state: "succeeded", stage: "complete", error: null },
      },
    });
  });
  await page.goto(`/consultant/articles/${articleId}`);
  await expect(
    page.getByText("This is my original draft.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("I call that expensive confusion.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "View interview" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Interview source material" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Review AI suggestion" }).click();
  await page.getByRole("button", { name: "Review full article" }).click();
  const preview = page.getByRole("dialog", {
    name: "Preview suggested rewrite",
  });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("article").last()).toContainText(
    "I call that expensive confusion.",
  );
  await expect(
    preview.getByRole("link", { name: "Case study" }).first(),
  ).toHaveAttribute("href", "https://example.org/study");
  await preview.getByRole("button", { name: "Compare with current" }).click();
  await expect(
    preview.getByText("This is my original draft.", { exact: true }),
  ).toBeVisible();
  await expect(preview.getByRole("article").last()).toContainText(
    "I call that expensive confusion.",
  );
  await page.screenshot({
    path: `test-results/consultant-version-preview-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(
    preview.getByRole("button", { name: "Reject change" }),
  ).toBeInViewport();
  await expect(
    preview.getByRole("button", { name: "Use this version" }),
  ).toBeInViewport();
  expect(accepted[0].id).toBe(original.id);
  await preview.getByRole("button", { name: "Use this version" }).click();
  await expect(preview).toBeHidden();
  await expect(
    page.getByText("Draft updated with the suggested rewrite."),
  ).toBeVisible();
  await expect(
    page.getByText("This is my original draft.", { exact: true }),
  ).toHaveCount(0);
  const askAiButton = page.getByRole("button", { name: "Ask AI", exact: true });
  await expect(askAiButton).toHaveCSS("background-color", "rgb(197, 0, 50)");
  await expect(askAiButton).toHaveCSS("white-space", "nowrap");
  await askAiButton.click();
  await page.screenshot({
    path: `test-results/consultant-ask-ai-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Make the article more structured" })
    .click();
  await expect(page.getByLabel("What would you like to change?")).toHaveValue(
    "Make the article more structured",
  );
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Preparing your preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Ask AI" }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportMenu = page.getByRole("menu", { name: "Export article" });
  await expect(exportMenu).toBeVisible();
  await expect(
    exportMenu.getByText("Paste into Docs, Notion, or your CMS"),
  ).toBeVisible();
  await expect(
    exportMenu.getByText("Best for writing tools and publishing workflows"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(exportMenu).toBeHidden();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(exportMenu).toBeVisible();
  await exportMenu.getByRole("menuitem", { name: /Copy to clipboard/ }).click();
  await expect(exportMenu.getByText("Copied", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "[Case study](https://example.org/study)",
  );
  await page.screenshot({
    path: `test-results/consultant-export-open-${test.info().project.name}.png`,
    fullPage: true,
  });
  await exportMenu.screenshot({
    path: `test-results/consultant-export-popover-${test.info().project.name}.png`,
  });
  const download = page.waitForEvent("download");
  await exportMenu.getByRole("menuitem", { name: /Download Markdown/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Better-handoffs.md");
  expect(await readFile(await file.path(), "utf8")).toContain(
    "[Case study](https://example.org/study)",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const htmlDownload = page.waitForEvent("download");
  await exportMenu.getByRole("menuitem", { name: /Download HTML/ }).click();
  const htmlFile = await htmlDownload;
  expect(await readFile(await htmlFile.path(), "utf8")).toContain(
    '<a href="https://example.org/study"',
  );
  await page.screenshot({
    path: `test-results/consultant-draft-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test("rejecting an AI suggestion keeps the current draft", async ({ page }) => {
  const section = {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c33",
    outline_section_id: null,
    title: "The handoff",
    goal: "Explain ownership",
    checklist: [],
    editor_state: JSON.stringify({
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: "ltr",
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text: "Keep my draft.",
                format: 0,
                detail: 0,
                mode: "normal",
                style: "",
              },
            ],
          },
        ],
      },
    }),
  };
  let pending = true;
  await page.route("**/api/consultant/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    if (route.request().method() === "DELETE") {
      pending = false;
      return route.fulfill({ json: { rejected: true } });
    }
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: [section],
        draft_updated_at: "2026-10-17T10:00:00+00:00",
        job: null,
        revisions: pending
          ? [
              {
                id: "46a42280-6ad8-4bb6-a29c-1604adbf0c35",
                kind: "proposal",
                sections: [section],
                gaps: [],
                created_at: "2026-10-17T10:00:00+00:00",
              },
            ]
          : [],
      },
    });
  });
  await page.goto(`/consultant/articles/${articleId}`);
  await page.getByRole("button", { name: "Review AI suggestion" }).click();
  await page.getByRole("button", { name: "Review full article" }).click();
  await page
    .getByRole("dialog", { name: "Preview suggested rewrite" })
    .getByRole("button", { name: "Reject change" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Preview suggested rewrite" }),
  ).toBeHidden();
  await expect(page.getByText("Keep my draft.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review AI suggestion" }),
  ).toHaveCount(0);
});

test("consultant section headings are unnumbered and editable", async ({
  page,
}) => {
  const articleId = "56a42280-6ad8-4bb6-a29c-1604adbf0c31";
  const editorState = (text: string) =>
    JSON.stringify({
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: "ltr",
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text,
                format: 0,
                detail: 0,
                mode: "normal",
                style: "",
              },
            ],
          },
        ],
      },
    });
  let sections = [
    {
      id: "56a42280-6ad8-4bb6-a29c-1604adbf0c32",
      outline_section_id: null,
      title: "Introduction",
      goal: "Open the article",
      checklist: [],
      editor_state: editorState("Opening paragraph."),
    },
    {
      id: "56a42280-6ad8-4bb6-a29c-1604adbf0c33",
      outline_section_id: null,
      title: "2. Clear ownership",
      goal: "Explain ownership",
      checklist: [],
      editor_state: editorState("Name the owner."),
    },
  ];
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    if (path.endsWith("/draft") && route.request().method() === "PUT") {
      sections = route.request().postDataJSON().sections;
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [],
        sections,
        revisions: [],
        draft_updated_at: "2026-10-19T10:00:00+00:00",
        job: { id: "job", state: "succeeded", stage: "complete", error: null },
      },
    });
  });

  await page.goto(`/consultant/articles/${articleId}`);
  const heading = page.getByRole("textbox", {
    name: "Section heading: Clear ownership",
  });
  await expect(heading).toHaveValue("Clear ownership");
  await heading.fill("A better handoff");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
  expect(sections[1].title).toBe("A better handoff");
});
