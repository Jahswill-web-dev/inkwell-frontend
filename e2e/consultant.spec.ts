import { expect, test } from "@playwright/test";
const articleId = "46a42280-6ad8-4bb6-a29c-1604adbf0c31";
const interviewId = "46a42280-6ad8-4bb6-a29c-1604adbf0c32";
const profile = {
  display_name: "Jo",
  specialty: "Operations",
  audience: "Founders",
  onboarding_complete: true,
  voice: {},
  voice_revision: 0,
  suggested_voice: null,
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

test("minimal article proceeds to authenticated typed interview and queues its draft", async ({
  page,
}) => {
  let turns: { item_id: string; speaker: string; text: string }[] = [];
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
      });
      return route.fulfill({ status: 201, json: { id: articleId } });
    }
    if (path === `articles/${articleId}/interviews`)
      return route.fulfill({ json: { id: interviewId } });
    if (path === `interviews/${interviewId}/answer`) {
      turns = [
        {
          item_id: "one",
          speaker: "participant",
          text: route.request().postDataJSON().text,
        },
      ];
      return route.fulfill({ json: { complete: false, saved: true } });
    }
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
          turns,
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
  await page.getByLabel("Working title").fill("Better handoffs");
  await page
    .getByLabel("What is it about?")
    .fill("Tools cannot solve unclear ownership.");
  await page.getByRole("button", { name: "Start my interview" }).click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await page.getByRole("button", { name: "Answer by typing" }).click();
  await page
    .getByLabel("What should readers understand?")
    .fill(
      "I call it expensive confusion. Decide who owns the next step before buying a tool.",
    );
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText(/I call it expensive confusion/)).toBeVisible();
  await page.getByRole("button", { name: "Finish and create draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Your draft is queued" }),
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
  let accepted = [original];
  const revision = {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c35",
    kind: "proposal",
    sections: [proposed],
    gaps: [],
    created_at: "2026-10-17T10:00:00+00:00",
  };
  await page.route("**/api/consultant/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) return route.fulfill({ json: profile });
    if (path.endsWith("/apply")) {
      expect(route.request().headers()["if-unmodified-since"]).toBe(
        "2026-10-17T10:00:00+00:00",
      );
      accepted = [proposed];
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({
      json: {
        id: articleId,
        title: "Better handoffs",
        description: "Ownership",
        status: "in_review",
        interviews: [{ id: interviewId, state: "completed" }],
        sections: accepted,
        revisions: [revision],
        draft_updated_at: "2026-10-17T10:00:00+00:00",
        job: { id: "job", state: "succeeded", stage: "complete", error: null },
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
  await page.getByRole("button", { name: "Review version" }).click();
  await expect(
    page.getByText("I call that expensive confusion.", { exact: true }),
  ).toBeVisible();
  expect(accepted[0].id).toBe(original.id);
  await page.getByRole("button", { name: "Use this version" }).click();
  await expect(
    page.getByText(
      "Version applied. Your previous draft remains in version history.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("This is my original draft.", { exact: true }),
  ).toHaveCount(0);
  await page.getByText("Export", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download MARKDOWN" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Better-handoffs.md");
  await page.screenshot({
    path: `test-results/consultant-draft-${test.info().project.name}.png`,
    fullPage: true,
  });
});
