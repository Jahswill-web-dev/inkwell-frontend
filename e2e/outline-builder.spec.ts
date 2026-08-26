import { expect, test } from "@playwright/test";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "A repeatable publishing process",
  target_audience: ["Independent writers"],
  article_goal: "educate_with_practical_guidance",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const outline = {
  id: "a8d789b6-6e71-436e-a981-51d25e66f538",
  article_id: articleId,
  sections: [
    {
      heading: "Introduction",
      purpose: "Introduce the publishing problem",
      key_points: ["Set the context"],
    },
    {
      heading: "Build the workflow",
      purpose: "Explain a sustainable workflow",
      key_points: ["Define ownership"],
    },
    {
      heading: "Conclusion",
      purpose: "Close with a practical next step",
      key_points: ["Create a checklist"],
    },
  ],
  model_id: "gemini-2.5-flash",
  prompt_version: "article_outline_v1",
  input_token_count: 310,
  output_token_count: 420,
  generation_duration_ms: 2410,
  is_stale: false,
  created_at: "2026-08-18T12:00:00Z",
  updated_at: "2026-08-18T12:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route(`**/api/articles/${articleId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(article),
    }),
  );
});

test("loads, edits, saves, and opens drafting from a persisted outline", async ({
  page,
}) => {
  let savedSections = outline.sections;
  await page.route(`**/api/articles/${articleId}/outline`, async (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as {
        sections: typeof outline.sections;
      };
      savedSections = body.sections;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...outline, sections: savedSections }),
    });
  });

  await page.goto(`/articles/new/outline?articleId=${articleId}`);
  await expect(
    page.getByRole("heading", { name: "Build your article’s structure" }),
  ).toBeVisible();
  const heading = page.getByRole("textbox", { name: "Heading" });
  await heading.fill("A stronger introduction");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Outline saved");
  expect(savedSections[0].heading).toBe("A stronger introduction");
  await page.getByRole("button", { name: "Start drafting" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/articles/new/draft\\?articleId=${articleId}$`),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem("inkwell:article-outline") ?? "{}")
            .sections?.[0]?.title,
      ),
    )
    .toBe("A stronger introduction");
});

test("generates a missing outline once and supports confirmed deletion", async ({
  page,
}) => {
  let posts = 0;
  let deletes = 0;
  await page.route(`**/api/articles/${articleId}/outline`, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "outline_not_found", message: "Outline not found" },
        }),
      });
      return;
    }
    if (method === "DELETE") {
      deletes += 1;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    posts += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(outline),
    });
  });

  await page.goto(`/articles/new/outline?articleId=${articleId}`);
  await expect(page.getByText("Build the workflow")).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole("button", { name: "Delete outline" }).click();
  expect(deletes).toBe(0);
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect.poll(() => deletes).toBe(1);
  await expect(page).toHaveURL(
    new RegExp(`/articles/new/brief\\?articleId=${articleId}$`),
  );
});
