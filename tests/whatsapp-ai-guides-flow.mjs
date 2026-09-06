import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, ASSETS, PRODUCT_CURRENCY, productForId } from "../functions/api/whatsapp-ai-guides/product-config.js";
import { onRequest } from "../functions/api/whatsapp-ai-guides/[[path]].js";
import { fulfilVerifiedOrder, handleWhatsAppGuideWebhook } from "../functions/api/whatsapp-ai-guides/fulfilment.js";

const realFetch = globalThis.fetch;

function d1() {
  const orders = new Map();
  const rates = new Map();
  return {
    orders,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              if (sql.includes("INSERT INTO whatsapp_ai_orders")) {
                const [reference, product_id, amount, currency, first_name, email, cta_location, status, created_at, delivery_key, delivery_expires_at, tracking_json] = values;
                orders.set(reference, { reference, product_id, amount, currency, first_name, email, cta_location, status, created_at, delivery_key, delivery_expires_at, tracking_json, verified_at: null, paystack_transaction_id: null, download_count: 0, last_download_at: null, email_status: "pending", email_attempted_at: null, email_sent_at: null, email_last_error: null, meta_status: "pending", meta_attempted_at: null, meta_sent_at: null, meta_last_error: null });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("INSERT INTO whatsapp_ai_rate_limits")) {
                const [key, window] = values;
                const current = rates.get(key);
                rates.set(key, { attempts: current?.window === window ? current.attempts + 1 : 1, window });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("SET status = 'verified'")) {
                const [verified_at, paystack_transaction_id, reference] = values;
                const row = orders.get(reference);
                if (!row) return { meta: { changes: 0 } };
                row.status = "verified";
                row.verified_at ||= verified_at;
                row.paystack_transaction_id ||= paystack_transaction_id;
                return { meta: { changes: 1 } };
              }
              if (sql.includes("SET download_count = download_count + 1")) {
                const [last_download_at, reference, limit] = values;
                const row = orders.get(reference);
                if (!row || row.status !== "verified" || row.download_count >= limit) return { meta: { changes: 0 } };
                row.download_count += 1;
                row.last_download_at = last_download_at;
                return { meta: { changes: 1 } };
              }
              for (const channel of ["email", "meta"]) {
                if (sql.includes(`SET ${channel}_status = 'sending'`)) {
                  const [attemptedAt, reference, staleBefore] = values;
                  const row = orders.get(reference);
                  const statusKey = `${channel}_status`;
                  const attemptedKey = `${channel}_attempted_at`;
                  const eligible = row && row.status === "verified" && (["pending", "failed"].includes(row[statusKey] || "pending") || (row[statusKey] === "sending" && row[attemptedKey] < staleBefore));
                  if (!eligible) return { meta: { changes: 0 } };
                  row[statusKey] = "sending";
                  row[attemptedKey] = attemptedAt;
                  row[`${channel}_last_error`] = null;
                  return { meta: { changes: 1 } };
                }
                if (sql.includes(`SET ${channel}_status = 'sent'`)) {
                  const [sentAt, reference] = values;
                  const row = orders.get(reference);
                  if (!row || row[`${channel}_status`] !== "sending") return { meta: { changes: 0 } };
                  row[`${channel}_status`] = "sent";
                  row[`${channel}_sent_at`] = sentAt;
                  row[`${channel}_last_error`] = null;
                  return { meta: { changes: 1 } };
                }
                if (sql.includes(`SET ${channel}_status = 'failed'`)) {
                  const [message, reference] = values;
                  const row = orders.get(reference);
                  if (!row || row[`${channel}_status`] !== "sending") return { meta: { changes: 0 } };
                  row[`${channel}_status`] = "failed";
                  row[`${channel}_last_error`] = message;
                  return { meta: { changes: 1 } };
                }
              }
              throw new Error(`Unhandled D1 run: ${sql}`);
            },
            async first() {
              if (sql.includes("FROM whatsapp_ai_orders")) return orders.get(values[0]) || null;
              if (sql.includes("FROM whatsapp_ai_rate_limits")) return rates.get(values[0]) || null;
              throw new Error(`Unhandled D1 first: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function env(bucketObject = null) {
  return {
    PAYSTACK_SECRET_KEY: "sk_test_example",
    DOWNLOAD_TOKEN_SECRET: "test-download-secret-that-is-long-enough",
    WHATSAPP_AI_GUIDES_DB: d1(),
    WHATSAPP_AI_GUIDES_BUCKET: {
      async head() { return bucketObject; },
      async get() { return bucketObject; },
    },
  };
}

function verifyRequest(reference, deliveryKey) {
  return new Request(`https://wtbaimarketing.com/api/whatsapp-ai-guides/verify?reference=${reference}`, {
    headers: { Cookie: `wtbwa_delivery_${reference}=${deliveryKey}` },
  });
}

