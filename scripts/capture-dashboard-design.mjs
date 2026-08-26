import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch();
const targets = [
  {
    path: "design-reference/dashboard-implementation-desktop.png",
    viewport: { width: 1486, height: 1059 },
    deviceScaleFactor: 1,
  },
  {
    path: "design-reference/dashboard-implementation-mobile.png",
    viewport: { width: 427, height: 922 },
    clip: { x: 0, y: 0, width: 426.5, height: 922 },
    deviceScaleFactor: 2,
  },
];

for (const target of targets) {
  const page = await browser.newPage({
    viewport: target.viewport,
    deviceScaleFactor: target.deviceScaleFactor,
  });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Good morning, Nina." }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: target.path, clip: target.clip });
  await page.close();
}
await browser.close();
