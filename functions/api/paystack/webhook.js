const PRODUCT_NAME = "AI Explorers Family Kit";
const PRODUCT_PRICE = 750000;
const PRODUCT_CURRENCY = "NGN";
const ORDER_PREFIX = "ai-explorers:order:";
const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function onRequestPost({ request, env }) {
  if (!env.PAYSTACK_SECRET_KEY || !env.AI_EXPLORERS_ORDERS || !env.DOWNLOAD_TOKEN_SECRET) return new Response("Configuration incomplete", { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const expected = await hmacHex(rawBody, env.PAYSTACK_SECRET_KEY);
  if (!constantTimeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(rawBody);
  if (event?.event !== "charge.success") return new Response("Ignored", { status: 200 });
  const reference = String(event?.data?.reference || "");
  if (!/^aiexp_[A-Za-z0-9]+$/.test(reference)) return new Response("Ignored", { status: 200 });
  const stored = await env.AI_EXPLORERS_ORDERS.get(`${ORDER_PREFIX}${reference}`);
  if (!stored) return new Response("Order not found", { status: 404 });
  const order = JSON.parse(stored);
  if (order.status === "verified") {
    await sendEmailIfNeeded(env, order, request.url);
    return new Response("Already verified", { status: 200 });
  }

  const verified = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
  const result = await verified.json().catch(() => null);
  const transaction = result?.data;
  const valid = verified.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === PRODUCT_PRICE && transaction.currency === PRODUCT_CURRENCY && transaction.reference === reference && order.product === PRODUCT_NAME;
  if (!valid) return new Response("Verification pending", { status: 202 });

  order.status = "verified";
  order.verifiedAt = new Date().toISOString();
  order.paystackTransactionId = String(transaction.id || "");
  await env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${reference}`, JSON.stringify(order));
  await sendEmailIfNeeded(env, order, request.url);
  return new Response("Verified", { status: 200 });
}

async function sendEmailIfNeeded(env, order, requestUrl) {
  if (order.emailSentAt || !env.RESEND_API_KEY) return;
  const downloadUrl = await createDownloadUrl(order.reference, requestUrl, env);
  const safeName = escapeHtml(order.firstName || "there");
  const safeDownload = escapeHtml(downloadUrl);
  const from = env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: order.email,
      reply_to: SUPPORT_EMAIL,
      subject: "Your AI Explorers Family Kit is ready",
      text: `Hello ${order.firstName || "there"},\n\nThank you for purchasing AI Explorers. Your payment has been confirmed. Download your Family Kit: ${downloadUrl}\n\nBegin with START-HERE.md, then open the Parent Companion before starting Mission 1. This secure link may expire, so please do not share it publicly.\n\nNeed help? Reply to this email or contact ${SUPPORT_EMAIL}.`,
      html: `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#16233a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d3dfef;border-radius:18px;overflow:hidden"><tr><td style="padding:28px;background:#071b46;color:#ffffff"><img src="https://wtbaimarketing.com/assets/ai-explorers/ai-explorers-cover.png" width="72" height="108" alt="AI Explorers cover" style="display:block;border-radius:6px"><h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.05">Your AI Explorers Family Kit is ready</h1></td></tr><tr><td style="padding:30px"><p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:16px;line-height:1.7">Thank you for purchasing AI Explorers. Your payment has been confirmed, and your family kit is ready.</p><p style="font-size:16px;line-height:1.7">Begin with <strong>START-HERE.md</strong>, then open the Parent Companion before starting Mission 1.</p><p style="margin:28px 0"><a href="${safeDownload}" style="display:inline-block;padding:15px 20px;border-radius:12px;background:#f5b942;color:#071b46;font-weight:800;text-decoration:none">Download AI Explorers</a></p><p style="font-size:14px;line-height:1.6;color:#526076">This secure link may expire. Please do not share it publicly.</p><p style="font-size:14px;line-height:1.6;color:#526076">Need help? Reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) {
    console.error("AI Explorers webhook email failed", await response.text());
    return;
  }
  order.emailSentAt = new Date().toISOString();
  await env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${order.reference}`, JSON.stringify(order));
}

async function createDownloadUrl(reference, requestUrl, env) {
  const ttl = numberEnv(env.AI_EXPLORERS_DOWNLOAD_TTL_SECONDS, 604800, 900, 2592000);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const encoded = base64UrlEncode(JSON.stringify({ reference, exp }));
  const signature = await hmacBase64Url(encoded, env.DOWNLOAD_TOKEN_SECRET);
  const url = new URL("/api/ai-explorers/download", requestUrl);
  url.searchParams.set("token", `${encoded}.${signature}`);
  return url.toString();
}

async function hmacBase64Url(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  let binary = "";
  new Uint8Array(signature).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncode(value) {
  let binary = "";
  new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function numberEnv(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}
