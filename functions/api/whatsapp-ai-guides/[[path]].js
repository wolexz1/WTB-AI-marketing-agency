import { ASSETS, PRODUCT_CURRENCY, REFERENCE_PATTERN, productForId } from "./product-config.js";
import { createDownloadUrl, fulfilVerifiedOrder, verifyDownloadToken } from "./fulfilment.js";
import { claimDownload, consumeRateLimit, createOrder, getOrder, markVerified } from "./order-store.js";

export async function onRequest(context) {
  const { request, env } = context;
  const waitUntil = typeof context.waitUntil === "function" ? context.waitUntil.bind(context) : undefined;
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  try {
    if (request.method === "POST" && pathname === "/api/whatsapp-ai-guides/checkout") return initializeCheckout(request, env);
    if (request.method === "GET" && pathname === "/api/whatsapp-ai-guides/verify") return verifyOrder(request, env, waitUntil);
    if (request.method === "GET" && pathname === "/api/whatsapp-ai-guides/download") return downloadAsset(request, env);
    return json({ message: "Not found" }, 404);
  } catch (error) {
    console.error("WhatsApp AI Guides request failed", error);
    return json({ message: "We could not complete that request. Please try again." }, 500);
  }
}

async function initializeCheckout(request, env) {
  const missing = requiredEnv(env, ["PAYSTACK_SECRET_KEY", "WHATSAPP_AI_GUIDES_DB", "WHATSAPP_AI_GUIDES_BUCKET", "DOWNLOAD_TOKEN_SECRET", "RESEND_API_KEY", "FROM_EMAIL"]);
  if (missing) return htmlError("Secure checkout is being configured. Please try again shortly.", 503);
  const form = await request.formData();
  const firstName = cleanText(form.get("firstName"), 80);
  const email = cleanEmail(form.get("email"));
  const product = productForId(cleanText(form.get("product"), 32));
  const ctaLocation = cleanText(form.get("ctaLocation"), 48) || "page";
  if (!firstName || !email || !product) return htmlError("Please enter a valid first name and email, then choose a guide.", 400);
  let asset;
  try {
    asset = await env.WHATSAPP_AI_GUIDES_BUCKET.head(ASSETS[product.asset].key);
  } catch {
    return htmlError("This guide is temporarily unavailable. No payment has been taken. Please try again shortly.", 503);
  }
  if (!asset) return htmlError("This guide is temporarily unavailable. No payment has been taken. Please try again shortly.", 503);
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!await consumeRateLimit(env, clientIp)) return htmlError("Please wait a minute before starting another checkout.", 429);
  const reference = `wtbwa_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const deliveryKey = crypto.randomUUID().replace(/-/g, "");
  const deliveryTtl = Math.min(2592000, Math.max(900, Number(env.WHATSAPP_AI_GUIDES_DOWNLOAD_TTL_SECONDS) || 604800));
  const callback = new URL("/whatsapp-ai-guides/thank-you/", request.url);
  callback.searchParams.set("reference", reference);
  const order = {
    reference, productId: product.id, amount: product.amount, currency: PRODUCT_CURRENCY,
    firstName, email, ctaLocation, status: "initialized", createdAt: new Date().toISOString(),
    verifiedAt: null, deliveryKey, deliveryExpiresAt: new Date(Date.now() + deliveryTtl * 1000).toISOString(),
    tracking: { clientIp, userAgent: request.headers.get("User-Agent") || "", fbp: cleanText(form.get("fbp"), 180), fbc: cleanText(form.get("fbc"), 180) },
  };
  await createOrder(env, order);
  const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email, amount: String(product.amount), currency: PRODUCT_CURRENCY, reference, callback_url: callback.toString(),
      metadata: { product_family: "whatsapp-ai-guides", product_id: product.id, first_name: firstName, cta_location: ctaLocation },
    }),
  });
  const result = await paystack.json().catch(() => null);
  const authorizationUrl = result?.data?.authorization_url;
  if (!paystack.ok || !result?.status || !authorizationUrl) return htmlError("Secure checkout could not start. Please try again shortly.", 502);
  const headers = new Headers({ Location: authorizationUrl });
  headers.append("Set-Cookie", deliveryCookie(reference, deliveryKey, deliveryTtl));
  return new Response(null, { status: 302, headers });
}

async function verifyOrder(request, env, waitUntil) {
  if (requiredEnv(env, ["PAYSTACK_SECRET_KEY", "WHATSAPP_AI_GUIDES_DB", "DOWNLOAD_TOKEN_SECRET"])) return json({ verified: false, message: "Delivery is being configured." }, 503);
  const url = new URL(request.url);
  const reference = cleanReference(url.searchParams.get("reference"));
  const deliveryKey = deliveryKeyFromCookie(request.headers.get("Cookie"), reference);
  if (!reference || !deliveryKey) return json({ verified: false, message: "Missing delivery details." }, 400);
  const order = await getOrder(env, reference);
  const product = productForId(order?.productId);
  if (!order || !product) return json({ verified: false, message: "Order not found." }, 404);
  if (!constantTimeEqual(deliveryKey, order.deliveryKey) || new Date(order.deliveryExpiresAt).getTime() < Date.now()) return json({ verified: false, message: "This delivery session has expired. Contact WTB support with your Paystack reference." }, 403);
  if (order.status !== "verified") {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
    const result = await response.json().catch(() => null);
    const transaction = result?.data;
    const valid = response.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === order.amount && transaction.currency === order.currency && transaction.reference === reference && transaction.metadata?.product_id === product.id;
    if (!valid) return json({ verified: false, message: "Payment is still being confirmed." }, 200);
    Object.assign(order, await markVerified(env, reference, transaction.id));
  }
  const fulfilment = fulfilVerifiedOrder({ env, order, product, requestUrl: request.url, request }).catch((error) => console.error("WhatsApp AI Guides fulfilment failed", error));
  if (typeof waitUntil === "function") waitUntil(fulfilment);
  else await fulfilment;
  return json({ verified: true, reference, product: { id: product.id, name: product.name, amount: order.amount }, downloadUrl: await createDownloadUrl(order, product.asset, request.url, env), eventId: `purchase_${reference}` });
}

async function downloadAsset(request, env) {
  if (requiredEnv(env, ["WHATSAPP_AI_GUIDES_DB", "WHATSAPP_AI_GUIDES_BUCKET", "DOWNLOAD_TOKEN_SECRET"])) return json({ message: "Delivery is being configured." }, 503);
  const payload = await verifyDownloadToken(new URL(request.url).searchParams.get("token"), env.DOWNLOAD_TOKEN_SECRET);
  const asset = ASSETS[payload?.asset];
  if (!payload || !asset) return json({ message: "This private download link has expired." }, 403);
  const order = await getOrder(env, payload.reference);
  const product = productForId(order?.productId);
  if (!order || order.status !== "verified" || !product || product.asset !== payload.asset) return json({ message: "This file is not available for this order." }, 403);
  const limit = Math.min(20, Math.max(3, Number(env.WHATSAPP_AI_GUIDES_DOWNLOAD_LIMIT) || 8));
  const object = await env.WHATSAPP_AI_GUIDES_BUCKET.get(asset.key);
  if (!object) return json({ message: "This file is being prepared. Please contact WTB support." }, 503);
  if (!await claimDownload(env, payload.reference, limit)) return json({ message: "This file has reached its download limit. Please contact WTB support." }, 403);
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `attachment; filename="${asset.filename}"`);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(object.body, { headers });
}

function requiredEnv(env, keys) { return keys.some((key) => !env[key]); }
function cleanText(value, max) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, max); }
function cleanEmail(value) { const email = cleanText(value, 254).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
function cleanReference(value) { const reference = String(value || ""); return REFERENCE_PATTERN.test(reference) ? reference : ""; }
function deliveryCookie(reference, key, maxAge) { return `wtbwa_delivery_${reference}=${key}; Max-Age=${Math.floor(maxAge)}; Path=/api/whatsapp-ai-guides/; HttpOnly; Secure; SameSite=Lax`; }
function deliveryKeyFromCookie(header, reference) {
  const name = `wtbwa_delivery_${reference}=`;
  const key = String(header || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(name))?.slice(name.length) || "";
  return /^[a-f0-9]{32}$/.test(key) ? key : "";
}
function privateHeaders(contentType) { return { "Content-Type": contentType, "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" }; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: privateHeaders("application/json; charset=utf-8") }); }
function htmlError(message, status) { return new Response(`<!doctype html><html><body><h1>Checkout could not continue</h1><p>${escapeHtml(message)}</p><p><a href="/whatsapp-ai-guides/#choose">Return to the guides</a></p></body></html>`, { status, headers: privateHeaders("text/html; charset=utf-8") }); }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index); return result === 0; }
