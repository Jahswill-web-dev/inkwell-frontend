import { expect, test } from "@playwright/test";

const firstArticle = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Notes",
  working_title: "The Power of Intentional Thinking",
  target_audience: ["Writers"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

const secondArticle = {
  ...firstArticle,
  id: "36dc2b27-f474-4d43-b8cc-c122ef782cd6",
  working_title: "A Practical Editorial System",
  target_audience: ["Agency teams"],
};

test("renders the responsive agency dashboard without browser errors or overflow", async ({
  page,
}) => {
  await page.route("**/api/articles?**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, offset: 0, limit: 20 }),
    }),
  );
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Keep every client article moving." }),
  ).toBeVisible();
  await expect(page.getByLabel("Workspace summary")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Create article/ }).first(),
  ).toBeVisible();
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  if (isMobile) {
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open writer_01 profile menu" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeVisible();
  }
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("searches and filters the agency article pipeline", async ({ page }) => {
  await page.route("**/api/articles?**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [firstArticle, secondArticle],
        total: 2,
        offset: 0,
        limit: 20,
      }),
    }),
  );
  await page.goto("/dashboard");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  const workspace = page.getByRole("region", { name: "Article workspace" });
  const visibleArticle = (title: string) =>
    workspace.locator("a:visible").filter({ hasText: title }).first();

  await page.getByRole("searchbox").fill("Field Notes");
  await expect(visibleArticle("A Practical Editorial System")).toBeVisible();
  await expect(
    workspace.getByText("The Power of Intentional Thinking"),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("");

  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
  }
  await page
    .getByRole("combobox", { name: "Client" })
    .selectOption("Northstar Labs");
  await page
    .getByRole("combobox", { name: "Status" })
    .selectOption("waiting_for_client");
  await expect(
    visibleArticle("The Power of Intentional Thinking"),
  ).toBeVisible();
  await expect(workspace.getByText("A Practical Editorial System")).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(visibleArticle("A Practical Editorial System")).toBeVisible();
});

test("keeps the existing primary dashboard actions", async ({ page }) => {
  await page.route("**/api/articles?**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [firstArticle],
        total: 1,
        offset: 0,
        limit: 20,
      }),
    }),
  );
  await page.goto("/dashboard");

  await page.getByRole("link", { name: /Create article/ }).click();
  await expect(page).toHaveURL(/\/articles\/new$/);
  await expect(
    page.getByRole("heading", {
      name: "Create a client article",
    }),
  ).toBeVisible();
});

test("signs out from the authenticated profile menu", async ({ page }) => {
  await page.route("**/api/articles?**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, offset: 0, limit: 20 }),
    }),
  );
  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      status: 204,
      headers: {
        "Set-Cookie":
          "inkwell_access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
      },
    });
  });
  await page.goto("/dashboard");

  await page
    .getByRole("button", { name: "Open writer_01 profile menu" })
    .last()
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/);
});
