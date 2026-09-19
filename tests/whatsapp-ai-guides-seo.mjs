import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const guidePage = read("whatsapp-ai-guides/index.html");
const homePage = read("index.html");
const guideScript = read("assets/whatsapp-ai-guides/whatsapp-ai-guides.js");
const guideStyles = read("assets/whatsapp-ai-guides/whatsapp-ai-guides.css");
const linkedArticles = [
  "blog/meta-business-ai-whatsapp-nigeria-2026/index.html",
  "blog/whatsapp-ai-chatbot-cost-nigeria-2026/index.html",
  "blog/whatsapp-ai-lead-generation-nigeria-2026/index.html",
  "blog/elevenlabs-whatsapp-ai-agent-nigeria-2026/index.html",
  "blog/how-to-automate-whatsapp-leads-nigeria-2026/index.html",
  "blog/why-nigerian-businesses-lose-whatsapp-leads-2026/index.html",
  "blog/why-nigerian-businesses-lose-leads-between-instagram-and-whatsapp-2026/index.html",
  "blog/first-ai-agent-your-business-should-build-2026/index.html",
  "blog/how-to-create-ai-agent-for-business-nigeria-2026/index.html",
  "blog/what-is-an-ai-agent-for-business-nigeria-2026/index.html",
];

test("guide page exposes complete index and social metadata", () => {
  assert.match(guidePage, /<meta name="robots" content="index, follow, max-image-preview:large">/);
  assert.match(guidePage, /<link rel="canonical" href="https:\/\/wtbaimarketing\.com\/whatsapp-ai-guides\/">/);
  assert.match(guidePage, /<meta property="og:site_name" content="WTB AI Marketing Agency">/);
  assert.match(guidePage, /<meta property="og:image:alt"/);
  assert.match(guidePage, /<meta name="twitter:title"/);
  assert.match(guidePage, /<meta name="twitter:image"/);
});

test("guide structured data identifies the page, breadcrumb, FAQs and two offers", () => {
  const json = guidePage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json, "JSON-LD must be present");
  const data = JSON.parse(json);
  const types = data["@graph"].flatMap((entry) => Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]]);
  assert.ok(types.includes("WebPage"));
  assert.ok(types.includes("BreadcrumbList"));
  assert.ok(types.includes("FAQPage"));
  const products = data["@graph"].filter((entry) => entry["@type"] === "Product");
  assert.equal(products.length, 2);
  assert.deepEqual(products.map((product) => product.offers.price), ["5500", "10500"]);
  for (const product of products) {
    assert.equal(product.offers.priceCurrency, "NGN");
    assert.equal(product.offers.availability, "https://schema.org/InStock");
    assert.equal(product.offers.itemCondition, "https://schema.org/NewCondition");
    assert.ok(product.sku);
  }
});

test("every relevant WhatsApp and AI-agent article links to the guide", () => {
  for (const article of linkedArticles) {
    const html = read(article);
    assert.match(html, /href="\.\.\/\.\.\/whatsapp-ai-guides\/"/, article);
    assert.match(html, /class="guide-cta"/, article);
  }
});

test("discovery files expose the canonical guide URL", () => {
  assert.match(read("robots.txt"), /Sitemap: https:\/\/wtbaimarketing\.com\/sitemap\.xml/);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/wtbaimarketing\.com\/whatsapp-ai-guides\/<\/loc>\s*<lastmod>2026-09-06<\/lastmod>/);
  assert.match(read("llms.txt"), /## WhatsApp AI Guides for Nigerian Businesses/);
  assert.match(read("markdown-mirror.md"), /## WhatsApp AI Guides for Nigerian Businesses/);
});

test("conversion actions use the compact sticky bar and direct checkout", () => {
  assert.doesNotMatch(guidePage, /class="share-section"/);
  assert.equal((guidePage.match(/href="#choose"/g) || []).length, 3);
  assert.match(guidePage, /data-guide-sticky[\s\S]*?data-guide-buy data-guide-product="launchpad" data-cta-location="sticky_bar"[\s\S]*?>Set up your AI assistant — ₦5,500<[\s\S]*?href="#choose"[\s\S]*?>Compare</);
  assert.match(guidePage, /This step-by-step guide shows you how to set up your WhatsApp AI assistant/);
  assert.match(guidePage, /class="assistant-overview" aria-label="How your WhatsApp AI assistant works"/);
  assert.match(guidePage, /Teach it your business[\s\S]*Let it assist customers[\s\S]*Stay in control/);
  assert.match(guidePage, /href="#comparison">Compare guides<\/a>/);
  assert.match(guidePage, /<section class="comparison section-shell" id="comparison"/);

  assert.match(guidePage, /data-guide-buy data-guide-product="launchpad" data-cta-location="navigation"/);
  assert.match(guidePage, /data-guide-buy data-guide-product="growth-engine" data-cta-location="pain_section"/);
  assert.doesNotMatch(guidePage, /data-guide-calculator/);

  assert.match(guideScript, /\.hero-quick-actions" : "\.hero-actions"/);
  assert.match(guideScript, /document\.querySelectorAll\("#choose, \.final-cta, footer"\)/);
  assert.match(guideScript, /trackFunnel\("cta_click"/);
  assert.match(guideScript, /trackFunnel\("paystack_opened"/);
  assert.match(guideScript, /trackFunnel\("checkout_initialized"/);
  assert.match(guideScript, /loadPaystack\(\)\.catch\(\(\) => \{\}\)/);
  assert.match(guideScript, /onLoad: \(\) => \{/);
  assert.match(guidePage, /id="checkoutFallback"/);
  assert.match(guideScript, /rootMargin: "180px 0px"/);
});

test("preview pages use a spaced, pausable continuous carousel", () => {
  assert.match(guidePage, /data-preview-toggle aria-pressed="false">Pause movement<\/button>/);
  assert.match(guidePage, /class="preview-track" data-preview-track aria-label="Guide page previews"/);
  assert.match(guideScript, /clone\.dataset\.carouselClone/);
  assert.match(guideScript, /previewTrack\.scrollLeft \+= elapsed \* 0\.024/);
  assert.match(guideScript, /firstClone\.offsetLeft - previewTrack\.firstElementChild\.offsetLeft/);
  assert.match(guideScript, /pointerdown", pauseTemporarily/);
  assert.match(guideScript, /focusin", pauseTemporarily/);
  assert.match(guideScript, /pausedByUser \? "Resume movement" : "Pause movement"/);
  assert.match(guideStyles, /\.preview-track\{display:flex;[^}]*gap:24px/);
  assert.match(guideStyles, /\.preview-track button\{flex:0 0 clamp\(252px,24vw,292px\)/);
  assert.match(guideStyles, /\.preview-track\{gap:20px;[^}]*padding:20px 2px 24px\}/);
});

test("homepage learning products present both guide paths with lightweight covers", () => {
  assert.match(homePage, /id="learningProductsTitle">Practical AI guides for work and home\./);
  assert.match(homePage, /href="ai-explorers\/">Explore AI Explorers<\/a>/);
  assert.match(homePage, /src="assets\/ai-explorers\/ai-explorers-cover-360\.webp"/);
  assert.match(homePage, /href="whatsapp-ai-guides\/">Explore the guides<\/a>/);
  assert.match(homePage, /src="assets\/whatsapp-ai-guides\/launchpad-cover-360\.webp"/);
  assert.match(homePage, /src="assets\/whatsapp-ai-guides\/growth-engine-cover-360\.webp"/);
  assert.doesNotMatch(homePage, /learning-product-entry[\s\S]{0,4000}ai-explorers-cover-ages-5-11\.png/);
});
