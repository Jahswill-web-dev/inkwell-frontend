import { expect, test } from "@playwright/test";

test("renders the product promise and route destinations", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /turn your idea into a publish-ready article/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start writing free" }).first(),
  ).toHaveAttribute("href", "/signup");
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toHaveAttribute("href", "/login");
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

test("uses responsive product artwork without horizontal overflow", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  const visibleHeroImages = await page
    .getByAltText(/Inkwell editor helping a writer/i)
    .evaluateAll(
      (images) =>
        images.filter((image) => (image as HTMLElement).offsetParent !== null)
          .length,
    );
  expect(visibleHeroImages).toBe(1);

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);

  if (isMobile) {
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
  }
});
