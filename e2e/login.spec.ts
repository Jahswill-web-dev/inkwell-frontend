import { expect, test } from "@playwright/test";

test("renders the responsive login experience without overflow", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      const { url } = message.location();
      consoleErrors.push(`${message.text()} ${url}`.trim());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login");

  await expect(
    page.getByRole("heading", {
      name: "Turn your ideas into articles worth reading.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Remember me" }),
  ).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("validates login details and supports its controls", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();

  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );

  const rememberMe = page.getByRole("checkbox", { name: "Remember me" });
  await rememberMe.check();
  await expect(rememberMe).toBeChecked();

  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toHaveAttribute("href", "/signup");
});
