import { expect, test } from "@playwright/test";

test("renders the product promise and route destinations", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /talk through your ideas. turn them into articles that sound like you/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start an article" }).first(),
  ).toHaveAttribute("href", "/signup?experience=consultant");
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toHaveAttribute("href", "/login?next=%2Fconsultant");
  await expect(page.getByRole("heading", { name: "Refine every word." })).toBeVisible();
});

test("navigates to the writing workflow", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop navigation is hidden on mobile.");
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "How it works" })
    .click();

  await expect(page.locator("#how-it-works")).toBeInViewport();
});

test("opens and closes the accessible mobile navigation", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile navigation is only present at narrow widths.");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });

  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    mobileNavigation.getByRole("link", { name: "How it works" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("shows the consultant workflow without horizontal overflow", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  await expect(
    page.locator('section[aria-labelledby="landing-title"] img[src*="voice-orb"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Ready when you are." })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);

  if (isMobile) {
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
  }

  await page.screenshot({
    path: isMobile
      ? "test-results/consultant-landing-mobile.png"
      : "test-results/consultant-landing-desktop-full.png",
    fullPage: true,
  });
});
