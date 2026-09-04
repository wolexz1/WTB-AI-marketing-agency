export async function createOrder(env, order) {
  await env.WHATSAPP_AI_GUIDES_DB.prepare(`INSERT INTO whatsapp_ai_orders
    (reference, product_id, amount, currency, first_name, email, cta_location, status, created_at, delivery_key, delivery_expires_at, tracking_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(order.reference, order.productId, order.amount, order.currency, order.firstName, order.email, order.ctaLocation, order.status, order.createdAt, order.deliveryKey, order.deliveryExpiresAt, JSON.stringify(order.tracking || {}))
    .run();
}

export async function getOrder(env, reference) {
  const row = await env.WHATSAPP_AI_GUIDES_DB.prepare("SELECT * FROM whatsapp_ai_orders WHERE reference = ?").bind(reference).first();
  return row ? fromRow(row) : null;
}

export async function markVerified(env, reference, transactionId) {
  const now = new Date().toISOString();
  await env.WHATSAPP_AI_GUIDES_DB.prepare(`UPDATE whatsapp_ai_orders
    SET status = 'verified', verified_at = COALESCE(verified_at, ?), paystack_transaction_id = COALESCE(paystack_transaction_id, ?)
    WHERE reference = ?`).bind(now, String(transactionId || ""), reference).run();
  return getOrder(env, reference);
}

export async function claimDownload(env, reference, limit) {
  const result = await env.WHATSAPP_AI_GUIDES_DB.prepare(`UPDATE whatsapp_ai_orders
    SET download_count = download_count + 1, last_download_at = ?
    WHERE reference = ? AND status = 'verified' AND download_count < ?`)
    .bind(new Date().toISOString(), reference, limit).run();
  return Number(result?.meta?.changes || 0) === 1;
}

export async function claimFulfilment(env, reference, channel) {
  const fields = fulfilmentFields(channel);
  const attemptedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 120000).toISOString();
  const result = await env.WHATSAPP_AI_GUIDES_DB.prepare(`UPDATE whatsapp_ai_orders
    SET ${fields.status} = 'sending', ${fields.attempted} = ?, ${fields.attempts} = ${fields.attempts} + 1, ${fields.error} = NULL
    WHERE reference = ? AND status = 'verified' AND (
      ${fields.status} IN ('pending', 'failed') OR (${fields.status} = 'sending' AND ${fields.attempted} < ?)
    )`).bind(attemptedAt, reference, staleBefore).run();
  return Number(result?.meta?.changes || 0) === 1;
}

export async function completeFulfilment(env, reference, channel) {
  const fields = fulfilmentFields(channel);
  await env.WHATSAPP_AI_GUIDES_DB.prepare(`UPDATE whatsapp_ai_orders
    SET ${fields.status} = 'sent', ${fields.sent} = ?, ${fields.error} = NULL
    WHERE reference = ? AND ${fields.status} = 'sending'`).bind(new Date().toISOString(), reference).run();
}

export async function failFulfilment(env, reference, channel, error) {
  const fields = fulfilmentFields(channel);
  await env.WHATSAPP_AI_GUIDES_DB.prepare(`UPDATE whatsapp_ai_orders
    SET ${fields.status} = 'failed', ${fields.error} = ?
    WHERE reference = ? AND ${fields.status} = 'sending'`).bind(String(error || "Delivery failed").slice(0, 500), reference).run();
}

export async function consumeRateLimit(env, clientIp, limit = 12) {
  const key = String(clientIp || "unknown").slice(0, 128);
  const window = Math.floor(Date.now() / 60000);
  await env.WHATSAPP_AI_GUIDES_DB.prepare(`INSERT INTO whatsapp_ai_rate_limits (rate_key, window_minute, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(rate_key) DO UPDATE SET
      attempts = CASE WHEN window_minute = excluded.window_minute THEN attempts + 1 ELSE 1 END,
      window_minute = excluded.window_minute`).bind(key, window).run();
  const row = await env.WHATSAPP_AI_GUIDES_DB.prepare("SELECT attempts FROM whatsapp_ai_rate_limits WHERE rate_key = ?").bind(key).first();
  return Number(row?.attempts || 0) <= limit;
}

function fromRow(row) {
  let tracking = {};
  try { tracking = JSON.parse(row.tracking_json || "{}"); } catch { tracking = {}; }
  return {
    reference: row.reference,
    productId: row.product_id,
    amount: Number(row.amount),
    currency: row.currency,
    firstName: row.first_name,
    email: row.email,
    ctaLocation: row.cta_location,
    status: row.status,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
    paystackTransactionId: row.paystack_transaction_id,
    deliveryKey: row.delivery_key,
    deliveryExpiresAt: row.delivery_expires_at,
    downloadCount: Number(row.download_count || 0),
    lastDownloadAt: row.last_download_at,
    emailStatus: row.email_status || "pending",
    emailAttemptCount: Number(row.email_attempt_count || 0),
    emailAttemptedAt: row.email_attempted_at,
    emailSentAt: row.email_sent_at,
    metaStatus: row.meta_status || "pending",
    metaAttemptCount: Number(row.meta_attempt_count || 0),
    metaAttemptedAt: row.meta_attempted_at,
    metaSentAt: row.meta_sent_at,
    tracking,
  };
}

function fulfilmentFields(channel) {
  if (channel === "email") return { status: "email_status", attempted: "email_attempted_at", attempts: "email_attempt_count", sent: "email_sent_at", error: "email_last_error" };
  if (channel === "meta") return { status: "meta_status", attempted: "meta_attempted_at", attempts: "meta_attempt_count", sent: "meta_sent_at", error: "meta_last_error" };
  throw new Error("Unknown fulfilment channel");
}
