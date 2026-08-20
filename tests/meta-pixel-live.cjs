const { chromium } = require("playwright");

(async () => {
  const url = process.env.META_PIXEL_TEST_URL || "https://wtbaimarketing.com/ai-explorers/";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const metaRequests = [];
  const metaResponses = [];
  const consoleMessages = [];

  page.on("request", (request) => {
    if (/facebook|fbevents|zaraz/i.test(request.url())) metaRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (/facebook|fbevents/i.test(response.url())) {
      metaResponses.push({ url: response.url(), status: response.status() });
    }
  });
  page.on("console", (message) => {
    const text = message.text();
    if (/content security policy|facebook|fbevents|zaraz/i.test(text)) consoleMessages.push(text);
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const state = await page.evaluate(() => ({
    fbq: typeof window.fbq,
    fbqCallMethod: typeof window.fbq?.callMethod,
    fbqQueueLength: Array.isArray(window.fbq?.queue) ? window.fbq.queue.length : null,
    zaraz: typeof window.zaraz,
    pixelScript: Boolean(document.querySelector("script[src*='connect.facebook.net']")),
    pixelImage: Boolean(document.querySelector("img[src*='facebook.com/tr']")),
  }));
  await browser.close();

  const facebookRequests = metaRequests.filter((request) => /facebook|fbevents/i.test(request));
  const passed = state.fbq === "function" && facebookRequests.some((request) => /facebook\.com\/tr|fbevents\.js/i.test(request));
  console.log(JSON.stringify({
    passed,
    url,
    state,
    facebookRequests,
    facebookResponses: metaResponses,
    zarazRequestCount: metaRequests.filter((request) => /zaraz/i.test(request)).length,
    cspMessages: consoleMessages.filter((message) => /content security policy/i.test(message)).slice(0, 5),
    metaMessages: consoleMessages.filter((message) => /facebook|fbevents/i.test(message)).slice(0, 5),
  }, null, 2));
  if (!passed) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
