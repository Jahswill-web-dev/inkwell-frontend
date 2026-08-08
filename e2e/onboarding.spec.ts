import { expect, test } from "@playwright/test";

test("shows only writing goals without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "What do you want to write?" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(6);
  await expect(
    page.getByRole("navigation", { name: "Onboarding progress" }),
  ).toHaveCount(0);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});

test("validates goals and continues to the dashboard", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByText("Blog posts", { exact: true }).click();
  await page.getByText("Educational articles", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("Choose at least one writing goal to continue."),
  ).toBeVisible();
  await page.getByText("Blog posts", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("skip opens the dashboard and desktop back returns to signup", async ({
  page,
}) => {
  await page.goto("/onboarding");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  const back = page.locator('a[href="/signup"]');
  if (isMobile) await expect(back).toBeHidden();
  else await expect(back).toBeVisible();
  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
