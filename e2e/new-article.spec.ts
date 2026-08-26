import { expect, test } from "@playwright/test";

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "These are useful notes for a future article brief.",
  working_title: "A useful working title",
  target_audience: ["Independent", "writers"],
  article_goal: "educate_with_practical_guidance",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

test("creates and reopens an article intake", async ({ page }) => {
  await page.route("**/api/articles**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(article) });
    } else await route.continue();
  });
  await page.route(`**/api/articles/${article.id}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(article) });
  });

  await page.goto("/articles/new");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Turn your notes into a clear article." })).toBeVisible();
  await page.getByRole("textbox", { name: "Your notes" }).fill(article.notes);
  await page.getByRole("textbox", { name: /Working title/ }).fill(article.working_title);
  await page.getByRole("textbox", { name: /Target audience/ }).fill(article.target_audience.join(" "));
  await page.getByRole("combobox", { name: /Article goal/ }).selectOption(article.article_goal);

  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  await page.getByRole("button", { name: isMobile ? "Save" : "Save as draft", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.id}$`));
  await expect(page.getByRole("heading", { name: "Refine your article intake." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Working title/ })).toHaveValue(article.working_title);

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
});

test("creates an intake before continuing to the brief", async ({ page }) => {
  await page.route("**/api/articles**", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(article) });
  });
  await page.goto("/articles/new");
  await page.getByRole("textbox", { name: "Your notes" }).fill(article.notes);
  await page.getByRole("textbox", { name: /Working title/ }).fill(article.working_title);
  await page.getByRole("textbox", { name: /Target audience/ }).fill(article.target_audience.join(" "));
  await page.getByRole("combobox", { name: /Article goal/ }).selectOption(article.article_goal);
  await page.getByRole("button", { name: "Build my article brief" }).last().click();
  await expect(page).toHaveURL(new RegExp(`/articles/new/brief\\?articleId=${article.id}$`));
});
