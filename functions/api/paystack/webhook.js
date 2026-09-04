import { handleWhatsAppGuideWebhook } from "../whatsapp-ai-guides/fulfilment.js";

const PRODUCTS = {
  workbook: { name: "AI Explorers Workbook", amount: 450000 },
  complete: { name: "AI Explorers Complete Family Library", amount: 750000 },
};
const PRODUCT_CURRENCY = "NGN";
const ORDER_PREFIX = "ai-explorers:order:";
const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = typeof context.waitUntil === "function" ? context.waitUntil.bind(context) : undefined;
  if (!env.PAYSTACK_SECRET_KEY || !env.DOWNLOAD_TOKEN_SECRET) return new Response("Configuration incomplete", { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  if (!constantTimeEqual(signature, await hmacHex(rawBody, env.PAYSTACK_SECRET_KEY))) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(rawBody);
  if (event?.event !== "charge.success") return new Response("Ignored", { status: 200 });
  const reference = String(event?.data?.reference || "");
  if (/^wtbwa_[A-Za-z0-9]+$/.test(reference)) {
    return handleWhatsAppGuideWebhook({ request, env, rawBody, event, waitUntil });
  }
  if (!/^aiexp_[A-Za-z0-9]+$/.test(reference)) return new Response("Ignored", { status: 200 });
  if (!env.AI_EXPLORERS_ORDERS) return new Response("Configuration incomplete", { status: 503 });
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
  const safeName = escapeHtml(order.firstName || "there");
  const isComplete = order.productId === "complete";
  const itemCopy = isComplete ? "Your Family Library includes three separate PDFs: the interactive workbook, a low-ink workbook, and the Parent Companion." : "Your full-colour, fillable AI Explorers Interactive Workbook is ready.";
  const productPageUrl = new URL("/ai-explorers/", requestUrl).toString();
  const shareMessage = `I found AI Explorers - a parent-guided AI workbook for children aged 5-11. It is a thoughtful way to help children use AI safely and wisely: ${productPageUrl}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const safeShareUrl = escapeHtml(shareUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>", to: order.email, reply_to: SUPPORT_EMAIL,
      subject: "Your AI Explorers library is ready",
      text: `Hello ${order.firstName || "there"},\n\nThank you for purchasing ${product.name}. Your payment has been confirmed.\n\n${itemCopy}\n\nYour files should now be downloading. Please check your browser Downloads folder or Files app to confirm they arrived. If a file is missing, reply to this email and we will help.\n\nKnow another parent who would value a smarter, safer introduction to AI for their child? Share AI Explorers with them: ${productPageUrl}\n\nNeed help? Contact ${SUPPORT_EMAIL}.`,
      html: `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#16233a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d3dfef;border-radius:18px;overflow:hidden"><tr><td style="padding:28px;background:#071b46;color:#ffffff"><img src="https://wtbaimarketing.com/assets/ai-explorers/ai-explorers-cover-ages-5-11.png" width="72" height="108" alt="AI Explorers cover" style="display:block;border-radius:6px"><h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.05">Your AI Explorers files are ready</h1></td></tr><tr><td style="padding:30px"><p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:16px;line-height:1.7">Thank you for purchasing <strong>${escapeHtml(product.name)}</strong>. Your payment has been confirmed.</p><p style="font-size:16px;line-height:1.7">${escapeHtml(itemCopy)}</p><div style="margin:24px 0;padding:16px 18px;border-left:4px solid #14b8a6;background:#f1fffc;color:#234851;font-size:15px;line-height:1.6"><strong>Check your downloads.</strong><br>Your files should now be downloading. On a phone, check your Files or Downloads app. On a computer, check your browser Downloads folder. If a file is missing, reply to this email and we will help.</div><p style="font-size:16px;line-height:1.7">Know a parent, teacher or family friend who would value a smarter, safer introduction to AI for a child? Please pass AI Explorers on.</p><p style="margin:28px 0"><a href="${safeShareUrl}" style="display:inline-block;padding:15px 20px;border-radius:12px;background:#14b8a6;color:#06243b;font-weight:800;text-decoration:none">Share AI Explorers with a parent</a></p><p style="font-size:14px;line-height:1.6;color:#526076">Need help? Reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`,
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
