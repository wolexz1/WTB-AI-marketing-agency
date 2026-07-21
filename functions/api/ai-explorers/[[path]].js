const PRODUCT_CURRENCY = "NGN";
const ORDER_PREFIX = "ai-explorers:order:";
const RATE_PREFIX = "ai-explorers:rate:";
const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

const PRODUCTS = {
  workbook: {
    id: "workbook",
    name: "AI Explorers Workbook",
    amount: 450000,
    libraryLabel: "Your AI Explorers Workbook",
    assets: ["workbook"],
  },
  complete: {
    id: "complete",
    name: "AI Explorers Family Library",
    amount: 750000,
    libraryLabel: "Your AI Explorers Family Library",
    assets: ["workbook", "low-ink", "parent-companion"],
  },
};

const ASSETS = {
  workbook: { key: "ai-explorers/AI-Explorers-Interactive-Workbook.pdf", filename: "AI-Explorers-Interactive-Workbook.pdf", title: "AI Explorers Interactive Workbook", description: "The full-colour, fillable 37-page interactive workbook.", kind: "Interactive workbook" },
  "low-ink": { key: "ai-explorers/AI-Explorers-Low-Ink-Workbook.pdf", filename: "AI-Explorers-Low-Ink-Workbook.pdf", title: "AI Explorers Low-Ink Workbook", description: "A 37-page printer-friendly edition for easier home printing.", kind: "Low-ink workbook" },
  "parent-companion": { key: "ai-explorers/AI-Explorers-Parent-Companion.pdf", filename: "AI-Explorers-Parent-Companion.pdf", title: "AI Explorers Parent Companion", description: "Quick-start guidance, discussion prompts and answer support for parents.", kind: "Parent companion" },
};

export async function onRequest({ request, env }) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  try {
    if (request.method === "POST" && pathname === "/api/ai-explorers/initialize") return initializeOrder(request, env);
    if (request.method === "GET" && pathname === "/api/ai-explorers/verify") return verifyOrder(request, env);
    if (request.method === "GET" && pathname === "/api/ai-explorers/library") return getLibrary(request, env);
    if (request.method === "GET" && pathname === "/api/ai-explorers/download") return downloadAsset(request, env);
    return json({ message: "Not found" }, 404);
  } catch (error) {
    console.error("AI Explorers request failed", error);
    return json({ message: "We could not complete that request yet. Please try again." }, 500);
  }
}

