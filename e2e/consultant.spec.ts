import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("private generation performance shows jobs and an attempt timeline", async ({
  page,
}, testInfo) => {
  const job = {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c36",
    article_id: articleId,
    article_title: "Better handoffs",
    request_type: "generation",
    status: "succeeded",
    queued_at: "2026-10-21T10:00:00Z",
    first_claimed_at: "2026-10-21T10:00:12Z",
    finished_at: "2026-10-21T10:02:03Z",
    attempts: 1,
    models: ["writer-model", "checker-model"],
    queue_seconds: 12,
    active_seconds: 111,
    rate_limit_seconds: 65,
    total_seconds: 123,
    total_tokens: 4200,
    detailed_timing_available: true,
  };
  await page.route("**/api/consultant/performance/jobs**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(job.id))
      return route.fulfill({
        json: {
          ...job,
          events: [
            {
              id: "event-1",
              attempt: 0,
              kind: "queue",
              operation: null,
              model_id: null,
              started_at: "2026-10-21T10:00:00Z",
              ended_at: "2026-10-21T10:00:12Z",
              duration_ms: 12000,
              outcome: "completed",
              input_tokens: null,
              output_tokens: null,
              provider_request_id: null,
            },
            {
              id: "event-2",
              attempt: 1,
              kind: "call",
              operation: "write",
              model_id: "writer-model",
              started_at: "2026-10-21T10:00:14Z",
              ended_at: "2026-10-21T10:00:45Z",
              duration_ms: 31000,
              outcome: "succeeded",
              input_tokens: 1000,
              output_tokens: 2000,
              provider_request_id: "req-test",
            },
            {
              id: "event-3",
              attempt: 1,
              kind: "wait",
              operation: "rate_limit",
              model_id: "checker-model",
              started_at: "2026-10-21T10:00:45Z",
              ended_at: "2026-10-21T10:01:50Z",
              duration_ms: 65000,
              outcome: "completed",
              input_tokens: null,
              output_tokens: null,
              provider_request_id: null,
            },
          ],
        },
      });
    return route.fulfill({
      json: {
        items: [
          job,
          {
            ...job,
            id: "46a42280-6ad8-4bb6-a29c-1604adbf0c37",
            article_title: "A clearer opening",
            request_type: "ask_ai",
            total_seconds: 54,
            queue_seconds: 4,
            rate_limit_seconds: 0,
            models: ["writer-model"],
            total_tokens: 930,
          },
          {
            ...job,
            id: "46a42280-6ad8-4bb6-a29c-1604adbf0c38",
            article_title: "Why ownership matters",
            status: "failed",
            total_seconds: 187,
            queue_seconds: 22,
            rate_limit_seconds: 65,
          },
          {
            ...job,
            id: "46a42280-6ad8-4bb6-a29c-1604adbf0c39",
            article_title: "Lessons from client handoffs",
            total_seconds: 79,
            queue_seconds: 7,
            rate_limit_seconds: 0,
          },
          {
            ...job,
            id: "46a42280-6ad8-4bb6-a29c-1604adbf0c40",
            article_title: "An earlier article",
            detailed_timing_available: false,
            total_seconds: 95,
            queue_seconds: null,
            rate_limit_seconds: null,
          },
        ],
        page: 1,
        page_size: 20,
        total: 5,
        median_seconds: 95,
        p95_seconds: 187,
      },
    });
  });
  if (testInfo.project.name === "chromium")
    await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto("/consultant/performance");
  await expect(
    page.getByRole("heading", { name: "Generation performance" }),
  ).toBeVisible();
  await expect(page.getByText("Better handoffs")).toBeVisible();
  await expect(page.getByText("Detailed timing unavailable")).toBeVisible();
  await page.getByRole("button", { name: /Better handoffs/ }).click();
  await expect(page.getByText("Attempt 1")).toBeVisible();
  await expect(page.getByText("req-test")).toBeVisible();
  await expect(page.getByText("Rate-limit wait")).toBeVisible();
  if (testInfo.project.name === "chromium")
    await page.screenshot({
      path: "test-results/performance-desktop.png",
      fullPage: true,
    });
  await page.getByLabel("Request type").selectOption("ask_ai");
  await expect(page).toHaveURL(/performance/);
});
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

