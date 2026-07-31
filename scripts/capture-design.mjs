import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome" });

const targets = [
  {
    path: "design-reference/implementation-desktop.png",
    viewport: { width: 1440, height: 1024 },
  },
  {
    path: "design-reference/implementation-mobile.png",
    viewport: { width: 390, height: 844 },
  },
];

for (const target of targets) {
  const page = await browser.newPage({ viewport: target.viewport });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#features").waitFor();

  const visibleImages = page.locator("img:visible");
  for (let index = 0; index < (await visibleImages.count()); index += 1) {
    const image = visibleImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    const handle = await image.elementHandle();
    await page.waitForFunction(
      (element) => element?.complete && element.naturalWidth > 0,
      handle,
    );
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: target.path, fullPage: true });
  await page.close();
}

await browser.close();
