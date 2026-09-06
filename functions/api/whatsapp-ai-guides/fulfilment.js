import { ASSETS } from "./product-config.js";
import { claimFulfilment, completeFulfilment, failFulfilment, getOrder, markVerified } from "./order-store.js";

const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function fulfilVerifiedOrder({ env, order, product, requestUrl, request }) {
  const tasks = [];
  if (env.RESEND_API_KEY) tasks.push(deliverChannelWithRetry(env, order.reference, "email", async () => {
    await sendPurchaseEmail(env, order, product);
  }));
  if (env.META_PIXEL_ID && env.META_CAPI_ACCESS_TOKEN) tasks.push(deliverChannelWithRetry(env, order.reference, "meta", () => sendMetaPurchase({ env, order, product, request, requestUrl })));
  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "One or more fulfilment channels failed");
  return order;
}

export async function sendMetaPurchase({ env, order, product, request, requestUrl }) {
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `purchase_${order.reference}`,
    event_source_url: new URL("/whatsapp-ai-guides/thank-you/", requestUrl).toString(),
    action_source: "website",
    user_data: {
      em: [await sha256(order.email.trim().toLowerCase())],
      client_ip_address: order.tracking?.clientIp || request?.headers?.get("CF-Connecting-IP") || undefined,
      client_user_agent: order.tracking?.userAgent || request?.headers?.get("User-Agent") || undefined,
      fbp: order.tracking?.fbp || undefined,
      fbc: order.tracking?.fbc || undefined,
    },
    custom_data: {
      currency: "NGN",
      value: order.amount / 100,
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
    },
  };
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });
  if (!response.ok) throw new Error(`Meta Purchase failed: ${(await response.text()).slice(0, 300)}`);
  return true;
}

