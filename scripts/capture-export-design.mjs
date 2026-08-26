import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();

const targets = [
  {
    path: "design-reference/export-implementation-desktop.png",
    viewport: { width: 1487, height: 1058 },
  },
  {
    path: "design-reference/export-implementation-mobile.png",
    viewport: { width: 426, height: 922 },
  },
];

for (const target of targets) {
  const page = await browser.newPage({ viewport: target.viewport });
  await page.goto(`${baseUrl}/articles/new/export`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page
    .getByRole("heading", { name: "Export your article" })
    .waitFor({ state: "visible" });
  await page.screenshot({ path: target.path });
  await page.close();
}

await browser.close();
