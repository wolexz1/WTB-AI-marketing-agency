const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const baseUrl = process.env.WHATSAPP_AI_GUIDES_TEST_URL || "http://127.0.0.1:8765/whatsapp-ai-guides/";
  const outputDir = path.resolve("test-artifacts/whatsapp-ai-guides");
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile-430", width: 430, height: 900 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-360", width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__paystackResumes = [];
      window.PaystackPop = class {
        resumeTransaction(accessCode) { window.__paystackResumes.push(accessCode); }
      };
    });
    await page.route("https://connect.facebook.net/**", (route) => route.abort());
    await page.route("**/api/whatsapp-ai-guides/checkout", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessCode: "ui_test_access", reference: "wtbwa_ui_test" }) }));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "attached" });
    const floatingStart = await page.locator(".cover-one").evaluate((cover) => getComputedStyle(cover).transform);
    await page.waitForTimeout(320);
    const floatingEnd = await page.locator(".cover-one").evaluate((cover) => getComputedStyle(cover).transform);
    const text = await page.locator("body").innerText();
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > document.documentElement.clientWidth + 2 || rect.left < -2; }).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right), left: Math.round(element.getBoundingClientRect().left) })) }));
    const launchpadButtons = await page.locator("[data-guide-buy][data-guide-product='launchpad']").count();
    const growthButtons = await page.locator("[data-guide-buy][data-guide-product='growth-engine']").count();
    const removedNoticeCount = await page.locator(".eligibility-note").count();
    await page.locator("[data-guide-buy][data-guide-product='growth-engine']").first().click();
    const checkoutText = await page.locator("#checkoutDialog").innerText();
    const checkoutSpacing = await page.locator("#checkoutForm").evaluate((form) => {
      const labels = [...form.querySelectorAll("label")].map((label) => label.getBoundingClientRect());
      const button = form.querySelector("button[type='submit']").getBoundingClientRect();
      return labels.length === 2 && labels[1].top - labels[0].bottom >= 16 && button.top - labels[1].bottom >= 16;
    });
    const buttonFit = await page.locator(".button").evaluateAll((buttons) => buttons.every((button) => button.scrollWidth <= button.clientWidth + 2 && button.scrollHeight <= button.clientHeight + 2));
    await page.locator("#checkoutForm input[name='firstName']").fill("Wole");
    await page.locator("#checkoutForm input[name='email']").fill("buyer@example.com");
    await page.locator("#checkoutSubmit").click();
    await page.waitForFunction(() => window.__paystackResumes.length === 1);
    const popupStaysOnPage = await page.evaluate(() => window.__paystackResumes[0] === "ui_test_access" && location.pathname === "/whatsapp-ai-guides/" && !document.querySelector("#checkoutDialog").open);
    await page.locator("[data-guide-preview]").first().click();
    const previewOpen = await page.locator("#previewDialog").getAttribute("open") !== null;
    await page.locator("#previewDialog .dialog-close").click();
    const semantics = await page.evaluate(() => ({
      h1Count: document.querySelectorAll("h1").length,
      imagesHaveAlt: [...document.images].every((image) => image.hasAttribute("alt")),
      formControlsNamed: [...document.querySelectorAll("input, button")].every((control) => {
        if (control.type === "hidden") return true;
        return Boolean(control.getAttribute("aria-label") || control.closest("label") || control.textContent.trim());
      }),
      checkoutAction: document.querySelector("#checkoutForm")?.getAttribute("action"),
      canonical: document.querySelector("link[rel='canonical']")?.href,
    }));
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      const step = Math.max(320, Math.floor(window.innerHeight * 0.72));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    await page.waitForTimeout(200);
    const navAtTop = await page.locator(".nav-dock").evaluate((nav) => Math.round(nav.getBoundingClientRect().top));
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-top.png`) });
    await page.locator("#choose").scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    const navWhileScrolled = await page.locator(".nav-dock").evaluate((nav) => Math.round(nav.getBoundingClientRect().top));
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-choice.png`) });
    await page.locator(".faq").scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-faq.png`) });
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-footer.png`) });
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}.png`), fullPage: true });
    results.push({
      viewport: viewport.name,
      title: await page.title(),
      h1: await page.locator("h1").innerText(),
      exactPrices: text.includes("₦5,500") && text.includes("₦10,500"),
      approvedProducts: await page.locator(".product-name").evaluateAll((labels) => {
        const names = labels.map((label) => label.textContent.trim());
        return names.includes("WhatsApp AI Launchpad") && names.includes("WhatsApp AI Growth Engine");
      }),
      noNormalNavigation: !text.includes("About Us") && !text.includes("Pricing"),
      sufficientCtas: launchpadButtons >= 4 && growthButtons >= 4,
      paymentNoticeRemoved: removedNoticeCount === 0,
      checkoutCorrect: checkoutText.includes("WhatsApp AI Growth Engine") && checkoutText.includes("₦10,500") && checkoutText.includes("Build a repeatable WhatsApp sales and service system") && checkoutText.includes("without leaving this page") && !checkoutText.includes("access varies by account and market"),
      checkoutSpacing,
      popupStaysOnPage,
      previewOpen,
      buttonFit,
      booksFloat: floatingStart !== floatingEnd,
      navSticks: navAtTop >= 0 && Math.abs(navWhileScrolled) <= 1,
      semantics,
      horizontalOverflow: dimensions.scroll > dimensions.client + 2,
      overflowOffenders: dimensions.offenders,
      errors,
    });
    await context.close();
  }
  await browser.close();
  const passed = results.every((r) => r.exactPrices && r.approvedProducts && r.noNormalNavigation && r.sufficientCtas && r.paymentNoticeRemoved && r.checkoutCorrect && r.checkoutSpacing && r.popupStaysOnPage && r.previewOpen && r.buttonFit && r.booksFloat && r.navSticks && !r.horizontalOverflow && r.errors.length === 0 && r.semantics.h1Count === 1 && r.semantics.imagesHaveAlt && r.semantics.formControlsNamed && r.semantics.checkoutAction === "/api/whatsapp-ai-guides/checkout" && r.semantics.canonical === "https://wtbaimarketing.com/whatsapp-ai-guides/");
  console.log(JSON.stringify({ passed, results }, null, 2));
  if (!passed) process.exit(1);
})().catch((error) => { console.error(error); process.exit(1); });