test("product map fixes trusted amounts and private assets", () => {
  assert.equal(PRODUCT_CURRENCY, "NGN");
  assert.equal(PRODUCTS.launchpad.amount, 550000);
  assert.equal(PRODUCTS["growth-engine"].amount, 1050000);
  assert.equal(ASSETS.launchpad.key, "whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf");
  assert.equal(ASSETS["growth-engine"].key, "whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf");
  assert.equal(productForId("unknown"), null);
});

test("checkout ignores a browser amount and initializes the fixed product amount", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let initialized;
  globalThis.fetch = async (_url, options) => {
    initialized = JSON.parse(options.body);
    return new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/test" } }), { status: 200 });
  };
  const request = new Request("https://wtbaimarketing.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    headers: { "CF-Connecting-IP": "127.0.0.1" },
    body: new URLSearchParams({ firstName: "Wole", email: "buyer@example.com", product: "launchpad", amount: "1", ctaLocation: "hero" }),
  });
  const response = await onRequest({
    request,
    env: {
      ...env({ size: 1234 }),
      RESEND_API_KEY: "re_test",
      FROM_EMAIL: "WTB <hello@wtbaimarketing.com>",
    },
  });
  assert.equal(response.status, 302);
  assert.equal(initialized.amount, "550000");
  assert.equal(initialized.metadata.product_id, "launchpad");
  assert.match(initialized.callback_url, /whatsapp-ai-guides\/thank-you/);
  assert.doesNotMatch(initialized.callback_url, /(?:\?|&)key=/);
  assert.match(response.headers.get("Set-Cookie"), /wtbwa_delivery_wtbwa_.*HttpOnly.*Secure.*SameSite=Lax/);
});

test("checkout returns a server-created access code for the on-page Paystack popup", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/test", access_code: "test_access_code" } }), { status: 200 });
  const request = new Request("https://wtbaimarketing.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    headers: { "CF-Connecting-IP": "127.0.0.2", Accept: "application/json" },
    body: new URLSearchParams({ firstName: "Wole", email: "buyer@example.com", product: "growth-engine", ctaLocation: "product_card" }),
  });
  const response = await onRequest({ request, env: { ...env({ size: 1234 }), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>" } });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.accessCode, "test_access_code");
  assert.match(payload.reference, /^wtbwa_/);
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly.*Secure.*SameSite=Lax/);
});

test("checkout takes no payment when delivery configuration is incomplete", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response(); };
  const request = new Request("https://wtbaimarketing.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    body: new URLSearchParams({ firstName: "Wole", email: "buyer@example.com", product: "launchpad" }),
  });
  const response = await onRequest({ request, env: env({ size: 1234 }) });
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test("checkout takes no payment when the selected private PDF is missing", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response(); };
  const request = new Request("https://wtbaimarketing.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    body: new URLSearchParams({ firstName: "Wole", email: "buyer@example.com", product: "growth-engine" }),
  });
  const response = await onRequest({
    request,
    env: {
      ...env(),
      RESEND_API_KEY: "re_test",
      FROM_EMAIL: "WTB <hello@wtbaimarketing.com>",
    },
  });
  assert.equal(response.status, 503);
  assert.equal(called, false);
  assert.match(await response.text(), /No payment has been taken/);
});

