# WTB WhatsApp AI Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a premium mobile-first `/whatsapp-ai-guides/` sales page with fast Paystack redirect checkout, server-verified payment, private product delivery, purchase email and deduplicated Meta tracking.

**Architecture:** Add a route-scoped static experience and a dedicated Cloudflare Function namespace to the existing WTB Pages project. Keep the current AI Explorers implementation intact; extend the shared Paystack webhook only with an explicit WhatsApp-guide reference dispatch. Store orders in a dedicated KV binding and both PDFs under dedicated keys in the existing private R2 bucket.

**Tech Stack:** Static HTML, route-scoped CSS, vanilla JavaScript, Cloudflare Pages Functions, KV, R2, Paystack REST API, Resend API, Meta Pixel and Conversions API, Node test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-whatsapp-ai-guides-design.md`

## Global Constraints

- Product IDs are exactly `launchpad` and `growth-engine`.
- Prices are exactly NGN 5,500 (`550000` kobo) and NGN 10,500 (`1050000` kobo).
- Paid PDFs never enter the public repository or website asset tree.
- The browser never supplies or controls a Paystack amount.
- Purchase is recorded only after server verification of status, amount, currency, product and reference.
- Existing AI Explorers checkout, delivery and tracking behavior must remain unchanged.
- No framework, Paystack browser SDK, animation library, loading splash screen or autoplay video.
- No fake testimonials, scarcity, ratings, endorsements, guarantees or customer counts.
- Use only the approved files listed in `whatsapp-business-agent-pdf/landing-page/WTB-WhatsApp-AI-Landing-Page-Builder-Brief.md`.
- Initial transfer before interaction targets at most 500 KB; no below-fold full-size previews load initially.
- All new UI must work without horizontal overflow at 360, 390, 430, 768 and desktop widths.

---

### Task 1: Product Contract And Private-Fulfilment Tests

**Files:**
- Create: `functions/api/whatsapp-ai-guides/product-config.js`
- Create: `tests/whatsapp-ai-guides-flow.mjs`

**Interfaces:**
- Produces: `PRODUCTS`, `PRODUCT_CURRENCY`, `ASSETS`, `ORDER_PREFIX`, `REFERENCE_PATTERN` and `productForId(id)`.
- `PRODUCTS.launchpad` has amount `550000` and asset `launchpad`.
- `PRODUCTS["growth-engine"]` has amount `1050000` and asset `growth-engine`.
- `ASSETS` maps to private keys `whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf` and `whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf`.

- [ ] **Step 1: Write the failing product-contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, ASSETS, PRODUCT_CURRENCY, productForId } from "../functions/api/whatsapp-ai-guides/product-config.js";

test("product map fixes trusted amounts and private assets", () => {
  assert.equal(PRODUCT_CURRENCY, "NGN");
  assert.equal(PRODUCTS.launchpad.amount, 550000);
  assert.equal(PRODUCTS["growth-engine"].amount, 1050000);
  assert.equal(ASSETS.launchpad.key, "whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf");
  assert.equal(ASSETS["growth-engine"].key, "whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf");
  assert.equal(productForId("unknown"), null);
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: FAIL because `product-config.js` does not exist.

- [ ] **Step 3: Implement the immutable product contract**

```js
export const PRODUCT_CURRENCY = "NGN";
export const ORDER_PREFIX = "whatsapp-ai-guides:order:";
export const RATE_PREFIX = "whatsapp-ai-guides:rate:";
export const REFERENCE_PATTERN = /^wtbwa_[A-Za-z0-9]+$/;

export const PRODUCTS = Object.freeze({
  launchpad: Object.freeze({ id: "launchpad", name: "WhatsApp AI Launchpad", amount: 550000, asset: "launchpad" }),
  "growth-engine": Object.freeze({ id: "growth-engine", name: "WhatsApp AI Growth Engine", amount: 1050000, asset: "growth-engine" }),
});

export const ASSETS = Object.freeze({
  launchpad: Object.freeze({ key: "whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf", filename: "WTB-WhatsApp-AI-Launchpad.pdf" }),
  "growth-engine": Object.freeze({ key: "whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf", filename: "WTB-WhatsApp-AI-Growth-Engine.pdf" }),
});

export function productForId(id) { return PRODUCTS[id] || null; }
```

- [ ] **Step 4: Run the product-contract test**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add functions/api/whatsapp-ai-guides/product-config.js tests/whatsapp-ai-guides-flow.mjs
git commit -m "Add WhatsApp AI guide product contract"
```

