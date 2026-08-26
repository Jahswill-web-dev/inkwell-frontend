import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;
const e2eAuthToken = "inkwell-e2e-authenticated-session";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3100",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "on-first-retry",
    storageState: {
      cookies: [
        {
          name: "inkwell_access_token",
          value: e2eAuthToken,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "node node_modules/next/dist/bin/next dev -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          E2E_AUTH_BYPASS_TOKEN: e2eAuthToken,
          E2E_AUTH_UNAVAILABLE_TOKEN: "inkwell-e2e-unavailable-session",
          NEXT_DIST_DIR: ".next-e2e",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