async function initializeOrder(request, env) {
  const configError = configurationError(env, ["PAYSTACK_SECRET_KEY", "AI_EXPLORERS_ORDERS"]);
  if (configError) return configError;
  const payload = await request.json().catch(() => null);
  const firstName = cleanText(payload?.firstName, 80);
  const email = cleanEmail(payload?.email);
  const product = PRODUCTS[cleanText(payload?.product, 24)];
  const ctaLocation = cleanText(payload?.ctaLocation, 40) || "page";
  if (!firstName || !email || !product) return json({ message: "Please choose a product and enter a valid first name and email address." }, 400);

  const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateKey = `${RATE_PREFIX}${clientKey}`;
  const attempts = Number(await env.AI_EXPLORERS_ORDERS.get(rateKey) || 0);
  // Families, schools and organisations may buy several copies in one session.
  // Keep a modest ceiling to deter abuse without blocking genuine multiple orders.
  if (attempts >= numberEnv(env.AI_EXPLORERS_CHECKOUT_RATE_LIMIT, 20, 5, 60)) return json({ message: "Please wait a minute before starting another checkout." }, 429);
  await env.AI_EXPLORERS_ORDERS.put(rateKey, String(attempts + 1), { expirationTtl: 60 });

  const reference = `aiexp_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const order = { reference, productId: product.id, product: product.name, amount: product.amount, currency: PRODUCT_CURRENCY, firstName, email, ctaLocation, status: "initialized", createdAt: new Date().toISOString(), emailSentAt: null, downloads: {} };
  await putOrder(env, order);
  const callback = new URL("/ai-explorers/thank-you/", request.url);
  callback.searchParams.set("reference", reference);
  const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST", headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: String(product.amount), currency: PRODUCT_CURRENCY, reference, callback_url: callback.toString(), metadata: { product_id: product.id, product: product.name, first_name: firstName, cta_location: ctaLocation } }),
  });
  const result = await paystack.json().catch(() => null);
  if (!paystack.ok || !result?.status || !result?.data?.access_code) {
    console.error("AI Explorers Paystack initialize failed", result);
    return json({ message: "Secure checkout could not start. Please try again shortly." }, 502);
  }
  return json({ reference, accessCode: result.data.access_code, product: { id: product.id, name: product.name, amount: product.amount } });
}

async function verifyOrder(request, env) {
  const configError = configurationError(env, ["PAYSTACK_SECRET_KEY", "AI_EXPLORERS_ORDERS", "DOWNLOAD_TOKEN_SECRET"]);
  if (configError) return configError;
  const reference = cleanReference(new URL(request.url).searchParams.get("reference"));
  if (!reference) return json({ verified: false, message: "Missing payment reference." }, 400);
  const outcome = await confirmPayment(reference, request.url, env);
  if (!outcome.verified) return json({ verified: false, message: outcome.message || "Payment is still pending." }, outcome.status || 200);
  return json({
    verified: true,
    reference,
    product: outcome.product,
    libraryUrl: outcome.libraryUrl,
    // Start the core workbook immediately; the library still holds any extra editions.
    downloadUrl: await createAssetUrl(reference, "workbook", request.url, env),
  });
}

async function getLibrary(request, env) {
  const configError = configurationError(env, ["AI_EXPLORERS_ORDERS", "DOWNLOAD_TOKEN_SECRET"]);
  if (configError) return configError;
  const payload = await verifiedTokenFromRequest(request, env);
  if (!payload) return json({ message: "This access link has expired. Please contact support for help." }, 403);
  const order = await getOrder(env, payload.reference);
  const product = productForOrder(order);
  if (!order || order.status !== "verified" || !product) return json({ message: "This order is not available." }, 403);
  const items = await Promise.all(product.assets.map(async (assetId) => {
    const asset = ASSETS[assetId];
    return { id: assetId, title: asset.title, description: asset.description, kind: asset.kind, url: await createAssetUrl(order.reference, assetId, request.url, env) };
  }));
  return json({ product: { name: product.libraryLabel, id: product.id }, firstName: order.firstName, expiresAt: new Date(payload.exp * 1000).toISOString(), items });
}

async function downloadAsset(request, env) {
  const configError = configurationError(env, ["AI_EXPLORERS_ORDERS", "AI_EXPLORERS_BUCKET", "DOWNLOAD_TOKEN_SECRET"]);
  if (configError) return configError;
  const payload = await verifiedTokenFromRequest(request, env);
  const asset = ASSETS[payload?.asset];
  if (!payload || !asset) return json({ message: "This download link has expired. Please return to your library or contact support." }, 403);
  const order = await getOrder(env, payload.reference);
  const product = productForOrder(order);
  if (!order || order.status !== "verified" || !product?.assets.includes(payload.asset)) return json({ message: "This file is not available for this order." }, 403);

  const limit = numberEnv(env.AI_EXPLORERS_DOWNLOAD_LIMIT, 3, 1, 20);
  const downloads = order.downloads || {};
  if ((downloads[payload.asset] || 0) >= limit) return json({ message: "This file has reached its download limit. Please contact support for help." }, 403);
  const object = await env.AI_EXPLORERS_BUCKET.get(asset.key);
  if (!object) {
    console.error("AI Explorers product object not found", asset.key);
    return json({ message: "This file is being prepared. Please contact support if this continues." }, 503);
  }
  downloads[payload.asset] = (downloads[payload.asset] || 0) + 1;
  order.downloads = downloads;
  order.lastDownloadAt = new Date().toISOString();
  await putOrder(env, order);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `attachment; filename="${asset.filename}"`);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function confirmPayment(reference, requestUrl, env) {
  const order = await getOrder(env, reference);
  const product = productForOrder(order);
  if (!order || !product) return { verified: false, status: 404, message: "Order not found." };
  if (order.status !== "verified") {
    const paystack = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
    const result = await paystack.json().catch(() => null);
    const transaction = result?.data;
    const valid = paystack.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === product.amount && transaction.currency === PRODUCT_CURRENCY && transaction.reference === reference;
    if (!valid) return { verified: false, status: 200, message: "Payment is still being confirmed." };
    order.status = "verified";
    order.verifiedAt = new Date().toISOString();
    order.paystackTransactionId = String(transaction.id || "");
    order.receiptNumber = transaction.receipt_number || null;
    await putOrder(env, order);
  }
  const libraryUrl = await createLibraryUrl(reference, requestUrl, env);
  if (!order.emailSentAt) {
    const sent = await sendPurchaseEmail(env, order, product, libraryUrl);
    if (sent) { order.emailSentAt = new Date().toISOString(); await putOrder(env, order); }
  }
  return { verified: true, libraryUrl, product: { id: product.id, name: product.name, amount: product.amount } };
}

function productForOrder(order) { return order ? PRODUCTS[order.productId] : null; }
async function createLibraryUrl(reference, requestUrl, env) {
  const token = await signExpiryToken({ reference }, env);
  const url = new URL("/ai-explorers/library/", requestUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
async function createAssetUrl(reference, asset, requestUrl, env) {
  const token = await signExpiryToken({ reference, asset }, env);
  const url = new URL("/api/ai-explorers/download", requestUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
async function signExpiryToken(payload, env) {
  const ttl = numberEnv(env.AI_EXPLORERS_DOWNLOAD_TTL_SECONDS, 604800, 900, 2592000);
  return signToken({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }, env.DOWNLOAD_TOKEN_SECRET);
}
async function verifiedTokenFromRequest(request, env) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = await verifyToken(token, env.DOWNLOAD_TOKEN_SECRET);
  return payload?.reference && payload.exp >= Math.floor(Date.now() / 1000) ? payload : null;
}

async function sendPurchaseEmail(env, order, product, libraryUrl) {
  if (!env.RESEND_API_KEY) { console.error("AI Explorers email skipped: RESEND_API_KEY is not configured."); return false; }
  const from = env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>";
  const safeName = escapeHtml(order.firstName);
  const safeUrl = escapeHtml(libraryUrl);
  const isComplete = product.id === "complete";
  const itemCopy = isComplete ? "Your private library contains three separate PDFs: the 37-page interactive workbook, a low-ink workbook, and the Parent Companion. Open the format you need on a phone, tablet, laptop, or PDF app." : "Your private library contains your full-colour, fillable 37-page AI Explorers Interactive Workbook PDF.";
  const text = `Hello ${order.firstName},\n\nThank you for purchasing ${product.name}. Your payment has been confirmed.\n\nOpen your private library: ${libraryUrl}\n\n${itemCopy}\n\nThis access link is connected to your order, expires after a limited time, and should not be shared publicly. Need help? Contact ${SUPPORT_EMAIL}.`;
  const html = `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#16233a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d3dfef;border-radius:18px;overflow:hidden"><tr><td style="padding:28px;background:#071b46;color:#ffffff"><img src="https://wtbaimarketing.com/assets/ai-explorers/ai-explorers-cover.png" width="72" height="108" alt="AI Explorers cover" style="display:block;border-radius:6px"><h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.05">Your AI Explorers library is ready</h1></td></tr><tr><td style="padding:30px"><p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:16px;line-height:1.7">Thank you for purchasing <strong>${escapeHtml(product.name)}</strong>. Your payment has been confirmed.</p><p style="font-size:16px;line-height:1.7">${escapeHtml(itemCopy)}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:15px 20px;border-radius:12px;background:#f5b942;color:#071b46;font-weight:800;text-decoration:none">Open your private library</a></p><p style="font-size:14px;line-height:1.6;color:#526076">This access link is connected to your order and expires after a limited time. Please do not share it publicly.</p><p style="font-size:14px;line-height:1.6;color:#526076">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: order.email, reply_to: SUPPORT_EMAIL, subject: "Your AI Explorers library is ready", text, html }) });
  if (!response.ok) console.error("AI Explorers purchase email failed", await response.text());
  return response.ok;
}

