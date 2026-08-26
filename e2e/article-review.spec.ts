import { expect, test } from "@playwright/test";

test("reviews, persists, and navigates the responsive article", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/articles/new/review");
  await expect(
    page.getByRole("heading", { name: "Abrupt transition" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Article progress" }),
  ).toContainText("Review");

  await page.getByRole("button", { name: "Accept suggestion" }).click();
  await expect(page.getByRole("status")).toContainText("Suggestion applied");

  await page.reload();
  await expect(
    page.getByText(/that’s what makes capturing them so difficult/).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Review summary/ }).click();
  await expect(
    page.getByRole("heading", { name: "Almost ready to publish" }),
  ).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);

  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.getByLabel("Back to draft")).toBeVisible();
  }

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("captures the review triage reference state", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile-chromium";
  await page.setViewportSize(
    mobile ? { width: 426, height: 923 } : { width: 1487, height: 1058 },
  );
  await page.goto("/articles/new/review");
  await expect(
    page.getByRole("heading", { name: "Abrupt transition" }),
  ).toBeVisible();
  await page.screenshot({
    path: mobile
      ? "design-reference/review-implementation-mobile.png"
      : "design-reference/review-implementation-desktop.png",
    fullPage: false,
  });

  if (!mobile) {
    await page.getByRole("button", { name: /Review summary/ }).click();
    await expect(
      page.getByRole("heading", { name: "Almost ready to publish" }),
    ).toBeVisible();
    await page.screenshot({
      path: "design-reference/review-summary-implementation-desktop.png",
      fullPage: false,
    });

    await page.goto("/articles/new/draft");
    await expect(
      page.getByRole("navigation", { name: "Article progress" }),
    ).toBeVisible();
    await page.screenshot({
      path: "design-reference/draft-with-progress-desktop.png",
      fullPage: false,
    });
  }
});
