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
  await expect(page.getByLabel("Username")).toBeVisible();
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
  await expect(
    page.getByText("Use 3-30 lowercase letters, numbers, or underscores only."),
  ).toBeVisible();
  await expect(
    page.getByText("Use between 8 and 128 characters."),
  ).toBeVisible();

  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
});

test("registers through the same-origin endpoint and opens onboarding", async ({
  page,
}) => {
  await page.route("**/api/auth/register", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "writer@example.com",
      username: "writer_01",
      password: "thoughtful-password",
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
          email: "writer@example.com",
          username: "writer_01",
          created_at: "2026-08-11T12:00:00Z",
          updated_at: "2026-08-11T12:00:00Z",
        },
      }),
    });
  });
  await page.goto("/signup");

  await page.getByLabel("Email address").fill(" Writer@Example.com ");
  await page.getByLabel("Username").fill("writer_01");
  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
});

test("shows duplicate username errors returned by registration", async ({
  page,
}) => {
  await page.route("**/api/auth/register", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "username_taken",
          message: "This username is already taken",
        },
      }),
    });
  });
  await page.goto("/signup");

  await page.getByLabel("Email address").fill("writer@example.com");
  await page.getByLabel("Username").fill("writer_01");
  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("This username is already taken.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeEnabled();
});