test("unsupported claims keep the draft visible with claim-level review", async ({
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
          status: "in_review",
          interviews: [{ id: interviewId, state: "completed" }],
          sections: [
            {
              id: "8cbcf125-dac7-4c5a-9b09-918375bc3d8a",
              outline_section_id: null,
              title: "What AI can do",
              goal: "Explain supported uses",
              checklist: [],
              editor_state: JSON.stringify({
                root: {
                  type: "root",
                  version: 1,
                  children: [
                    {
                      type: "anchored-paragraph",
                      version: 1,
                      paragraphId: "c0ee3c05-72f4-4349-84c0-48d37508b5d7",
                      children: [
                        {
                          type: "text",
                          version: 1,
                          text: "AI can support predictions.",
                        },
                      ],
                      direction: "ltr",
                      format: "",
                      indent: 0,
                      textFormat: 0,
                      textStyle: "",
                    },
                  ],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                },
              }),
            },
          ],
          findings: [
            {
              id: "f81ff4a5-b686-4392-aa30-611b72a3b984",
              classification: "unsupported",
              category: "unsupported_prediction",
              section_id: "8cbcf125-dac7-4c5a-9b09-918375bc3d8a",
              section_index: 0,
              paragraph_id: "c0ee3c05-72f4-4349-84c0-48d37508b5d7",
              paragraph_index: 0,
              claim_text: "AI can support predictions",
              explanation: objection,
              source_turn_ids: ["t40", "t42", "t44"],
              external_source_ids: [],
              suggested_replacement:
                "AI can analyse large amounts of data and recognise patterns.",
              status: "open",
            },
          ],
          open_finding_count: 1,
          revisions: [],
          draft_updated_at: "2026-10-22T17:00:00Z",
          job: {
            id: "failed-job",
            state: "succeeded",
            stage: "complete",
            attempts: 1,
            instruction: "initial",
            error: null,
            open_finding_count: 1,
            review_status: "needs_attention",
          },
        },
      });
    return route.fulfill({ json: {} });
  });

  await page.goto(`/consultant/articles/${articleId}`);
  await expect(page.getByText(objection, { exact: false })).toBeVisible();
  await expect(page.getByText("AI can support predictions.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Repair" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry generation" }),
  ).toHaveCount(0);
});

test("a style suggestion is shown as an optional note beside the saved article", async ({
  page,
}) => {
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Why clear ownership matters",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: [
          {
            id: "section-one",
            outline_section_id: null,
            title: "Opening",
            goal: "Introduce the article",
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
                        text: "Fix the handoff first.",
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
          },
        ],
        revisions: [],
        draft_updated_at: "2026-10-20T10:00:00Z",
        job: {
          id: "initial-job",
          state: "succeeded",
          stage: "complete",
          attempts: 1,
          instruction: "initial",
          error: null,
          writing_suggestions: [
            {
              section: "Opening",
              text: "Consider a shorter first sentence.",
            },
          ],
        },
      },
    });
  });

  await page.goto(`/consultant/articles/${articleId}`);
  await expect(
    page.getByRole("heading", { name: "Writing notes" }),
  ).toBeVisible();
  await expect(
    page.getByText("Consider a shorter first sentence."),
  ).toBeVisible();
  await expect(
    page.getByText("Your article is ready.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry generation" }),
  ).toHaveCount(0);
});

