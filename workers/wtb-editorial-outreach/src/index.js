const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runWeeklyOutreach(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
      const latestRun = await env.OUTREACH_DB.prepare("SELECT * FROM outreach_runs ORDER BY started_at DESC LIMIT 1").first();
      const queue = await env.OUTREACH_DB.prepare("SELECT status, COUNT(*) AS count FROM prospects GROUP BY status").all();
      return json({ ok: true, schedule: "Wednesday 09:00 UTC / 10:00 WAT", latestRun, queue: queue.results });
    }

    if (url.pathname === "/admin/prospects" && request.method === "POST") {
      if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
      return addVerifiedProspect(request, env);
    }

    if (url.pathname === "/admin/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
      return json(await runWeeklyOutreach(env));
    }

    return new Response("WTB editorial outreach worker", { status: 404 });
  }
};

async function runWeeklyOutreach(env) {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const now = new Date();
  const maxInitial = Math.min(Math.max(Number(env.MAX_INITIAL_OUTREACH_PER_RUN) || 5, 1), 5);
  const followUpAfterDays = Math.max(Number(env.FOLLOW_UP_AFTER_DAYS) || 6, 5);
  let initialSent = 0;
  let followUpsSent = 0;
  let skippedReason = null;

  await env.OUTREACH_DB.prepare(
    "INSERT INTO outreach_runs (id, started_at) VALUES (?, ?)"
  ).bind(runId, startedAt).run();

  try {
    if (!env.RESEND_API_KEY || !env.ADMIN_TOKEN) {
      skippedReason = "Missing RESEND_API_KEY or ADMIN_TOKEN secret.";
      return { ok: false, skippedReason, initialSent, followUpsSent };
    }

    const initialProspects = await env.OUTREACH_DB.prepare(
      "SELECT * FROM prospects WHERE status = 'queued' AND verified_at IS NOT NULL ORDER BY verified_at ASC LIMIT ?"
    ).bind(maxInitial).all();

    for (const prospect of initialProspects.results) {
      const result = await sendProspectEmail(env, prospect, "initial", runId);
      if (result.ok) initialSent += 1;
    }

    const dueAt = new Date(now.getTime() - followUpAfterDays * DAY_MS).toISOString();
    const followUps = await env.OUTREACH_DB.prepare(
      "SELECT * FROM prospects WHERE status = 'sent' AND follow_up_sent_at IS NULL AND initial_sent_at <= ? ORDER BY initial_sent_at ASC LIMIT 5"
    ).bind(dueAt).all();

    for (const prospect of followUps.results) {
      const result = await sendProspectEmail(env, prospect, "follow-up", runId);
      if (result.ok) followUpsSent += 1;
    }

    if (initialSent || followUpsSent) await sendAdminSummary(env, { initialSent, followUpsSent, runId });
    if (!initialSent && !followUpsSent) skippedReason = "No verified prospects were due for a first email or one permitted follow-up.";
    return { ok: true, initialSent, followUpsSent, skippedReason };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown outreach worker error";
    await env.OUTREACH_DB.prepare(
      "UPDATE outreach_runs SET completed_at = ?, initial_sent_count = ?, follow_up_sent_count = ?, skipped_reason = ?, error_message = ? WHERE id = ?"
    ).bind(new Date().toISOString(), initialSent, followUpsSent, skippedReason, errorMessage, runId).run();
    throw error;
  } finally {
    await env.OUTREACH_DB.prepare(
      "UPDATE outreach_runs SET completed_at = ?, initial_sent_count = ?, follow_up_sent_count = ?, skipped_reason = ? WHERE id = ?"
    ).bind(new Date().toISOString(), initialSent, followUpsSent, skippedReason, runId).run();
  }
}

async function sendProspectEmail(env, prospect, kind, runId) {
  const isFollowUp = kind === "follow-up";
  const subject = isFollowUp ? `Following up: ${prospect.subject}` : prospect.subject;
  const text = isFollowUp ? prospect.follow_up_text : prospect.message_text;
  if (!text?.trim() || !isValidEmail(prospect.email)) {
    await env.OUTREACH_DB.prepare("UPDATE prospects SET status = 'failed', notes = ?, updated_at = ? WHERE id = ?")
      .bind("Missing a valid recipient or approved personalised email copy.", new Date().toISOString(), prospect.id).run();
    return { ok: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `wtb-outreach-${runId}-${prospect.id}-${kind}`
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [prospect.email],
      reply_to: env.ADMIN_EMAIL,
      subject,
      text
    })
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    await env.OUTREACH_DB.prepare("UPDATE prospects SET status = 'failed', notes = ?, updated_at = ? WHERE id = ?")
      .bind(`Resend rejected ${kind}: ${detail}`, new Date().toISOString(), prospect.id).run();
    return { ok: false };
  }

  const body = await response.json();
  const now = new Date().toISOString();
  const query = isFollowUp
    ? "UPDATE prospects SET follow_up_sent_at = ?, resend_message_id = ?, updated_at = ? WHERE id = ?"
    : "UPDATE prospects SET status = 'sent', initial_sent_at = ?, resend_message_id = ?, updated_at = ? WHERE id = ?";
  await env.OUTREACH_DB.prepare(query).bind(now, body.id || null, now, prospect.id).run();
  return { ok: true };
}

async function sendAdminSummary(env, { initialSent, followUpsSent, runId }) {
  const text = `WTB's weekly editorial outreach run is complete. Initial pitches sent: ${initialSent}. One permitted follow-up sent: ${followUpsSent}. Run ID: ${runId}. Replies are intentionally not auto-sent: respond directly from your inbox with the exact information requested.`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `wtb-outreach-summary-${runId}` },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [env.ADMIN_EMAIL], subject: "WTB weekly backlink outreach report", text })
  });
}

async function addVerifiedProspect(request, env) {
  const prospect = await request.json();
  const required = ["publicationName", "email", "contactSource", "verifiedAt", "subject", "messageText", "followUpText"];
  const missing = required.filter((field) => !String(prospect[field] || "").trim());
  if (missing.length || !isValidEmail(prospect.email)) return json({ error: "A verified recipient and approved personalised copy are required.", missing }, 400);

  const id = crypto.randomUUID();
  await env.OUTREACH_DB.prepare(
    "INSERT INTO prospects (id, publication_name, contact_name, email, contact_source, verified_at, subject, message_text, follow_up_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, prospect.publicationName.trim(), String(prospect.contactName || "").trim() || null, prospect.email.trim().toLowerCase(), prospect.contactSource.trim(), prospect.verifiedAt, prospect.subject.trim(), prospect.messageText.trim(), prospect.followUpText.trim()).run();
  return json({ ok: true, id }, 201);
}

function isAuthorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
