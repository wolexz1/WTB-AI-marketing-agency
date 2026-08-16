const PRODUCTS = {
  workbook: { name: "AI Explorers Workbook", amount: 450000 },
  complete: { name: "AI Explorers Complete Family Library", amount: 750000 },
};
const PRODUCT_CURRENCY = "NGN";
const ORDER_PREFIX = "ai-explorers:order:";
const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function onRequestPost({ request, env }) {
  if (!env.PAYSTACK_SECRET_KEY || !env.AI_EXPLORERS_ORDERS || !env.DOWNLOAD_TOKEN_SECRET) return new Response("Configuration incomplete", { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  if (!constantTimeEqual(signature, await hmacHex(rawBody, env.PAYSTACK_SECRET_KEY))) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(rawBody);
  if (event?.event !== "charge.success") return new Response("Ignored", { status: 200 });
  const reference = String(event?.data?.reference || "");
  if (!/^aiexp_[A-Za-z0-9]+$/.test(reference)) return new Response("Ignored", { status: 200 });
  const stored = await env.AI_EXPLORERS_ORDERS.get(`${ORDER_PREFIX}${reference}`);
  if (!stored) return new Response("Order not found", { status: 404 });
  const order = JSON.parse(stored);
  const product = PRODUCTS[order.productId];
  if (!product) return new Response("Unknown product", { status: 400 });
  if (order.status !== "verified") {
    const verified = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
    const result = await verified.json().catch(() => null);
    const transaction = result?.data;
    const valid = verified.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === product.amount && transaction.currency === PRODUCT_CURRENCY && transaction.reference === reference;
    if (!valid) return new Response("Verification pending", { status: 202 });
    order.status = "verified";
    order.verifiedAt = new Date().toISOString();
    order.paystackTransactionId = String(transaction.id || "");
    await env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${reference}`, JSON.stringify(order));
  }
  await sendEmailIfNeeded(env, order, product, request.url);
  return new Response("Verified", { status: 200 });
}

async function sendEmailIfNeeded(env, order, product, requestUrl) {
  if (order.emailSentAt || !env.RESEND_API_KEY) return;
  const libraryUrl = await createLibraryUrl(order.reference, requestUrl, env);
  const safeName = escapeHtml(order.firstName || "there");
  const safeUrl = escapeHtml(libraryUrl);
  const isComplete = order.productId === "complete";
  const itemCopy = isComplete ? "Your private library contains three separate PDFs: the interactive workbook, low-ink workbook and Parent Companion. Open only what you need, on any phone, tablet or computer." : "Your private library contains your full-colour AI Explorers Workbook PDF.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>", to: order.email, reply_to: SUPPORT_EMAIL,
      subject: "Your AI Explorers library is ready",
      text: `Hello ${order.firstName || "there"},\n\nThank you for purchasing ${product.name}. Your payment has been confirmed.\n\nOpen your private library: ${libraryUrl}\n\n${itemCopy}\n\nThis access link is connected to your order and expires after a limited time. Please do not share it publicly. Need help? Contact ${SUPPORT_EMAIL}.`,
      html: `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#16233a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d3dfef;border-radius:18px;overflow:hidden"><tr><td style="padding:28px;background:#071b46;color:#ffffff"><img src="https://wtbaimarketing.com/assets/ai-explorers/ai-explorers-cover.png" width="72" height="108" alt="AI Explorers cover" style="display:block;border-radius:6px"><h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.05">Your AI Explorers library is ready</h1></td></tr><tr><td style="padding:30px"><p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:16px;line-height:1.7">Thank you for purchasing <strong>${escapeHtml(product.name)}</strong>. Your payment has been confirmed.</p><p style="font-size:16px;line-height:1.7">${escapeHtml(itemCopy)}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:15px 20px;border-radius:12px;background:#f5b942;color:#071b46;font-weight:800;text-decoration:none">Open your private library</a></p><p style="font-size:14px;line-height:1.6;color:#526076">This access link is connected to your order and expires after a limited time. Please do not share it publicly.</p><p style="font-size:14px;line-height:1.6;color:#526076">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) { console.error("AI Explorers webhook email failed", await response.text()); return; }
  order.emailSentAt = new Date().toISOString();
  await env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${order.reference}`, JSON.stringify(order));
}

async function createLibraryUrl(reference, requestUrl, env) {
  const ttl = numberEnv(env.AI_EXPLORERS_DOWNLOAD_TTL_SECONDS, 604800, 900, 2592000);
  const encoded = base64UrlEncode(JSON.stringify({ reference, exp: Math.floor(Date.now() / 1000) + ttl }));
  const url = new URL("/ai-explorers/library/", requestUrl);
  url.searchParams.set("token", `${encoded}.${await hmacBase64Url(encoded, env.DOWNLOAD_TOKEN_SECRET)}`);
  return url.toString();
}
async function hmacBase64Url(value, secret) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)); let binary = ""; new Uint8Array(signature).forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlEncode(value) { let binary = ""; new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function numberEnv(value, fallback, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback; }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
async function hmacHex(value, secret) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)); return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index); return result === 0; }