function configurationError(env, required) { const missing = required.filter((key) => !env[key]); return missing.length ? json({ message: "Product checkout is being configured. Please try again shortly." }, 503) : null; }
async function getOrder(env, reference) { const value = await env.AI_EXPLORERS_ORDERS.get(`${ORDER_PREFIX}${reference}`); return value ? JSON.parse(value) : null; }
function putOrder(env, order) { return env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${order.reference}`, JSON.stringify(order)); }
function cleanText(value, max) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, max); }
function cleanEmail(value) { const email = cleanText(value, 254).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
function cleanReference(value) { const reference = String(value || ""); return /^aiexp_[A-Za-z0-9]+$/.test(reference) ? reference : ""; }
function numberEnv(value, fallback, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
function base64UrlEncode(value) { const bytes = new TextEncoder().encode(value); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlDecode(value) { const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4); const binary = atob(base64); return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))); }
async function hmac(value, secret) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)); let binary = ""; new Uint8Array(signature).forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
async function signToken(payload, secret) { const encoded = base64UrlEncode(JSON.stringify(payload)); return `${encoded}.${await hmac(encoded, secret)}`; }
async function verifyToken(token, secret) { const [encoded, signature] = token.split("."); if (!encoded || !signature || !constantTimeEqual(signature, await hmac(encoded, secret))) return null; try { return JSON.parse(base64UrlDecode(encoded)); } catch { return null; } }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index); return result === 0; }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