test("checkout rejects an unknown product before contacting Paystack", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response(); };
  const request = new Request("https://wtbaimarketing.com/api/whatsapp-ai-guides/checkout", {
    method: "POST",
    body: new URLSearchParams({ firstName: "Wole", email: "buyer@example.com", product: "fake" }),
  });
  const response = await onRequest({
    request,
    env: {
      ...env({ size: 1234 }),
      RESEND_API_KEY: "re_test",
      FROM_EMAIL: "WTB <hello@wtbaimarketing.com>",
    },
  });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("verification rejects a successful transaction with the wrong amount", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  const testEnv = env();
  const reference = "wtbwa_1234567890abcdef";
  const deliveryKey = "a".repeat(32);
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", cta_location: "test", status: "initialized", created_at: new Date().toISOString(), delivery_key: deliveryKey, delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", verified_at: null, paystack_transaction_id: null, download_count: 0 });
  globalThis.fetch = async () => new Response(JSON.stringify({ status: true, data: { status: "success", amount: 1, currency: "NGN", reference, metadata: { product_id: "launchpad" } } }), { status: 200 });
  const response = await onRequest({ request: verifyRequest(reference, deliveryKey), env: testEnv });
  const payload = await response.json();
  assert.equal(payload.verified, false);
});

test("an exact verified payment unlocks only the purchased private PDF", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 private launchpad guide");
  const testEnv = env({
    body: pdfBytes,
    writeHttpMetadata(headers) { headers.set("Content-Type", "application/pdf"); },
  });
  const reference = "wtbwa_aabbccddeeff00112233";
  const deliveryKey = "b".repeat(32);
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, {
    reference,
    product_id: "launchpad",
    amount: 550000,
    currency: "NGN",
    first_name: "Wole",
    email: "buyer@example.com",
    cta_location: "test",
    status: "initialized",
    created_at: new Date().toISOString(),
    delivery_key: deliveryKey,
    delivery_expires_at: new Date(Date.now() + 86400000).toISOString(),
    tracking_json: "{}",
    verified_at: null,
    paystack_transaction_id: null,
    download_count: 0,
  });
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: true,
    data: {
      id: 321,
      status: "success",
      amount: 550000,
      currency: "NGN",
      reference,
      metadata: { product_id: "launchpad" },
    },
  }), { status: 200 });

  const verification = await onRequest({
    request: verifyRequest(reference, deliveryKey),
    env: testEnv,
  });
  const verified = await verification.json();
  assert.equal(verified.verified, true);
  assert.equal(verified.product.id, "launchpad");
  assert.match(verified.downloadUrl, /api\/whatsapp-ai-guides\/download\?token=/);

  const download = await onRequest({ request: new Request(verified.downloadUrl), env: testEnv });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("Content-Type"), "application/pdf");
  assert.match(download.headers.get("Content-Disposition"), /WTB-WhatsApp-AI-Launchpad\.pdf/);
  assert.equal(await download.text(), "%PDF-1.7 private launchpad guide");

  const tamperedUrl = new URL(verified.downloadUrl);
  tamperedUrl.searchParams.set("token", `${tamperedUrl.searchParams.get("token")}changed`);
  const tampered = await onRequest({ request: new Request(tamperedUrl), env: testEnv });
  assert.equal(tampered.status, 403);
});

test("a payment reference alone cannot mint a new download token", async () => {
  const testEnv = env();
  const reference = "wtbwa_ffeeddccbbaa00998877";
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", cta_location: "test", status: "verified", created_at: new Date().toISOString(), delivery_key: "c".repeat(32), delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", verified_at: new Date().toISOString(), paystack_transaction_id: "44", download_count: 0 });
  const response = await onRequest({ request: new Request(`https://wtbaimarketing.com/api/whatsapp-ai-guides/verify?reference=${reference}`), env: testEnv });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
});

test("repeated fulfilment uses one stable Resend idempotency key", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  const idempotencyKeys = [];
  globalThis.fetch = async (_url, options) => {
    idempotencyKeys.push(options.headers["Idempotency-Key"]);
    return new Response(JSON.stringify({ id: "email" }), { status: 200 });
  };
  const testEnv = { ...env(), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>" };
  const order = { reference: "wtbwa_idempotent00112233", productId: "launchpad", amount: 550000, currency: "NGN", firstName: "Wole", email: "buyer@example.com", status: "verified", deliveryKey: "d".repeat(32), deliveryExpiresAt: new Date(Date.now() + 86400000).toISOString(), tracking: {} };
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(order.reference, { reference: order.reference, product_id: order.productId, amount: order.amount, currency: order.currency, first_name: order.firstName, email: order.email, status: "verified", delivery_key: order.deliveryKey, delivery_expires_at: order.deliveryExpiresAt, tracking_json: "{}", email_status: "pending", email_attempted_at: null, meta_status: "pending", meta_attempted_at: null, download_count: 0 });
  await fulfilVerifiedOrder({ env: testEnv, order, product: PRODUCTS.launchpad, requestUrl: "https://wtbaimarketing.com/api/whatsapp-ai-guides/verify", request: new Request("https://wtbaimarketing.com/") });
  await fulfilVerifiedOrder({ env: testEnv, order, product: PRODUCTS.launchpad, requestUrl: "https://wtbaimarketing.com/api/whatsapp-ai-guides/verify", request: new Request("https://wtbaimarketing.com/") });
  assert.deepEqual(idempotencyKeys, ["wtb-wa-guides-wtbwa_idempotent00112233"]);
});

