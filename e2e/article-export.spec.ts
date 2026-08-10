import { expect, test } from "@playwright/test";

test("exports an article on desktop without horizontal overflow", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/articles/new/export");
  await expect(
    page.getByRole("heading", { name: "Export your article" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /PDF/ })).toBeDisabled();
  await page.getByRole("radio", { name: /Markdown/ }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export article" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/u);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(browserErrors).toEqual([]);
});

test("uses the compact export layout on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile project only");
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/articles/new/export");
  await expect(page.getByText("Export", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Article progress" }),
  ).toBeHidden();
  const disclosure = page.getByRole("button", { name: /Include in export/ });
  await disclosure.click();
  await expect(page.getByRole("checkbox", { name: "Title" })).toBeHidden();
  await disclosure.click();
  await expect(page.getByRole("checkbox", { name: "Title" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(browserErrors).toEqual([]);
});
