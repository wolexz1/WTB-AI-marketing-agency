import { ASSETS } from "./product-config.js";
import { claimFulfilment, completeFulfilment, failFulfilment, getOrder, markVerified } from "./order-store.js";

const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function fulfilVerifiedOrder({ env, order, product, requestUrl, request }) {
  const tasks = [];
  if (env.RESEND_API_KEY) tasks.push(deliverChannelWithRetry(env, order.reference, "email", async () => {
    const downloadUrl = await createDownloadUrl(order, product.asset, requestUrl, env);
    await sendPurchaseEmail(env, order, product, downloadUrl);
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

export async function handleWhatsAppGuideWebhook({ request, env, event, waitUntil }) {
  if (!env.WHATSAPP_AI_GUIDES_DB || !env.DOWNLOAD_TOKEN_SECRET) return new Response("Configuration incomplete", { status: 503 });
  const reference = String(event?.data?.reference || "");
  let order = await getOrder(env, reference);
  if (!order) return new Response("Order not found", { status: 404 });
  const { productForId } = await import("./product-config.js");
  const product = productForId(order.productId);
  const data = event.data || {};
  const valid = product && data.status === "success" && Number(data.amount) === order.amount && data.currency === order.currency && data.reference === reference && data.metadata?.product_id === product.id;
  if (!valid) return new Response("Verification pending", { status: 202 });
  if (order.status !== "verified") {
    order = await markVerified(env, reference, data.id);
  }
  const work = fulfilVerifiedOrder({ env, order, product, requestUrl: request.url, request }).catch((error) => console.error("WhatsApp AI Guides fulfilment failed", error));
  if (typeof waitUntil === "function") waitUntil(work);
  else work.catch(() => {});
  return new Response("Verified", { status: 200 });
}

async function sendPurchaseEmail(env, order, product, downloadUrl) {
  const logo = "https://wtbaimarketing.com/assets/whatsapp-ai-guides/wtb-logo.webp";
  const pageUrl = "https://wtbaimarketing.com/whatsapp-ai-guides/";
  const safeName = escapeHtml(order.firstName || "there");
  const safeDownload = escapeHtml(downloadUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `wtb-wa-guides-${order.reference}` },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>",
      to: order.email,
      reply_to: SUPPORT_EMAIL,
      subject: `Your ${product.name} is ready`,
      text: `Hello ${order.firstName || "there"},\n\nYour payment for ${product.name} has been confirmed.\n\nDownload your private guide: ${downloadUrl}\n\nStart here: ${product.firstAction}\n\nIf the file does not open, reply to this email.`,
      html: `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,sans-serif;color:#15171c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #d8e2f2"><tr><td style="padding:28px;background:#0d1018;color:#fff"><img src="${logo}" width="64" height="64" alt="WTB AI Marketing Agency"><h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.1">Your guide is ready.</h1></td></tr><tr><td style="padding:30px"><p>Hello ${safeName},</p><p>Paystack has confirmed your purchase of <strong>${escapeHtml(product.name)}</strong>.</p><p style="margin:28px 0"><a href="${safeDownload}" style="display:inline-block;background:#155dfc;color:#fff;padding:16px 22px;text-decoration:none;font-weight:800">Download your private PDF</a></p><div style="border-left:4px solid #f3b51f;background:#fff8df;padding:15px 17px"><strong>Your first action</strong><br>${escapeHtml(product.firstAction)}</div><p style="font-size:14px;color:#596275">This private link expires for security. If delivery fails, reply to this email or contact ${SUPPORT_EMAIL}.</p><p><a href="https://wa.me/?text=${encodeURIComponent(`I found a practical WhatsApp AI guide for Nigerian businesses: ${pageUrl}`)}">Share the guides with another business owner</a></p></td></tr></table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) throw new Error(`Purchase email failed: ${(await response.text()).slice(0, 300)}`);
  return true;
}

async function deliverChannel(env, reference, channel, operation) {
  if (!await claimFulfilment(env, reference, channel)) return false;
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
