const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const baseUrl = process.env.AI_EXPLORERS_TEST_URL || "http://127.0.0.1:8765/ai-explorers/";
  const outputDir = path.resolve("test-artifacts/ai-explorers");
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.waitForFunction(() => document.documentElement.dataset.aiExplorersReady === "true");

    const pageText = await page.locator("body").innerText();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const transformationImage = page.locator("img[src*='parent-child-ai-transformation']");
    await transformationImage.scrollIntoViewIfNeeded();
    await transformationImage.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector("img[src*='parent-child-ai-transformation']");
      return image?.complete && image.naturalWidth > 0;
    });
    const imageReady = await transformationImage.evaluate((image) => image.complete && image.naturalWidth > 0);

    await page.locator("[data-ai-product='workbook']").first().click();
    await page.waitForSelector("[data-ai-checkout-dialog][open]");
    const workbookDialog = await page.locator("[data-ai-checkout-dialog]").innerText();
    await page.locator("[data-ai-checkout-dialog] .ai-explorers-dialog-close").click();

    await page.locator("[data-ai-product='complete']").first().click();
    await page.waitForSelector("[data-ai-checkout-dialog][open]");
    const familyDialog = await page.locator("[data-ai-checkout-dialog]").innerText();
    await page.locator("[data-ai-checkout-dialog] .ai-explorers-dialog-close").click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}.png`) });
    results.push({
      viewport: viewport.name,
      title: await page.title(),
      h1: await page.locator("h1").innerText(),
      noPageCountSalesCopy: !/37[- ]page|page count/i.test(pageText),
      pricesVisible: pageText.includes("N4,500") && pageText.includes("N7,500"),
      workbookCheckout: workbookDialog.includes("N4,500") && workbookDialog.includes("AI Explorers Workbook"),
      familyCheckout: familyDialog.includes("N7,500") && familyDialog.includes("AI Explorers Family Library"),
      imageReady,
      horizontalOverflow: dimensions.scrollWidth > dimensions.clientWidth + 2,
      errors,
    });
    await page.close();
  }

  await browser.close();
  const passed = results.every((result) =>
    result.noPageCountSalesCopy &&
    result.pricesVisible &&
    result.workbookCheckout &&
    result.familyCheckout &&
    result.imageReady &&
    !result.horizontalOverflow &&
    result.errors.length === 0
  );

  console.log(JSON.stringify({ passed, results }, null, 2));
  if (!passed) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