export async function createDownloadUrl(order, asset, requestUrl, env) {
  const ttl = numberEnv(env.WHATSAPP_AI_GUIDES_DOWNLOAD_TTL_SECONDS, 604800, 900, 2592000);
  const orderExpiry = Math.floor(new Date(order.deliveryExpiresAt).getTime() / 1000);
  const exp = Math.min(Math.floor(Date.now() / 1000) + ttl, orderExpiry);
  const token = await signToken({ reference: order.reference, asset, exp }, env.DOWNLOAD_TOKEN_SECRET);
  const url = new URL("/api/whatsapp-ai-guides/download", requestUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function verifyDownloadToken(token, secret) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || !constantTimeEqual(signature, await hmacBase64Url(encoded, secret))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    return payload?.reference && payload?.asset && payload.exp >= Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export async function handleWhatsAppGuideWebhook({ request, env, event }) {
  if (!env.WHATSAPP_AI_GUIDES_DB || !env.WHATSAPP_AI_GUIDES_BUCKET || !env.DOWNLOAD_TOKEN_SECRET || !env.RESEND_API_KEY || !env.FROM_EMAIL) {
    return new Response("Configuration incomplete", { status: 503 });
  }
  const reference = String(event?.data?.reference || "");
  let order = await getOrder(env, reference);
  if (!order) return new Response("Order not found", { status: 404 });
  const { productForId } = await import("./product-config.js");
  const product = productForId(order.productId);
  const data = event.data || {};
  const valid = product && data.status === "success" && Number(data.amount) === order.amount && data.currency === order.currency && data.reference === reference && data.metadata?.product_id === product.id;
  if (!valid) return new Response("Verification pending", { status: 202 });
  try {
    if (!await env.WHATSAPP_AI_GUIDES_BUCKET.head(ASSETS[product.asset].key)) return new Response("Delivery asset unavailable", { status: 503 });
  } catch {
    return new Response("Delivery asset unavailable", { status: 503 });
  }
  if (order.status !== "verified") {
    order = await markVerified(env, reference, data.id);
  }
  try {
    await fulfilVerifiedOrder({ env, order, product, requestUrl: request.url, request });
    return new Response("Verified", { status: 200 });
  } catch (error) {
    console.error("WhatsApp AI Guides fulfilment failed; Paystack should retry", error);
    return new Response("Delivery retry required", { status: 503 });
  }
}

async function sendPurchaseEmail(env, order, product) {
  const logo = "https://wtbaimarketing.com/assets/whatsapp-ai-guides/wtb-logo.webp";
  const pageUrl = "https://wtbaimarketing.com/whatsapp-ai-guides/";
  const wtbUrl = "https://wtbaimarketing.com/";
  const safeName = escapeHtml(order.firstName || "there");
  const safeProductName = escapeHtml(product.name);
  const safeFirstAction = escapeHtml(product.firstAction);
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`I found a practical WhatsApp AI guide that can help business owners respond faster and turn more chats into sales: ${pageUrl}`)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `wtb-wa-guides-${order.reference}` },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>",
      to: order.email,
      reply_to: SUPPORT_EMAIL,
      subject: `Your ${product.name} is ready`,
      text: `Hello ${order.firstName || "there"},\n\nPaystack has confirmed your purchase of ${product.name}. Your private guide was delivered through the confirmation page and should already be in your browser's Downloads list or your device's Downloads folder.\n\nStart here: ${product.firstAction}\n\nCannot find or open the file? Reply to this email and our team will help you.\n\nKnow another WhatsApp Business owner who wants faster replies and fewer missed sales? Share the guides: ${pageUrl}\n\nWTB AI Marketing Agency helps businesses use practical AI to improve customer service, automate repetitive work and grow with better systems: ${wtbUrl}`,
      html: `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,sans-serif;color:#15171c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #d8e2f2"><tr><td style="padding:28px;background:#0d1018;color:#fff"><img src="${logo}" width="64" height="64" alt="WTB AI Marketing Agency"><h1 style="margin:18px 0 6px;font-family:Georgia,serif;font-size:30px;line-height:1.1">Your guide is ready.</h1><p style="margin:0;color:#c9d7ee">Payment confirmed. Your next step starts now.</p></td></tr><tr><td style="padding:30px"><p style="margin-top:0">Hello ${safeName},</p><p>Paystack has confirmed your purchase of <strong>${safeProductName}</strong>. Your private guide was delivered through the confirmation page and should already be on your device.</p><div style="margin:24px 0;padding:18px;border-left:4px solid #155dfc;background:#eef4ff"><strong>Check your download</strong><br><span style="color:#465166">Open your browser's Downloads list or your phone's Downloads folder to find the PDF.</span></div><div style="margin:24px 0;padding:18px;border-left:4px solid #f3b51f;background:#fff8df"><strong>Your first action</strong><br><span style="color:#465166">${safeFirstAction}</span></div><p><strong>Need help?</strong> If you cannot find or open the file, simply reply to this email. Your reply goes directly to the WTB team.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background:#0d1018;color:#fff"><tr><td style="padding:22px"><strong style="font-size:18px">Help another business owner miss fewer sales</strong><p style="margin:8px 0 18px;color:#c9d7ee;line-height:1.55">Know someone handling too many WhatsApp chats manually? Share these practical guides with them.</p><a href="${shareUrl}" style="display:inline-block;background:#20b95a;color:#fff;padding:13px 18px;text-decoration:none;font-weight:800">Share with a WhatsApp Business owner</a></td></tr></table><div style="padding-top:22px;border-top:1px solid #d8e2f2"><strong>Built by WTB AI Marketing Agency</strong><p style="margin:8px 0 18px;color:#596275;line-height:1.6">We help businesses use practical AI to respond faster, improve customer experiences, automate repetitive work and build stronger systems for growth, while keeping people in control.</p><a href="${wtbUrl}" style="color:#155dfc;font-weight:800">Discover how WTB can help your business</a></div><p style="margin:28px 0 0;font-size:13px;color:#6a7280">Purchase reference: ${escapeHtml(order.reference)}</p></td></tr></table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) throw new Error(`Purchase email failed: ${(await response.text()).slice(0, 300)}`);
  return true;
}

async function deliverChannel(env, reference, channel, operation) {
  if (!await claimFulfilment(env, reference, channel)) {
    const current = await getOrder(env, reference);
    const status = channel === "email" ? current?.emailStatus : current?.metaStatus;
    if (status === "sent") return false;
    throw new Error(`${channel} delivery is already in progress`);
  }
  try {
    await operation();
    await completeFulfilment(env, reference, channel);
    return true;
  } catch (error) {
    await failFulfilment(env, reference, channel, error?.message || error);
    throw error;
  }
}

async function deliverChannelWithRetry(env, reference, channel, operation) {
  const delays = retryDelays(env);
  let lastError;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await deliverChannel(env, reference, channel, operation);
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) await sleep(delays[attempt]);
    }
  }
  throw lastError;
}

function retryDelays(env) {
  const configured = String(env.WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS || "750,2500")
    .split(",")
    .map((value) => Math.min(10000, Math.max(0, Number(value))))
    .filter(Number.isFinite)
    .slice(0, 4);
  return configured.length ? configured : [750, 2500];
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function numberEnv(value, fallback, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback; }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
async function sha256(value) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function signToken(payload, secret) { const encoded = base64UrlEncode(JSON.stringify(payload)); return `${encoded}.${await hmacBase64Url(encoded, secret)}`; }
async function hmacBase64Url(value, secret) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)); let binary = ""; new Uint8Array(signature).forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlEncode(value) { let binary = ""; new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlDecode(value) { const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4); const binary = atob(base64); return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }

export { ASSETS };
