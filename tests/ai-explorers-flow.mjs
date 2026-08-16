import assert from "node:assert/strict";
import { onRequest } from "../functions/api/ai-explorers/[[path]].js";
import { onRequestPost as onWebhook } from "../functions/api/paystack/webhook.js";

class MemoryKV {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, value); }
}

class MemoryR2 {
  constructor() {
    this.objects = new Map([
      ["ai-explorers/AI-Explorers-Interactive-Workbook.pdf", new TextEncoder().encode("interactive")],
      ["ai-explorers/AI-Explorers-Low-Ink-Workbook.pdf", new TextEncoder().encode("low-ink")],
      ["ai-explorers/AI-Explorers-Parent-Companion.pdf", new TextEncoder().encode("parent")],
    ]);
  }
  async get(key) {
    const body = this.objects.get(key);
    if (!body) return null;
    return { body, writeHttpMetadata() {} };
  }
}

const originalFetch = globalThis.fetch;
const paystackTransactions = new Map();
const sentEmails = [];
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.endsWith("/transaction/initialize")) {
    const payload = JSON.parse(init.body);
    paystackTransactions.set(payload.reference, payload);
    return Response.json({ status: true, data: { access_code: `access_${payload.reference}` } });
  }
  if (href.includes("/transaction/verify/")) {
    const reference = decodeURIComponent(href.split("/").pop());
    const transaction = paystackTransactions.get(reference);
    return Response.json({ status: true, data: { id: 42, status: "success", amount: Number(transaction.amount), currency: transaction.currency, reference } });
  }
  if (href === "https://api.resend.com/emails") {
    sentEmails.push(JSON.parse(init.body));
    return Response.json({ id: `email_${sentEmails.length}` });
  }
  throw new Error(`Unexpected fetch: ${href}`);
};

const env = {
  PAYSTACK_SECRET_KEY: "test_secret",
  DOWNLOAD_TOKEN_SECRET: "download_secret",
  RESEND_API_KEY: "resend_secret",
  FROM_EMAIL: "WTB AI Marketing Agency <hello@wtbaimarketing.com>",
  AI_EXPLORERS_ORDERS: new MemoryKV(),
  AI_EXPLORERS_BUCKET: new MemoryR2(),
  AI_EXPLORERS_DOWNLOAD_LIMIT: "10",
  AI_EXPLORERS_DOWNLOAD_TTL_SECONDS: "604800",
};

async function call(path, options = {}) {
  const request = new Request(`https://wtbaimarketing.com${path}`, options);
  return onRequest({ request, env });
}

async function purchase(product, expectedAmount, expectedAssets) {
  const initialize = await call("/api/ai-explorers/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": `127.0.0.${sentEmails.length + 1}` },
    body: JSON.stringify({ firstName: "Flow Test", email: "flow-test@example.com", product, ctaLocation: "automated-test" }),
  });
  assert.equal(initialize.status, 200);
  const initialized = await initialize.json();
  assert.equal(initialized.product.amount, expectedAmount);
  assert.match(initialized.accessCode, /^access_aiexp_/);

  const verify = await call(`/api/ai-explorers/verify?reference=${initialized.reference}`);
  assert.equal(verify.status, 200);
  const verified = await verify.json();
  assert.equal(verified.verified, true);
  assert.equal(verified.product.amount, expectedAmount);
  assert.deepEqual(verified.downloadUrls.map((item) => item.id), expectedAssets);

  for (const item of verified.downloadUrls) {
    const response = await call(new URL(item.url).pathname + new URL(item.url).search);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/pdf");
    assert.match(response.headers.get("Content-Disposition"), /^attachment; filename="AI-Explorers-/);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  return verified;
}

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function webhookPurchase() {
  const initialize = await call("/api/ai-explorers/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "127.0.0.99" },
    body: JSON.stringify({ firstName: "Webhook Test", email: "webhook-test@example.com", product: "complete", ctaLocation: "automated-webhook-test" }),
  });
  const initialized = await initialize.json();
  const body = JSON.stringify({ event: "charge.success", data: { reference: initialized.reference } });
  const request = new Request("https://wtbaimarketing.com/api/paystack/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": await hmacHex(body, env.PAYSTACK_SECRET_KEY) },
    body,
  });
  const response = await onWebhook({ request, env });
  assert.equal(response.status, 200);
  const order = JSON.parse(await env.AI_EXPLORERS_ORDERS.get(`ai-explorers:order:${initialized.reference}`));
  assert.equal(order.status, "verified");
  assert.ok(order.emailSentAt);
  const emailCount = sentEmails.length;
  const verified = await (await call(`/api/ai-explorers/verify?reference=${initialized.reference}`)).json();
  assert.equal(verified.downloadUrls.length, 3);
  assert.equal(sentEmails.length, emailCount, "The return-page verification must not send a duplicate email after the webhook.");
}

try {
  const workbook = await purchase("workbook", 450000, ["workbook"]);
  const library = await purchase("complete", 750000, ["workbook", "low-ink", "parent-companion"]);
  await webhookPurchase();
  assert.equal(workbook.downloadUrls.length, 1);
  assert.equal(library.downloadUrls.length, 3);
  assert.equal(sentEmails.length, 3);
  assert.match(sentEmails[0].html, /ai-explorers-cover-ages-5-11\.png/);
  assert.match(sentEmails[1].html, /Share AI Explorers with a parent/);
  assert.doesNotMatch(sentEmails[1].html, /Open your private library/);
  assert.match(sentEmails[2].html, /ai-explorers-cover-ages-5-11\.png/);
  assert.match(sentEmails[2].html, /Share AI Explorers with a parent/);
  assert.doesNotMatch(sentEmails[2].html, /Open your private library/);
  console.log(JSON.stringify({ passed: true, prices: [4500, 7500], workbookFiles: 1, familyLibraryFiles: 3, paymentVerificationPaths: ["return-page", "webhook"], emailsGenerated: sentEmails.length, duplicateEmails: 0 }));
} finally {
  globalThis.fetch = originalFetch;
}