test("a temporary email failure is stored and retried automatically", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(attempts === 1 ? "temporary failure" : JSON.stringify({ id: "email" }), { status: attempts === 1 ? 503 : 200 });
  };
  const testEnv = { ...env(), RESEND_API_KEY: "re_test", WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS: "0" };
  const order = { reference: "wtbwa_retryemail0011223344", productId: "launchpad", amount: 550000, currency: "NGN", firstName: "Wole", email: "buyer@example.com", status: "verified", deliveryKey: "f".repeat(32), deliveryExpiresAt: new Date(Date.now() + 86400000).toISOString(), tracking: {} };
  const row = { reference: order.reference, product_id: order.productId, amount: order.amount, currency: order.currency, first_name: order.firstName, email: order.email, status: "verified", delivery_key: order.deliveryKey, delivery_expires_at: order.deliveryExpiresAt, tracking_json: "{}", email_status: "pending", email_attempted_at: null, meta_status: "pending", meta_attempted_at: null, download_count: 0 };
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(order.reference, row);
  await fulfilVerifiedOrder({ env: testEnv, order, product: PRODUCTS.launchpad, requestUrl: "https://wtbaimarketing.com/api/whatsapp-ai-guides/verify", request: new Request("https://wtbaimarketing.com/") });
  assert.equal(attempts, 2);
  assert.equal(row.email_status, "sent");
});

test("a failing Meta call does not cut short buyer email delivery", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let releaseEmail;
  let emailFinished = false;
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.resend.com")) {
      return new Promise((resolve) => {
        releaseEmail = () => {
          emailFinished = true;
          resolve(new Response(JSON.stringify({ id: "email" }), { status: 200 }));
        };
      });
    }
    return new Response("Meta unavailable", { status: 503 });
  };
  const testEnv = { ...env(), RESEND_API_KEY: "re_test", META_PIXEL_ID: "123", META_CAPI_ACCESS_TOKEN: "token", WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS: "0" };
  const order = { reference: "wtbwa_allsettled00112233", productId: "launchpad", amount: 550000, currency: "NGN", firstName: "Wole", email: "buyer@example.com", status: "verified", deliveryKey: "9".repeat(32), deliveryExpiresAt: new Date(Date.now() + 86400000).toISOString(), tracking: {} };
  const row = { reference: order.reference, product_id: order.productId, amount: order.amount, currency: order.currency, first_name: order.firstName, email: order.email, status: "verified", delivery_key: order.deliveryKey, delivery_expires_at: order.deliveryExpiresAt, tracking_json: "{}", email_status: "pending", email_attempted_at: null, email_attempt_count: 0, meta_status: "pending", meta_attempted_at: null, meta_attempt_count: 0, download_count: 0 };
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(order.reference, row);
  const fulfilment = fulfilVerifiedOrder({ env: testEnv, order, product: PRODUCTS.launchpad, requestUrl: "https://wtbaimarketing.com/api/whatsapp-ai-guides/verify", request: new Request("https://wtbaimarketing.com/") });
  for (let attempt = 0; attempt < 20 && !releaseEmail; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(typeof releaseEmail, "function");
  releaseEmail();
  await assert.rejects(fulfilment);
  assert.equal(emailFinished, true);
  assert.equal(row.email_status, "sent");
  assert.equal(row.meta_status, "failed");
});

