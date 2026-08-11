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
  await expect(page.getByRole("checkbox")).toHaveCount(0);

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

  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toHaveAttribute("href", "/signup");
});

test("signs in and follows a protected return path", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "writer@example.com",
      password: "thoughtful-password",
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Set-Cookie":
          "inkwell_access_token=inkwell-e2e-authenticated-session; Path=/; HttpOnly; SameSite=Lax",
      },
      body: JSON.stringify({ user: { username: "writer_01" } }),
    });
  });
  await page.goto("/login?next=/articles/new?mode=notes");
  await page.getByLabel("Email address").fill("writer@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/articles\/new\?mode=notes$/);
});

test("shows invalid credentials and rate-limit feedback", async ({ page }) => {
  let attempt = 0;
  await page.route("**/api/auth/login", async (route) => {
    attempt += 1;
    await route.fulfill({
      status: attempt === 1 ? 401 : 429,
      contentType: "application/json",
      headers: attempt === 1 ? {} : { "Retry-After": "742" },
      body: JSON.stringify({
        error: {
          code:
            attempt === 1 ? "invalid_credentials" : "too_many_login_attempts",
          message: "Backend authentication error",
        },
      }),
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("writer@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("thoughtful-password");
  await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(
    "Invalid email or password.",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(
    "Too many login attempts. Try again in 742 seconds.",
  );
});
