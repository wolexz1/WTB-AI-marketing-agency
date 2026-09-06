import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const guidePage = read("whatsapp-ai-guides/index.html");
const guideScript = read("assets/whatsapp-ai-guides/whatsapp-ai-guides.js");
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
  assert.equal((guidePage.match(/href="#choose"/g) || []).length, 1);
  assert.match(guidePage, /data-guide-sticky[\s\S]*?>[\s\S]*?href="#choose"[\s\S]*?>Choose guide<[\s\S]*?data-guide-share="native"[\s\S]*?data-share-location="sticky_bar"[\s\S]*?>[\s\S]*?Share with a business owner/);
  assert.match(guidePage, /href="#comparison">Compare guides<\/a>/);
  assert.match(guidePage, /<section class="comparison section-shell" id="comparison"/);

  for (const location of ["navigation", "pain_section", "calculator"]) {
    assert.match(
      guidePage,
      new RegExp(`data-guide-buy data-guide-product="growth-engine" data-cta-location="${location}"`),
      location,
    );
  }

  assert.match(guideScript, /\.hero-quick-actions" : "\.hero-actions"/);
  assert.match(guideScript, /document\.querySelectorAll\("#choose, \.final-cta, footer"\)/);
  assert.match(guideScript, /share\(button\.dataset\.guideShare, button\.dataset\.shareLocation\)/);
});