test("verification binds Cloudflare waitUntil and returns before slow email delivery", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let releaseEmail;
  globalThis.fetch = async () => new Promise((resolve) => { releaseEmail = () => resolve(new Response("{}", { status: 200 })); });
  const testEnv = { ...env({ size: 1234 }), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>" };
  const reference = "wtbwa_boundwait001122334455";
  const deliveryKey = "1".repeat(32);
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", status: "verified", delivery_key: deliveryKey, delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", email_status: "pending", email_attempted_at: null, meta_status: "pending", meta_attempted_at: null, download_count: 0 });
  let background;
  const context = {
    request: verifyRequest(reference, deliveryKey),
    env: testEnv,
    waitUntil(promise) { assert.equal(this, context); background = promise; },
  };
  const response = await onRequest(context);
  assert.equal(response.status, 200);
  assert.ok(background instanceof Promise);
  for (let attempt = 0; attempt < 20 && !releaseEmail; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(typeof releaseEmail, "function");
  releaseEmail();
  await background;
});

test("the Paystack webhook acknowledges only after slow fulfilment completes", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let releaseEmail;
  globalThis.fetch = async () => new Promise((resolve) => { releaseEmail = () => resolve(new Response("{}", { status: 200 })); });
  const testEnv = { ...env({ size: 1234 }), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>" };
  const reference = "wtbwa_webhook001122334455";
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", cta_location: "test", status: "initialized", created_at: new Date().toISOString(), delivery_key: "e".repeat(32), delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", verified_at: null, paystack_transaction_id: null, download_count: 0 });
  let resolved = false;
  const pending = handleWhatsAppGuideWebhook({
    request: new Request("https://wtbaimarketing.com/api/paystack/webhook"),
    env: testEnv,
    event: {
      data: {
        id: 55,
        status: "success",
        amount: 550000,
        currency: "NGN",
        reference,
        metadata: { product_id: "launchpad" },
      },
    },
  }).then((response) => {
    resolved = true;
    return response;
  });
  for (let attempt = 0; attempt < 20 && !releaseEmail; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(typeof releaseEmail, "function");
  assert.equal(resolved, false);
  releaseEmail();
  const response = await pending;
  assert.equal(response.status, 200);
});

test("the Paystack webhook returns 503 when delivery exhausts retries", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("email unavailable", { status: 503 });
  };
  const testEnv = { ...env({ size: 1234 }), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>", WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS: "0" };
  const reference = "wtbwa_webhookretry0011223344";
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", cta_location: "test", status: "initialized", created_at: new Date().toISOString(), delivery_key: "7".repeat(32), delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", verified_at: null, paystack_transaction_id: null, download_count: 0, email_status: "pending", email_attempted_at: null, meta_status: "pending", meta_attempted_at: null });
  const response = await handleWhatsAppGuideWebhook({ request: new Request("https://wtbaimarketing.com/api/paystack/webhook"), env: testEnv, event: { data: { id: 56, status: "success", amount: 550000, currency: "NGN", reference, metadata: { product_id: "launchpad" } } } });
  assert.equal(response.status, 503);
  assert.equal(attempts, 2);
});

test("the Paystack webhook does not acknowledge another delivery still in progress", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response("{}"); };
  const testEnv = { ...env({ size: 1234 }), RESEND_API_KEY: "re_test", FROM_EMAIL: "WTB <hello@wtbaimarketing.com>", WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS: "0" };
  const reference = "wtbwa_webhookrace001122334455";
  testEnv.WHATSAPP_AI_GUIDES_DB.orders.set(reference, { reference, product_id: "launchpad", amount: 550000, currency: "NGN", first_name: "Wole", email: "buyer@example.com", cta_location: "test", status: "verified", created_at: new Date().toISOString(), delivery_key: "8".repeat(32), delivery_expires_at: new Date(Date.now() + 86400000).toISOString(), tracking_json: "{}", verified_at: new Date().toISOString(), paystack_transaction_id: "57", download_count: 0, email_status: "sending", email_attempted_at: new Date().toISOString(), meta_status: "pending", meta_attempted_at: null });
  const response = await handleWhatsAppGuideWebhook({ request: new Request("https://wtbaimarketing.com/api/paystack/webhook"), env: testEnv, event: { data: { id: 57, status: "success", amount: 550000, currency: "NGN", reference, metadata: { product_id: "launchpad" } } } });
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test("paid PDFs are not present in the public asset tree", async () => {
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(new URL("../assets/", import.meta.url), { recursive: true });
  assert.equal(files.some((file) => /wtb-whatsapp-ai-(launchpad|growth-engine)\.pdf$/i.test(file)), false);
});
