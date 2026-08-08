import { expect, test } from "@playwright/test";

test("renders and edits the responsive guided brief", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/articles/new/brief");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;

  await expect(
    page.getByRole("heading", { name: "Shape your article brief" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Article progress" }),
  ).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Brief");
  await expect(page.getByLabel(/Main topic/)).toHaveValue(/great ideas/);

  await page.getByText("Long", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Long/ })).toBeChecked();

  if (isMobile) {
    await page.getByText("Examples to include").click();
    await expect(page.getByLabel(/Examples or experiences/)).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
  } else {
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Examples or experiences/)).toBeVisible();
    await page.getByRole("button", { name: "Save as draft" }).click();
  }

  await expect(page.getByRole("status")).toContainText("Article brief saved.");
  await page.getByRole("button", { name: "Generate outline" }).click();
  await expect(page.getByRole("status")).toContainText("Outline generated.");

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("carries new-article content into the brief", async ({ page }) => {
  await page.goto("/articles/new");
  await page
    .getByRole("textbox", { name: "Your article idea" })
    .fill("A specific idea about building a sustainable creative practice.");
  await page
    .getByRole("textbox", { name: /Working title/ })
    .fill("A Sustainable Creative Practice");

  await page.getByRole("button", { name: "Build my article brief" }).click();

  await expect(page).toHaveURL(/\/articles\/new\/brief$/);
  await expect(
    page
      .locator("strong")
      .filter({ hasText: "A Sustainable Creative Practice" }),
  ).toBeVisible();
  await expect(page.getByLabel(/Main topic/)).toHaveValue(
    "A specific idea about building a sustainable creative practice.",
  );
});
