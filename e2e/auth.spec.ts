import { expect, test } from "@playwright/test";

for (const [path, encoded] of [
  ["/onboarding", "%2Fonboarding"],
  ["/dashboard", "%2Fdashboard"],
  ["/articles/new?mode=notes", "%2Farticles%2Fnew%3Fmode%3Dnotes"],
] as const) {
  test(`redirects unauthenticated access to ${path}`, async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encoded}$`));
  });
}

test("preserves the session during an authentication outage", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "inkwell_access_token",
      value: "inkwell-e2e-unavailable-session",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/unavailable\?next=%2Fdashboard$/);
  await expect(
    page.getByRole("heading", {
      name: "We can't verify your session right now",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});