---

### Task 2: Checkout, Verification And Protected Download API

**Files:**
- Create: `functions/api/whatsapp-ai-guides/[[path]].js`
- Modify: `tests/whatsapp-ai-guides-flow.mjs`

**Interfaces:**
- Consumes: `productForId`, `ASSETS`, `PRODUCT_CURRENCY`, `ORDER_PREFIX`, `RATE_PREFIX`, `REFERENCE_PATTERN`.
- Produces endpoints `POST /api/whatsapp-ai-guides/checkout`, `GET /api/whatsapp-ai-guides/verify` and `GET /api/whatsapp-ai-guides/download`.
- Order fields: `reference`, `productId`, `amount`, `currency`, `email`, `ctaLocation`, `status`, `createdAt`, `verifiedAt`, `emailSentAt`, `purchaseEventSentAt`, `downloads`, `tracking`.

- [ ] **Step 1: Add failing API tests with mocked KV, R2 and Paystack fetch**

```js
test("checkout ignores a browser amount and initializes the fixed product amount", async () => {
  const request = new Request("https://example.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "CF-Connecting-IP": "127.0.0.1" },
    body: new URLSearchParams({ email: "buyer@example.com", product: "launchpad", amount: "1", ctaLocation: "hero" }),
  });
  const response = await onRequest({ request, env: testEnv() });
  assert.equal(response.status, 302);
  assert.equal(paystackInitializeBody.amount, "550000");
});

test("verification rejects a successful transaction with the wrong amount", async () => {
  paystackVerifyResult.data.amount = 1;
  const response = await onRequest({ request: verifyRequest(reference), env: testEnv() });
  assert.equal((await response.json()).verified, false);
});

test("download cannot cross product boundaries", async () => {
  const token = await signedToken({ reference: launchpadReference, asset: "growth-engine" });
  const response = await onRequest({ request: downloadRequest(token), env: testEnv() });
  assert.equal(response.status, 403);
});
```

- [ ] **Step 2: Run the API tests and verify they fail**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: FAIL because the route handler is missing.

- [ ] **Step 3: Implement checkout initialization**

Implement `initializeCheckout(request, env)` to:

```js
const form = await request.formData();
const email = cleanEmail(form.get("email"));
const product = productForId(cleanText(form.get("product"), 32));
if (!email || !product) return htmlError("Please enter a valid email and choose a guide.", 400);
const reference = `wtbwa_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
const callback = new URL("/whatsapp-ai-guides/thank-you/", request.url);
callback.searchParams.set("reference", reference);
```

Persist the initialized order before calling Paystack. Initialize Paystack with `product.amount`, `NGN`, the callback URL and metadata containing `product_family: "whatsapp-ai-guides"`, `product_id`, `cta_location` and non-sensitive attribution. Return `Response.redirect(authorization_url, 302)`.

- [ ] **Step 4: Implement verification and signed private download**

`confirmPayment(reference, requestUrl, env)` must verify Paystack status `success`, exact amount, currency `NGN`, transaction reference and metadata product ID. `downloadAsset` validates a signed SHA-256 HMAC token containing `reference`, `asset` and `exp`, enforces the order's product asset, reads `env.WHATSAPP_AI_GUIDES_BUCKET`, sets `Content-Disposition: attachment`, `Content-Type: application/pdf` and `Cache-Control: private, no-store`.

- [ ] **Step 5: Run API tests**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: PASS for fixed amounts, invalid email, rate limit, success, pending, failed, wrong amount, wrong currency, wrong product, expired token and cross-product download.

- [ ] **Step 6: Commit the secure API**

```bash
git add functions/api/whatsapp-ai-guides/[[path]].js tests/whatsapp-ai-guides-flow.mjs
git commit -m "Add secure WhatsApp AI guide checkout"
```

---

### Task 3: Idempotent Webhook, Resend Delivery And Meta Purchase Event

**Files:**
- Create: `functions/api/whatsapp-ai-guides/fulfilment.js`
- Modify: `functions/api/paystack/webhook.js`
- Modify: `functions/api/whatsapp-ai-guides/[[path]].js`
- Modify: `tests/whatsapp-ai-guides-flow.mjs`

**Interfaces:**
- Produces: `handleWhatsAppGuideWebhook({ request, env, rawBody, event })`, `fulfilVerifiedOrder({ env, order, product, requestUrl })` and `sendMetaPurchase({ env, order, product, request })`.
- Existing `aiexp_` webhook branch remains byte-for-byte behaviorally equivalent.
- WhatsApp-guide browser and server Purchase events use `eventId = "purchase_" + reference`.

- [ ] **Step 1: Add failing webhook and idempotency tests**

```js
test("a WhatsApp guide webhook does not enter the AI Explorers order path", async () => {
  const response = await paystackWebhook(whatsAppGuideEvent(), combinedEnv());
  assert.equal(response.status, 200);
  assert.equal(aiExplorersKvReads, 0);
});

