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

async function completeEditorialSetup(page: import("@playwright/test").Page) {
  await page.getByLabel(/Client */).fill("Northstar Labs");
  await page.getByLabel(/Working title or topic/).fill(article.working_title);
  await page.getByLabel(/Target audience/).fill("Independent content teams");
  await page
    .getByRole("combobox", { name: /Article goal/ })
    .selectOption(article.article_goal);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByLabel(/Main angle or hypothesis/)
    .fill("Expert insight makes B2B content more credible.");
  await page
    .getByLabel(/Key message/)
    .fill("A focused interview produces stronger source material.");
  await page.getByRole("button", { name: /Continue/ }).click();
}

test("creates a client article and prepares its interview handoff", async ({
  page,
}) => {
  await page.route("**/api/articles**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(article),
      });
    } else await route.continue();
  });
  await page.route(`**/api/articles/${article.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(article),
    });
  });

  await page.goto("/articles/new");
  await expect(
    page.getByRole("heading", { name: "Create a client article" }),
  ).toBeVisible();
  await completeEditorialSetup(page);
  await page.getByLabel(/Client or expert name/).fill("Avery Chen");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("Northstar Labs")).toBeVisible();
  await page
    .getByRole("button", { name: "Create article & prepare interview" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/articles/${article.id}\\?next=client-interview$`),
  );
  await expect(
    page.getByRole("heading", { name: "Refine your article intake." }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /Working title/ }),
  ).toHaveValue(article.working_title);
});

test("creates an article from existing material and continues to the brief", async ({
  page,
}) => {
  await page.route("**/api/articles**", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(article),
    });
  });
  await page.goto("/articles/new");
  await completeEditorialSetup(page);
  await page.getByRole("radio", { name: /Use existing notes/ }).check();
  await page.getByLabel(/Source notes/).fill(article.notes);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByRole("button", { name: "Create article & build brief" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/articles/new/brief\\?articleId=${article.id}$`),
  );
});
