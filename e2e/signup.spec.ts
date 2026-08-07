import { expect, test } from "@playwright/test";

test("renders the responsive signup experience without overflow", async ({
  page,
}) => {
  await page.goto("/signup");

  await expect(
    page.getByRole("heading", {
      name: "Turn your ideas into articles worth reading.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});

test("validates signup details and toggles password visibility", async ({
  page,
}) => {
  await page.goto("/signup");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
});