test("replayed charge.success sends one email and one server Purchase", async () => {
  await paystackWebhook(whatsAppGuideEvent(), combinedEnv());
  await paystackWebhook(whatsAppGuideEvent(), combinedEnv());
  assert.equal(resendCalls, 1);
  assert.equal(metaPurchaseCalls, 1);
});
```

- [ ] **Step 2: Run webhook tests and verify failure**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: FAIL because the shared webhook ignores `wtbwa_` references.

- [ ] **Step 3: Add explicit webhook dispatch**

At the top of `functions/api/paystack/webhook.js`, import the WhatsApp handler. After signature validation and `charge.success` parsing:

```js
if (/^wtbwa_[A-Za-z0-9]+$/.test(reference)) {
  return handleWhatsAppGuideWebhook({ request, env, rawBody, event });
}
if (!/^aiexp_[A-Za-z0-9]+$/.test(reference)) return new Response("Ignored", { status: 200 });
```

Do not change the remaining AI Explorers branch.

- [ ] **Step 4: Implement idempotent fulfilment**

After verified payment, send the secure product-specific download email only if `emailSentAt` is absent. Send Meta Purchase only if `purchaseEventSentAt` is absent. Persist each timestamp immediately after that operation succeeds.

The Resend email contains the official WTB logo, purchased product name, first-action guidance, secure download button, support address and optional WhatsApp share action.

The Meta server request posts to `https://graph.facebook.com/v23.0/${env.META_PIXEL_ID}/events` with event name `Purchase`, event ID `purchase_${reference}`, Unix event time, source URL, `action_source: "website"`, hashed email and custom data `{ currency: "NGN", value: product.amount / 100, content_ids: [product.id], content_type: "product" }`.

- [ ] **Step 5: Run webhook, email and Meta tests**

Run: `node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: PASS, including a regression test that `aiexp_` still reaches the original branch.

- [ ] **Step 6: Commit fulfilment**

```bash
git add functions/api/paystack/webhook.js functions/api/whatsapp-ai-guides/fulfilment.js functions/api/whatsapp-ai-guides/[[path]].js tests/whatsapp-ai-guides-flow.mjs
git commit -m "Add WhatsApp AI guide fulfilment"
```

---

### Task 4: Prepare Optimized Public Assets

**Files:**
- Create: `assets/whatsapp-ai-guides/wtb-logo.webp`
- Create: `assets/whatsapp-ai-guides/launchpad-cover-{360,640}.webp`
- Create: `assets/whatsapp-ai-guides/growth-engine-cover-{360,640}.webp`
- Create: `assets/whatsapp-ai-guides/preview-*.webp`
- Create: `assets/whatsapp-ai-guides/business-handoff-{640,1080}.webp`
- Create: `assets/whatsapp-ai-guides/knowledge-system-{640,1080}.webp`
- Create: `assets/whatsapp-ai-guides/social-card.jpg`
- Copy: `assets/whatsapp-ai-guides/icon-whatsapp.svg`
- Copy: `assets/whatsapp-ai-guides/icon-instagram.svg`
- Create: `tests/whatsapp-ai-guides-assets.mjs`

**Interfaces:**
- Consumes only approved source files from `whatsapp-business-agent-pdf` and the existing official WhatsApp icon.
- Produces responsive, dimensioned public proof imagery; no paid PDF enters this directory.

- [ ] **Step 1: Write failing asset-manifest tests**

```js
test("public assets contain no PDF or unapproved working folder", async () => {
  const files = await walk("assets/whatsapp-ai-guides");
  assert.equal(files.some((file) => file.endsWith(".pdf")), false);
  assert.equal(files.some((file) => /tmp|external-ui|contact-sheet/i.test(file)), false);
});

