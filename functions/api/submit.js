const ADMIN_EMAIL = "wolexzthebrand@gmail.com";
const THANK_YOU_PATH = "/thank-you/";
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();

    if (String(formData.get("_honey") || "").trim()) {
      return Response.redirect(new URL(THANK_YOU_PATH, request.url), 303);
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return friendlyError("Email setup is almost ready", "The website form is connected, but the email sending key has not been added in Cloudflare yet. Please message us on WhatsApp so we can take your brief immediately.");
    }

    const lead = collectLead(formData);
    if (!lead.email) {
      return friendlyError("Email address is missing", "Please go back and add your email address so we can reply to your brief.");
    }

    const attachments = await collectAttachments(formData);
    const skippedFiles = attachments.skipped.length
      ? `\n\nFiles not attached because of size limit:\n${attachments.skipped.map((file) => `- ${file}`).join("\n")}`
      : "";

    const subject = lead.subject || "New WTB website enquiry";
    const adminText = buildAdminText(lead, skippedFiles);
    const adminHtml = toHtml(adminText);
    const visitorText = buildVisitorText(lead);
    const visitorHtml = toHtml(visitorText);

    const adminResult = await sendEmail({
      apiKey,
      from: env.FROM_EMAIL || "WTB AI Marketing Agency <onboarding@resend.dev>",
      to: env.ADMIN_EMAIL || ADMIN_EMAIL,
      replyTo: lead.email,
      subject,
      text: adminText,
      html: adminHtml,
      attachments: attachments.items,
    });

    if (!adminResult.ok) {
      console.error("WTB form admin email failed", await adminResult.text());
      return friendlyError("We could not send the brief yet", "Please message us on WhatsApp so we can collect your details immediately. We are checking the email connection.");
    }

    const visitorResult = await sendEmail({
      apiKey,
      from: env.FROM_EMAIL || "WTB AI Marketing Agency <onboarding@resend.dev>",
      to: lead.email,
      replyTo: env.ADMIN_EMAIL || ADMIN_EMAIL,
      subject: lead.isWebsiteBrief ? "Your WTB website brief and payment details" : "WTB has received your brief",
      text: visitorText,
      html: visitorHtml,
    });

    if (!visitorResult.ok) {
      console.error("WTB form autoresponse failed", await visitorResult.text());
    }

    const next = safeNextUrl(formData.get("_next"), request.url);
    return Response.redirect(next, 303);
  } catch (error) {
    console.error("WTB form handler error", error);
    return friendlyError("Something interrupted the form", "Please message us on WhatsApp so we can collect your brief immediately.");
  }
}

export function onRequestGet({ request }) {
  return Response.redirect(new URL("/contact/", request.url), 302);
}

function collectLead(formData) {
  const fields = {};
  const multi = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      continue;
    }

    const cleanKey = key.replace(/\[\]$/, "");
    const cleanValue = String(value || "").trim();

    if (key.endsWith("[]")) {
      if (!multi[cleanKey]) {
        multi[cleanKey] = [];
      }
      if (cleanValue) {
        multi[cleanKey].push(cleanValue);
      }
      continue;
    }

    if (cleanValue) {
      fields[cleanKey] = cleanValue;
    }
  }

  const isWebsiteBrief = (fields._subject || "").toLowerCase().includes("website");
  return {
    ...fields,
    ...Object.fromEntries(Object.entries(multi).map(([key, values]) => [key, values.join(", ")])),
    email: fields.email || "",
    name: fields.name || "Website visitor",
    subject: fields._subject || "New WTB project brief",
    isWebsiteBrief,
  };
}

async function collectAttachments(formData) {
  const items = [];
  const skipped = [];
  let totalSize = 0;

  for (const [, value] of formData.entries()) {
    if (!(value instanceof File) || !value.name || value.size === 0) {
      continue;
    }

    if (totalSize + value.size > MAX_ATTACHMENT_BYTES) {
      skipped.push(`${value.name} (${formatBytes(value.size)})`);
      continue;
    }

    totalSize += value.size;
    const buffer = await value.arrayBuffer();
    items.push({
      filename: value.name,
      content: arrayBufferToBase64(buffer),
    });
  }

  return { items, skipped };
}

async function sendEmail({ apiKey, from, to, replyTo, subject, text, html, attachments = [] }) {
  const body = {
    from,
    to,
    subject,
    text,
    html,
  };

  if (replyTo) {
    body.reply_to = replyTo;
  }

  if (attachments.length) {
    body.attachments = attachments;
  }

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildAdminText(lead, skippedFiles) {
  const rows = Object.entries(lead)
    .filter(([key]) => !key.startsWith("_") && key !== "isWebsiteBrief" && key !== "subject")
    .map(([key, value]) => `${labelize(key)}: ${value}`)
    .join("\n");

  return `New WTB form submission\n\n${rows}${skippedFiles}`;
}

function buildVisitorText(lead) {
  if (lead.isWebsiteBrief) {
    const baseBudget = lead.base_budget_amount || "NGN 150,000";
    const addons = lead.selected_addons || "No paid add-ons selected.";
    const finalBudget = lead.final_budget_amount || baseBudget;

    return `Thank you for sending your website brief to WTB AI Marketing Agency.

We have received your details and will review your project.

Your base website budget is: ${baseBudget}
Add-ons selected: ${addons}
Your final calculated payment amount is: ${finalBudget}

If anything is missing, do not worry. We can create the missing copy, images, brand direction, page structure, SEO keywords, and other website materials for you so we do not waste time.

To proceed, kindly make payment of ${finalBudget} to:
Bank: GT Bank
Account Name: Olukoya Oluwole
Account Number: 0116506079

After payment, please send your payment confirmation receipt to wolexzthebrand@gmail.com or WhatsApp +234 809 758 5489.

Once confirmed, we will advise the next step for your website project.`;
  }

  return `Thank you for contacting WTB AI Marketing Agency.

We have received your brief and will review your goal, audience, timeline, and budget.

Our team will reply with the best next step. For urgent follow-up, message us on WhatsApp: +234 809 758 5489.`;
}

function safeNextUrl(value, requestUrl) {
  const fallback = new URL(THANK_YOU_PATH, requestUrl);
  if (!value) {
    return fallback;
  }

  try {
    const next = new URL(String(value), requestUrl);
    const current = new URL(requestUrl);
    const allowedHosts = new Set([
      current.hostname,
      "wtb-ai-marketing-agency.pages.dev",
    ]);
    return allowedHosts.has(next.hostname) ? next : fallback;
  } catch {
    return fallback;
  }
}

function toHtml(text) {
  return `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#111827;max-width:680px">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function labelize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function friendlyError(title, message) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | WTB</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#090d14;color:#f8fafc;display:grid;min-height:100vh;place-items:center;padding:24px}
    main{max-width:720px;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:36px;background:linear-gradient(145deg,#111827,#071629);box-shadow:0 22px 70px rgba(0,0,0,.28)}
    h1{font-size:clamp(34px,7vw,72px);line-height:.95;margin:0 0 18px;font-family:Georgia,serif}
    p{font-size:18px;line-height:1.7;color:#d7e5f8}
    a{display:inline-block;margin-top:20px;background:#22c55e;color:#07110b;padding:15px 22px;border-radius:999px;text-decoration:none;font-weight:800}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <a href="https://wa.me/2348097585489?text=Hello%20WTB%2C%20I%20tried%20submitting%20a%20website%20brief%20and%20need%20help.">Chat with us on WhatsApp</a>
  </main>
</body>
</html>`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
