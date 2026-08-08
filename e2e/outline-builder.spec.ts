import { expect, test } from "@playwright/test";

test("supports the responsive outline-building flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/articles/new/outline");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;

  await expect(
    page.getByRole("heading", { name: "Build your article’s structure" }),
  ).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Outline");

  if (isMobile) {
    await expect(page.getByText("5 sections")).toBeVisible();
    await expect(page.getByText("~1,060 words")).toBeVisible();
    await expect(
      page.getByText("Outline", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Outline health" }).click();
    await expect(
      page.getByRole("dialog", { name: "Outline health details" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close outline health" }).click();
  } else {
    await expect(page.getByText("1,060 words", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Outline health" }),
    ).toBeVisible();
  }

  const notes = page.getByRole("textbox", { name: /Notes/i });
  await notes.fill("Open with a concrete observation.");
  await page.getByRole("button", { name: "Start drafting" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your draft is ready to begin.",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("inkwell:article-outline"),
      ),
    )
    .not.toBeNull();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("carries brief content into the generated outline", async ({ page }) => {
  await page.goto("/articles/new/brief");
  const audience = page.getByLabel(/Target audience/);
  await audience.clear();
  await audience.fill("Product leaders and writers");
  await expect(audience).toHaveValue("Product leaders and writers");
  await page.getByRole("button", { name: "Generate outline" }).click();

  await expect(page).toHaveURL(/\/articles\/new\/outline$/);
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  if (isMobile) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const value = window.sessionStorage.getItem("inkwell:article-brief");
          return value ? JSON.parse(value).targetAudience : null;
        }),
      )
      .toBe("Product leaders and writers");
  } else {
    await expect(page.getByText("Product leaders and writers")).toBeVisible();
  }
});