test("hero and preview assets stay inside their byte budgets", async () => {
  assert.ok(size("launchpad-cover-360.webp") <= 150_000);
  for (const file of previewThumbnails) assert.ok(size(file) <= 90_000);
});
```

- [ ] **Step 2: Run asset tests and verify missing-file failure**

Run: `node --test tests/whatsapp-ai-guides-assets.mjs`

Expected: FAIL because optimized assets do not exist.

- [ ] **Step 3: Convert approved files without altering originals**

Generate responsive WebP copies from the two covers, six approved preview pages and two selected Nigerian transformation visuals. Add a discreet `Preview page` watermark to preview copies. Create the 1200 by 630 social card using both real covers, official WTB logo, WhatsApp mark and the approved headline/prices.

- [ ] **Step 4: Run asset tests and visually inspect contact sheets**

Run: `node --test tests/whatsapp-ai-guides-assets.mjs`

Expected: PASS. Inspect desktop/mobile asset contact sheets for legibility, correct covers, safe social-card margins and no stretching.

- [ ] **Step 5: Commit optimized assets**

```bash
git add assets/whatsapp-ai-guides tests/whatsapp-ai-guides-assets.mjs
git commit -m "Add optimized WhatsApp AI guide assets"
```

---

### Task 5: Landing Page Structure And Premium Responsive Styling

**Files:**
- Create: `whatsapp-ai-guides/index.html`
- Create: `assets/whatsapp-ai-guides/whatsapp-ai-guides.css`
- Create: `tests/whatsapp-ai-guides-ui.cjs`

**Interfaces:**
- Produces semantic elements and data hooks: `[data-guide-buy]`, `[data-guide-product]`, `[data-cta-location]`, `[data-guide-checkout]`, `[data-guide-preview]`, `[data-guide-share]`, `[data-guide-calculator]`, `[data-guide-sticky]`.
- All purchase buttons name the exact product and price.

- [ ] **Step 1: Write failing desktop/mobile structure tests**

```js
for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 900 }, { width: 1440, height: 900 }]) {
  await page.setViewportSize(viewport);
  await page.goto(testUrl);
  expect(await page.locator("h1").innerText()).toContain("Your WhatsApp is busy");
  expect(await page.locator("[data-guide-product='launchpad']").count()).toBeGreaterThan(2);
  expect(await page.locator("[data-guide-product='growth-engine']").count()).toBeGreaterThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
}
```

Also assert no `AI Explorers`, `children`, invented testimonial or normal site navigation text.

- [ ] **Step 2: Run the UI test and verify route failure**

Run: `node tests/whatsapp-ai-guides-ui.cjs`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Build semantic HTML in the approved section order**

Use the exact approved copy from the builder brief for the announcement bar, header, hero, silent-money-leak section, calculator, transformation, capabilities, real previews, products, comparison, value anchor, FAQ, share section, final CTA, implementation close and disclaimer. Exclude the optional video in version one.

Include canonical, title, meta description, Open Graph metadata, two truthful Product structured-data nodes and FAQ structured data matching visible copy.

- [ ] **Step 4: Implement mobile-first route-scoped CSS**

Use stable grid tracks, `minmax(0, 1fr)`, fluid containers without viewport-scaled font sizes, minimum 52px CTA height, visible focus, safe-area padding and reserved media dimensions. Product cards use at most 8px radius and are never nested inside decorative cards.

Animation is limited to one-time product-cover rise, chat-bubble entry, preview reveal and small share-arrow movement. Disable it under `prefers-reduced-motion`.

- [ ] **Step 5: Run UI tests and inspect screenshots**

Run: `node tests/whatsapp-ai-guides-ui.cjs`

Expected: PASS for layout, section order, CTA labels, prices, headings, overflow, image dimensions, keyboard focus and reduced motion at all target widths.

- [ ] **Step 6: Commit page and styling**

```bash
git add whatsapp-ai-guides/index.html assets/whatsapp-ai-guides/whatsapp-ai-guides.css tests/whatsapp-ai-guides-ui.cjs
git commit -m "Build WhatsApp AI guides sales page"
```

---

### Task 6: Calculator, Preview, Sharing, Sticky CTA And Checkout Client

**Files:**
- Create: `assets/whatsapp-ai-guides/whatsapp-ai-guides.js`
- Modify: `whatsapp-ai-guides/index.html`
- Modify: `tests/whatsapp-ai-guides-ui.cjs`
- Modify: `assets/meta-pixel.js`

**Interfaces:**
- `calculateRisk({ delayedChats, purchaseRate, grossProfit })` returns `delayedChats * 30 * (purchaseRate / 100) * grossProfit`.
- Checkout form posts to `/api/whatsapp-ai-guides/checkout` with `email`, `product`, `ctaLocation` and non-sensitive attribution fields.
- `track(name, data, eventId?)` calls available `fbq`, `zaraz.track` and `gtag` without blocking navigation.

- [ ] **Step 1: Add failing interaction tests**

```js
test("calculator uses the documented formula", async () => {
  await fillCalculator({ delayed: 5, rate: 10, profit: 5000 });
  assert.match(await result.textContent(), /75,000/);
});