test("minimal article opens a voice-only interview and queues its draft", async ({
  page,
}) => {
  test.setTimeout(60_000); // The first desktop navigation compiles the interview route.
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
  const proposed = section(original.id, "I call that expensive confusion.");
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
  await expect(preview.locator("ins")).toContainText("I call");
  await expect(preview.locator("del")).toContainText("This is");
  await expect(
    preview.getByRole("link", { name: "Case study" }).first(),
  ).toHaveAttribute("href", "https://example.org/study");
  await preview.getByRole("button", { name: "Compare with current" }).click();
  await expect(
    preview
      .getByRole("article")
      .first()
      .getByText("This is my original draft.", { exact: true }),
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
  const checkExportMenuBounds = async () => {
    const bounds = await exportMenu.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width + 1);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      viewport!.height + 1,
    );
    const triggerBounds = await page
      .getByRole("button", { name: "Export", exact: true })
      .boundingBox();
    expect(triggerBounds).not.toBeNull();
    expect(
      bounds!.y >= triggerBounds!.y + triggerBounds!.height ||
        bounds!.y + bounds!.height <= triggerBounds!.y,
    ).toBe(true);
  };
  await checkExportMenuBounds();
  const originalViewport = page.viewportSize()!;
  if (originalViewport.width > 640) {
    await page.setViewportSize({ width: 720, height: 700 });
    await checkExportMenuBounds();
    await page.setViewportSize(originalViewport);
    await checkExportMenuBounds();
  }
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

test("Ask AI asks for missing detail without making a proposal", async ({
  page,
}) => {
  const section = {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c33",
    outline_section_id: null,
    title: "Conclusion",
    goal: "Summarize",
    checklist: [],
    editor_state: JSON.stringify({
      root: {
        type: "root",
        version: 1,
        children: [
          {
            type: "paragraph",
            version: 1,
            children: [
              { type: "text", version: 1, text: "Keep this conclusion." },
            ],
          },
        ],
      },
    }),
  };
  let submitted = "";
  await page.route("**/api/consultant/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    if (path.endsWith("/ai-requests")) {
      submitted = route.request().postDataJSON().instruction;
      return route.fulfill({
        json: { id: "new-job", state: "queued", stage: "plan" },
      });
    }
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: [section],
        revisions: [],
        draft_updated_at: "2026-10-17T10:00:00+00:00",
        job: {
          id: "clarification-job",
          state: "needs_clarification",
          stage: "plan",
          error: null,
          request_kind: "ask_ai",
          instruction: "Add this point to the conclusion",
          clarification_question: "Which point should I add to the conclusion?",
        },
      },
    });
  });
  await page.goto(`/consultant/articles/${articleId}`);
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(
    page.getByText("Which point should I add to the conclusion?"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review full article" }),
  ).toHaveCount(0);
  await page
    .getByLabel("What would you like to change?")
    .fill(
      "Add the point that each next step needs one owner to the conclusion",
    );
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect.poll(() => submitted).toContain("one owner");
});

test("comparison identifies moved sections by identity", async ({ page }) => {
  const makeSection = (id: string, title: string, text: string) => ({
    id,
    outline_section_id: null,
    title,
    goal: "Explain",
    checklist: [],
    editor_state: JSON.stringify({
      root: {
        type: "root",
        version: 1,
        children: [
          {
            type: "paragraph",
            version: 1,
            children: [{ type: "text", version: 1, text }],
          },
        ],
      },
    }),
  });
  const background = makeSection(
    "46a42280-6ad8-4bb6-a29c-1604adbf0c33",
    "Background",
    "The handoff was confusing.",
  );
  const advice = makeSection(
    "46a42280-6ad8-4bb6-a29c-1604adbf0c34",
    "Practical advice",
    "Give the next step one owner.",
  );
  await page.route("**/api/consultant/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: [background, advice],
        draft_updated_at: "2026-10-17T10:00:00+00:00",
        revisions: [
          {
            id: "46a42280-6ad8-4bb6-a29c-1604adbf0c35",
            kind: "proposal",
            sections: [advice, background],
            gaps: [],
            created_at: "2026-10-17T10:00:00+00:00",
            summary: "Moved practical advice before background.",
          },
        ],
        job: {
          id: "move-job",
          state: "succeeded",
          stage: "complete",
          request_kind: "ask_ai",
          error: null,
        },
      },
    });
  });
  await page.goto(`/consultant/articles/${articleId}`);
  await page.getByRole("button", { name: "Review AI suggestion" }).click();
  await page.getByRole("button", { name: "Review full article" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Preview suggested rewrite",
  });
  await expect(dialog.getByText("Moved from section 2")).toBeVisible();
  await expect(dialog.getByText("Moved from section 1")).toBeVisible();
  await expect(dialog.locator("ins, del")).toHaveCount(0);
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
