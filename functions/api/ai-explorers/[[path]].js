const PRODUCT_NAME = "AI Explorers Family Kit";
const PRODUCT_PRICE = 750000;
const PRODUCT_CURRENCY = "NGN";
const ORDER_PREFIX = "ai-explorers:order:";
const RATE_PREFIX = "ai-explorers:rate:";
const SUPPORT_EMAIL = "wolexzzoluk@gmail.com";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  try {
    if (request.method === "POST" && pathname === "/api/ai-explorers/initialize") {
      return initializeOrder(request, env);
    }
    if (request.method === "GET" && pathname === "/api/ai-explorers/verify") {
      return verifyOrder(request, env);
    }
    if (request.method === "GET" && pathname === "/api/ai-explorers/download") {
      return downloadProduct(request, env);
    }
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
  const ctaLocation = cleanText(payload?.ctaLocation, 40) || "page";
  if (!firstName || !email) return json({ message: "Please enter a valid first name and email address." }, 400);

  const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateKey = `${RATE_PREFIX}${clientKey}`;
  const attempts = Number(await env.AI_EXPLORERS_ORDERS.get(rateKey) || 0);
  if (attempts >= 5) return json({ message: "Please wait a minute before starting another checkout." }, 429);
  await env.AI_EXPLORERS_ORDERS.put(rateKey, String(attempts + 1), { expirationTtl: 60 });

  const reference = `aiexp_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const order = {
    reference,
    product: PRODUCT_NAME,
    amount: PRODUCT_PRICE,
    currency: PRODUCT_CURRENCY,
    firstName,
    email,
    ctaLocation,
    status: "initialized",
    createdAt: new Date().toISOString(),
    emailSentAt: null,
    downloadCount: 0,
  };
  await putOrder(env, order);

  const callback = new URL("/ai-explorers/thank-you/", request.url);
  callback.searchParams.set("reference", reference);
  const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: String(PRODUCT_PRICE),
      currency: PRODUCT_CURRENCY,
      reference,
      callback_url: callback.toString(),
      metadata: { product: PRODUCT_NAME, first_name: firstName, cta_location: ctaLocation },
    }),
  });
  const result = await paystack.json().catch(() => null);
  if (!paystack.ok || !result?.status || !result?.data?.access_code) {
    console.error("AI Explorers Paystack initialize failed", result);
    return json({ message: "Secure checkout could not start. Please try again shortly." }, 502);
  }
  return json({ reference, accessCode: result.data.access_code });
}

async function verifyOrder(request, env) {
  const configError = configurationError(env, ["PAYSTACK_SECRET_KEY", "AI_EXPLORERS_ORDERS", "DOWNLOAD_TOKEN_SECRET"]);
  if (configError) return configError;
  const reference = cleanReference(new URL(request.url).searchParams.get("reference"));
  if (!reference) return json({ verified: false, message: "Missing payment reference." }, 400);
  const outcome = await confirmPayment(reference, request.url, env);
  if (!outcome.verified) return json({ verified: false, message: outcome.message || "Payment is still pending." }, outcome.status || 200);
  return json({ verified: true, reference, downloadUrl: outcome.downloadUrl });
}

async function downloadProduct(request, env) {
  const configError = configurationError(env, ["AI_EXPLORERS_ORDERS", "AI_EXPLORERS_BUCKET", "DOWNLOAD_TOKEN_SECRET"]);
  if (configError) return configError;
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = await verifyToken(token, env.DOWNLOAD_TOKEN_SECRET);
  if (!payload?.reference || payload.exp < Math.floor(Date.now() / 1000)) return json({ message: "This download link has expired. Please contact support for help." }, 403);

  const order = await getOrder(env, payload.reference);
  if (!order || order.status !== "verified") return json({ message: "This order is not available for download." }, 403);
  const limit = numberEnv(env.AI_EXPLORERS_DOWNLOAD_LIMIT, 3, 1, 20);
  if ((order.downloadCount || 0) >= limit) return json({ message: "This download has reached its limit. Please contact support for help." }, 403);

  const objectKey = env.AI_EXPLORERS_OBJECT_KEY || "ai-explorers/AI-Explorers-Customer-Package.zip";
  const object = await env.AI_EXPLORERS_BUCKET.get(objectKey);
  if (!object) {
    console.error("AI Explorers product object not found", objectKey);
    return json({ message: "Your secure download is being prepared. Please contact support if this continues." }, 503);
  }
  order.downloadCount = (order.downloadCount || 0) + 1;
  order.lastDownloadAt = new Date().toISOString();
  await putOrder(env, order);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", 'attachment; filename="AI-Explorers-Family-Kit.zip"');
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function confirmPayment(reference, requestUrl, env) {
  const order = await getOrder(env, reference);
  if (!order || order.product !== PRODUCT_NAME) return { verified: false, status: 404, message: "Order not found." };
  if (order.status === "verified") {
    const downloadUrl = await createDownloadUrl(reference, requestUrl, env);
    if (!order.emailSentAt) {
      const sent = await sendPurchaseEmail(env, order, downloadUrl);
      if (sent) {
        order.emailSentAt = new Date().toISOString();
        await putOrder(env, order);
      }
    }
    return { verified: true, downloadUrl };
  }
  const paystack = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const result = await paystack.json().catch(() => null);
  const transaction = result?.data;
  const valid = paystack.ok && result?.status && transaction?.status === "success" && Number(transaction.amount) === PRODUCT_PRICE && transaction.currency === PRODUCT_CURRENCY && transaction.reference === reference;
  if (!valid) return { verified: false, status: 200, message: "Payment is still being confirmed." };

  order.status = "verified";
  order.verifiedAt = new Date().toISOString();
  order.paystackTransactionId = String(transaction.id || "");
  order.receiptNumber = transaction.receipt_number || null;
  const downloadUrl = await createDownloadUrl(reference, requestUrl, env);
  order.downloadUrlIssuedAt = new Date().toISOString();
  await putOrder(env, order);
  if (!order.emailSentAt) {
    const sent = await sendPurchaseEmail(env, order, downloadUrl);
    if (sent) {
      order.emailSentAt = new Date().toISOString();
      await putOrder(env, order);
    }
  }
  return { verified: true, downloadUrl };
}

async function createDownloadUrl(reference, requestUrl, env) {
  const ttl = numberEnv(env.AI_EXPLORERS_DOWNLOAD_TTL_SECONDS, 604800, 900, 2592000);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const token = await signToken({ reference, exp }, env.DOWNLOAD_TOKEN_SECRET);
  const url = new URL("/api/ai-explorers/download", requestUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendPurchaseEmail(env, order, downloadUrl) {
  if (!env.RESEND_API_KEY) {
    console.error("AI Explorers email skipped: RESEND_API_KEY is not configured.");
    return false;
  }
  const from = env.FROM_EMAIL || "WTB AI Marketing <onboarding@resend.dev>";
  const safeName = escapeHtml(order.firstName);
  const safeDownload = escapeHtml(downloadUrl);
  const text = `Thank you for purchasing AI Explorers. Your payment has been confirmed, and your family kit is ready.\n\nDownload your files: ${downloadUrl}\n\nBegin with START-HERE.md, then open the Parent Companion before starting Mission 1.\n\nThis download link is connected to your order and may expire. Please do not share it publicly.\n\nIf you have trouble accessing your files, reply to this email or contact ${SUPPORT_EMAIL}.`;
  const html = `<!doctype html><html><body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#16233a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d3dfef;border-radius:18px;overflow:hidden"><tr><td style="padding:28px;background:#071b46;color:#ffffff"><img src="https://wtbaimarketing.com/assets/ai-explorers/ai-explorers-cover.png" width="72" height="108" alt="AI Explorers cover" style="display:block;border-radius:6px"><h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.05">Your AI Explorers Family Kit is ready</h1></td></tr><tr><td style="padding:30px"><p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:16px;line-height:1.7">Thank you for purchasing AI Explorers. Your payment has been confirmed, and your family kit is ready.</p><p style="font-size:16px;line-height:1.7">Begin with <strong>START-HERE.md</strong>, then open the Parent Companion before starting Mission 1.</p><p style="margin:28px 0"><a href="${safeDownload}" style="display:inline-block;padding:15px 20px;border-radius:12px;background:#f5b942;color:#071b46;font-weight:800;text-decoration:none">Download AI Explorers</a></p><p style="font-size:14px;line-height:1.6;color:#526076">This download link is connected to your order and may expire. Please do not share it publicly.</p><p style="font-size:14px;line-height:1.6;color:#526076">If you have trouble accessing your files, reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></td></tr></table></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: order.email, reply_to: SUPPORT_EMAIL, subject: "Your AI Explorers Family Kit is ready", text, html }),
  });
  if (!response.ok) console.error("AI Explorers purchase email failed", await response.text());
  return response.ok;
}

function configurationError(env, required) {
  const missing = required.filter((key) => !env[key]);
  return missing.length ? json({ message: "Product checkout is being configured. Please try again shortly." }, 503) : null;
}

async function getOrder(env, reference) {
  const value = await env.AI_EXPLORERS_ORDERS.get(`${ORDER_PREFIX}${reference}`);
  return value ? JSON.parse(value) : null;
}

function putOrder(env, order) {
  return env.AI_EXPLORERS_ORDERS.put(`${ORDER_PREFIX}${order.reference}`, JSON.stringify(order));
}

function cleanText(value, max) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function cleanReference(value) {
  const reference = String(value || "");
  return /^aiexp_[A-Za-z0-9]+$/.test(reference) ? reference : "";
}

function numberEnv(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function hmac(value, secret, algorithm = "SHA-256") {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signToken(payload, secret) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await hmac(encoded, secret)}`;
}

async function verifyToken(token, secret) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = await hmac(encoded, secret);
  if (!constantTimeEqual(signature, expected)) return null;
  try { return JSON.parse(base64UrlDecode(encoded)); } catch { return null; }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