test("buy click shows chosen product, exact price and email field", async () => {
  await page.locator("[data-guide-product='growth-engine']").first().click();
  await expect(page.locator("[data-guide-checkout]")).toContainText("₦10,500");
});
```

Add tests for preview Escape/focus return, native-share fallback, sticky CTA visibility, button response under 100 ms and checkout error recovery.

- [ ] **Step 2: Run interaction tests and verify failure**

Run: `node tests/whatsapp-ai-guides-ui.cjs`

Expected: FAIL because the interaction script does not exist.

- [ ] **Step 3: Implement progressive interactions**

Implement calculator formatting, accessible preview dialog, Web Share API with WhatsApp fallback, sticky-bar observer, email checkout dialog and form state. Submit through a normal same-origin form POST so the server can return an immediate 302 to Paystack without loading InlineJS.

- [ ] **Step 4: Add route-specific browser events**

Extend `assets/meta-pixel.js` only with a `/whatsapp-ai-guides/` `ViewContent` branch using content IDs `whatsapp-ai-launchpad` and `whatsapp-ai-growth-engine`, category `WhatsApp AI Guides`, currency `NGN` and minimum value `5500`. Page interactions fire `SelectGuide`, `InitiateCheckout`, `ShareClick`, `PreviewOpen` and `CalculatorComplete`.

- [ ] **Step 5: Run interaction and existing AI Explorers tests**

Run: `node tests/whatsapp-ai-guides-ui.cjs && node tests/ai-explorers-ui.cjs`

Expected: both PASS with no duplicate PageView or regression in AI Explorers tracking.

- [ ] **Step 6: Commit interactions**

```bash
git add assets/whatsapp-ai-guides/whatsapp-ai-guides.js whatsapp-ai-guides/index.html tests/whatsapp-ai-guides-ui.cjs assets/meta-pixel.js
git commit -m "Add WhatsApp AI guide interactions"
```

---

### Task 7: Success Page And Digital Product Policy

**Files:**
- Create: `whatsapp-ai-guides/thank-you/index.html`
- Create: `whatsapp-ai-guides/digital-product-policy/index.html`
- Create: `assets/whatsapp-ai-guides/whatsapp-ai-guides-success.js`
- Modify: `tests/whatsapp-ai-guides-ui.cjs`

**Interfaces:**
- Success page reads only the `reference` parameter and calls `/api/whatsapp-ai-guides/verify?reference=...`.
- Verified response returns `product`, `downloadUrl`, `eventId` and optional non-sensitive `referralUrl`.

- [ ] **Step 1: Add failing success and policy tests**

```js
test("success page does not expose download before verification", async () => {
  await page.goto(`${base}/whatsapp-ai-guides/thank-you/?reference=wtbwa_invalid`);
  await expect(page.locator("[data-download]")).toBeHidden();
});

