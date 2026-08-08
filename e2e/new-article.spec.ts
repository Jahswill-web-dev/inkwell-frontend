import { expect, test } from "@playwright/test";

test("supports the responsive new-article flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/articles/new");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;

  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab", { name: /Template/ })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "What would you like to write about?" }),
  ).toBeVisible();

  if (isMobile) {
    await expect(
      page.getByText("New article", { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to dashboard" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeVisible();
  }

  const idea = page.getByRole("textbox", { name: "Your article idea" });
  await idea.fill("A thoughtful idea that should survive tab changes.");
  await page
    .getByRole("tab", { name: isMobile ? "Notes" : /Paste your notes/ })
    .click();
  const notes = page.getByRole("textbox", { name: "Your notes" });
  await notes.fill("These are useful notes for a future article brief.");
  await expect(page.getByText("9 words")).toBeVisible();
  await page
    .getByRole("tab", { name: isMobile ? "Idea" : /Start with an idea/ })
    .click();
  await expect(idea).toHaveValue(
    "A thoughtful idea that should survive tab changes.",
  );

  if (isMobile) {
    await page.getByRole("button", { name: "Save", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Save as draft" }).click();
  }
  await expect(page.getByRole("status")).toContainText("Draft saved.");

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("opens notes mode from the dashboard shortcut", async ({ page }) => {
  await page.goto("/articles/new?mode=notes");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  await expect(
    page.getByRole("tab", { name: isMobile ? "Notes" : /Paste your notes/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", {
      name: "Turn your notes into a clear article.",
    }),
  ).toBeVisible();
});
