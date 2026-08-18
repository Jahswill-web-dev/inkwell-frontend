import { expect, test, type Page } from "@playwright/test";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Research notes and an early idea",
  working_title: "How small teams can publish consistently",
  target_audience: ["Independent writers", "Small content teams"],
  article_goal: "educate_with_practical_guidance",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const brief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: articleId,
  summary:
    "A practical guide to building a repeatable publishing process for small teams.",
  core_angle:
    "Consistency comes from a clear workflow rather than individual discipline.",
  audience_insights: [
    "Independent writers need a process they can maintain alone",
  ],
  tone_and_style: "Practical, encouraging, and specific",
  key_takeaways: [
    "Define a small repeatable workflow",
    "Assign ownership for every stage",
  ],
  evidence_gaps: ["Examples showing the workflow in use"],
  call_to_action: "Create a one-page checklist for the next article.",
  seo: {
    suggested_titles: ["A Repeatable Publishing Process for Small Teams"],
    primary_keyword: "publishing process",
    secondary_keywords: ["content workflow", "consistent publishing"],
    meta_description:
      "Build a practical publishing process that helps small teams publish consistently.",
  },
  model_id: "gemini-2.5-flash",
  prompt_version: "article_brief_v1",
  input_token_count: 275,
  output_token_count: 640,
  generation_duration_ms: 3240,
  is_stale: false,
  created_at: "2026-08-14T12:00:00Z",
  updated_at: "2026-08-14T12:00:00Z",
};

async function mockArticle(page: Page) {
  await page.route(`**/api/articles/${articleId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(article),
    }),
  );
}

test("renders a saved API-generated brief responsively", async ({ page }) => {
  await mockArticle(page);
  let briefGets = 0;
  await page.route(`**/api/articles/${articleId}/brief`, async (route) => {
    if (route.request().method() === "GET") briefGets += 1;
    const responseBrief =
      route.request().method() === "PATCH"
        ? { ...brief, ...route.request().postDataJSON() }
        : brief;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseBrief),
    });
  });

  await page.goto(`/articles/new/brief?articleId=${articleId}`);
  await expect(
    page.getByRole("heading", { name: "Your article brief" }),
  ).toBeVisible();
  await expect(page.getByText(brief.summary)).toBeVisible();
  await expect(page.getByText(brief.tone_and_style)).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Brief");
  expect(briefGets).toBe(1);

  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  await page
    .getByRole("button", {
      name: isMobile ? "Edit" : "Edit brief",
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", { name: "Summary" })
    .fill("A revised API brief summary.");
  await page
    .getByRole("button", {
      name: isMobile ? "Save" : "Save changes",
      exact: true,
    })
    .click();
  await expect(page.getByText("A revised API brief summary.")).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});

test("generates once when no saved brief exists and can regenerate", async ({
  page,
}) => {
  await mockArticle(page);
  let posts = 0;
  await page.route(`**/api/articles/${articleId}/brief`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "brief_not_found", message: "Brief not found" },
        }),
      });
      return;
    }
    posts += 1;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(brief),
    });
  });

  await page.goto(`/articles/new/brief?articleId=${articleId}`);
  await expect(page.getByText("Generating your article brief…")).toBeVisible();
  await expect(page.getByText(brief.summary)).toBeVisible();
  expect(posts).toBe(1);
  await page
    .getByRole("button", {
      name: "Regenerate brief",
      exact: true,
    })
    .click();
  await expect.poll(() => posts).toBe(2);
});
