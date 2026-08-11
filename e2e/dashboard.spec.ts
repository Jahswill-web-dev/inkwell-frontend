import { expect, test } from "@playwright/test";

test("renders the responsive dashboard without browser errors or overflow", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good morning, writer_01." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Create new article/ }),
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

test("supports search and primary dashboard actions", async ({ page }) => {
  await page.goto("/dashboard");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  if (!isMobile) {
    await page.getByRole("searchbox").fill("Intentional");
    await expect(
      page.getByText("The Power of Intentional Thinking"),
    ).toBeVisible();
    await expect(page.getByText("Designing a Life of Meaning")).toHaveCount(0);
  }
  await page.getByRole("link", { name: /Create new article/ }).click();
  await expect(page).toHaveURL(/\/articles\/new$/);
  await expect(
    page.getByRole("heading", { name: "What would you like to write about?" }),
  ).toBeVisible();
});

test("signs out from the authenticated profile menu", async ({ page }) => {
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
