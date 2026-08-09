import { expect, test } from "@playwright/test";

test("edits, autosaves, previews, and prepares the responsive draft", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/articles/new/draft");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;

  await expect(
    page
      .getByText("Why Great Ideas Are Hard to Write Down", { exact: true })
      .first(),
  ).toBeVisible();
  const introduction = page.getByRole("textbox", {
    name: "Introduction draft content",
  });
  await expect(introduction).toBeVisible();
  await introduction.click();
  await introduction.press("End");
  await introduction.pressSequentially(" A durable note.");

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("inkwell:article-draft"),
      ),
    )
    .not.toBeNull();

  if (isMobile) {
    await expect(
      page.getByRole("region", { name: "assistant tools" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Format" }).click();
    await expect(
      page.getByRole("toolbar", { name: "Text formatting" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Assistant" }).click();
  } else {
    await expect(
      page.getByRole("complementary", { name: "Draft outline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Writing assistant" }),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: /Make clearer/ }).click();
  await expect(page.getByText("Suggested revision")).toBeVisible();
  await page.getByRole("button", { name: "Reject" }).click();

  if (isMobile) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: /Preview article/ }).click();
  } else {
    await page.getByRole("button", { name: "Preview" }).click();
  }
  await expect(
    page.getByRole("dialog", { name: "Article preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back to editor/ }).click();

  if (isMobile) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: /Mark ready for review/ }).click();
  } else {
    await page.getByRole("button", { name: "Review article" }).click();
  }
  await expect(page.getByRole("status").last()).toContainText(
    "Draft saved and ready for review.",
  );

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("restores saved content and exposes offline recovery status", async ({
  page,
}) => {
  await page.goto("/articles/new/draft");
  const editor = page.getByRole("textbox", {
    name: "Introduction draft content",
  });
  await editor.fill("A restored draft paragraph.");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("inkwell:article-draft"),
      ),
    )
    .not.toBeNull();

  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Introduction draft content" }),
  ).toContainText("A restored draft paragraph.");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    window.dispatchEvent(new Event("offline"));
  });

  const isMobile = (page.viewportSize()?.width ?? 0) <= 800;
  if (isMobile) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByText(/Offline/)).toBeVisible();
  } else {
    await expect(page.getByRole("status").first()).toContainText("Offline");
  }
});