test("policy lists only approved digital-product exceptions", async () => {
  const text = await policyPage.textContent();
  assert.match(text, /duplicate payment/i);
  assert.match(text, /failed delivery/i);
  assert.match(text, /corrupt/i);
  assert.doesNotMatch(text, /30-day/i);
});
```

- [ ] **Step 2: Run success-page tests and verify failure**

Run: `node tests/whatsapp-ai-guides-ui.cjs`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Build the lightweight verification experience**

Render confirmed, pending, failed and retry states. Show the secure product-specific download only after `{ verified: true }`. Fire browser Purchase with the returned `eventId`, product value and `NGN`, then store the reference in session storage to prevent duplicate browser firing during refresh. Sharing remains optional and never blocks download.

- [ ] **Step 4: Publish the approved policy**

State that access is immediate and non-refundable after secure delivery except duplicate payment, failed delivery WTB cannot restore, or a corrupt file WTB cannot replace. Link support and return to the product page.

- [ ] **Step 5: Run success, policy and API tests**

Run: `node tests/whatsapp-ai-guides-ui.cjs && node --test tests/whatsapp-ai-guides-flow.mjs`

Expected: PASS.

- [ ] **Step 6: Commit post-purchase routes**

```bash
git add whatsapp-ai-guides/thank-you whatsapp-ai-guides/digital-product-policy assets/whatsapp-ai-guides/whatsapp-ai-guides-success.js tests/whatsapp-ai-guides-ui.cjs
git commit -m "Add WhatsApp AI guide delivery pages"
```

---

### Task 8: Search, Security, Cloudflare Configuration And Full Release QA

**Files:**
- Modify: `sitemap.xml`
- Modify: `llms.txt`
- Modify: `_headers`
- Modify: `_redirects`
- Create: `docs/WHATSAPP_AI_GUIDES_CLOUDFLARE_SETUP.md`
- Create: `tests/whatsapp-ai-guides-release.mjs`

**Interfaces:**
- Documents required bindings: `WHATSAPP_AI_GUIDES_ORDERS`, `WHATSAPP_AI_GUIDES_BUCKET`, `WHATSAPP_AI_GUIDES_DOWNLOAD_TTL_SECONDS`, `WHATSAPP_AI_GUIDES_DOWNLOAD_LIMIT`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `DOWNLOAD_TOKEN_SECRET`, `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `FROM_EMAIL`, `ADMIN_EMAIL`.
- Production canonical is `https://wtbaimarketing.com/whatsapp-ai-guides/`.

- [ ] **Step 1: Add failing release assertions**

```js
test("public discovery includes the landing page but not success or private assets", async () => {
  assert.match(sitemap, /https:\/\/wtbaimarketing\.com\/whatsapp-ai-guides\//);
  assert.doesNotMatch(sitemap, /whatsapp-ai-guides\/thank-you/);
  assert.doesNotMatch(allPublicFiles, /wtb-whatsapp-ai-(launchpad|growth-engine)\.pdf/);
});
```

Also test noindex headers for success/policy where intended, canonical redirects, CSP allowances, immutable route-asset caching, byte budgets, broken local links and unchanged hashes for unrelated WTB files.

- [ ] **Step 2: Run release tests and verify failure**

Run: `node --test tests/whatsapp-ai-guides-release.mjs`

Expected: FAIL until discovery and headers are updated.

- [ ] **Step 3: Add discovery, canonical and security configuration**

Add only the landing page to the sitemap and AI-readable business/product summaries. Add clean-folder redirects, `noindex` for thank-you, restrictive headers and route-asset caching. Document the Paystack callback and account webhook URLs without exposing secrets.

- [ ] **Step 4: Run all automated checks**

Run:

```bash
node --test tests/whatsapp-ai-guides-flow.mjs
node --test tests/whatsapp-ai-guides-assets.mjs
node tests/whatsapp-ai-guides-ui.cjs
node --test tests/whatsapp-ai-guides-release.mjs
node tests/ai-explorers-ui.cjs
node tests/meta-pixel-live.cjs
```

Expected: all PASS.

- [ ] **Step 5: Run independent review gates**

Perform five separate reviews with no shared conclusions until the end:

1. visual hierarchy and mobile polish;
2. conversion clarity and truthful claims;
3. payment, private delivery and webhook security;
4. accessibility, readability and reduced motion;
5. performance, tracking and unrelated-page regression.

Reject release for any unresolved severity-one or severity-two issue. Require each review to score at least 9/10 and the combined release checklist to reach 10/10 before user preview.

- [ ] **Step 6: Run production-like browser and payment evidence**

Serve the static site with Pages Functions locally or deploy a Cloudflare preview. Capture screenshots at 360, 390, 430, 768 and 1440 widths. Test Slow 4G button feedback, test-mode Paystack redirect, verified callback, webhook replay, Resend delivery, private R2 download, wrong-product denial, Meta Test Events and social-card rendering.

- [ ] **Step 7: Commit release configuration**

```bash
git add sitemap.xml llms.txt _headers _redirects docs/WHATSAPP_AI_GUIDES_CLOUDFLARE_SETUP.md tests/whatsapp-ai-guides-release.mjs
git commit -m "Prepare WhatsApp AI guides release"
```

- [ ] **Step 8: Produce the handoff**

Return the preview URL, exact files changed, mobile and desktop screenshots, environment-variable checklist, Paystack test evidence, private-delivery evidence, review scores, performance results and a diff-based confirmation that no unrelated WTB page changed.
