const { chromium } = require("playwright");

(async () => {
  const url = process.env.GUIDE_URL || "https://wtbaimarketing.com/whatsapp-ai-guides/";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const failures = [];
  const milestones = [];
  page.on("requestfailed", (request) => failures.push({ url: request.url(), reason: request.failure()?.errorText }));
  page.on("response", (response) => {
    if (/js\.paystack\.co|api\/whatsapp-ai-guides\/checkout/.test(response.url())) milestones.push({ part: response.url().includes("paystack.co") ? "paystack_script" : "checkout_api", ms: Date.now() - started, status: response.status() });
  });
  await page.route("https://connect.facebook.net/**", (route) => route.abort());
  await page.addInitScript(() => {
    window.__lastLcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lastLcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const started = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const domContentLoadedMs = Date.now() - started;
  await page.locator(".hero-visual .cover-two img").waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
  const beforeCheckout = await page.evaluate(() => ({
    lcpMs: Math.round(window.__lastLcp),
    fcpMs: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
    paystackScriptLoaded: Boolean(document.querySelector('script[src*="js.paystack.co/v2/inline.js"]')),
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    slowestResources: performance.getEntriesByType("resource").sort((a, b) => b.duration - a.duration).slice(0, 5).map((entry) => ({ name: entry.name.split("?")[0], durationMs: Math.round(entry.duration), size: entry.transferSize })),
  }));
  await page.locator('[data-guide-buy][data-cta-location="hero_quick"]').click();
  await page.locator('#checkoutForm input[name="firstName"]').fill("WTB QA");
  await page.locator('#checkoutForm input[name="email"]').fill(`wtb-qa-${Date.now()}@example.com`);
  const paymentStarted = Date.now();
  await page.locator("#checkoutSubmit").click();
  await Promise.race([
    page.locator("#checkoutDialog:not([open])").waitFor({ state: "attached", timeout: 30000 }),
    page.locator("#checkoutFallback").waitFor({ state: "visible", timeout: 30000 }),
  ]);
  const firstPaymentStateMs = Date.now() - paymentStarted;
  const fallbackShown = await page.locator("#checkoutFallback").isVisible();
  if (fallbackShown) await page.locator("#checkoutDialog:not([open])").waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
  const popupElapsedMs = Date.now() - paymentStarted;
  const result = {
    url,
    domContentLoadedMs,
    ...beforeCheckout,
    firstPaymentStateMs,
    popupElapsedMs,
    popupOpened: !(await page.locator("#checkoutDialog").evaluate((dialog) => dialog.open)),
    fallbackShown,
    fallbackVisible: await page.locator("#checkoutFallback").isVisible(),
    status: await page.locator("#checkoutStatus").innerText(),
    milestones,
    failures: failures.filter((failure) => !failure.url.includes("connect.facebook.net")),
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
