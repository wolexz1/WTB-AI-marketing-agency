const SENDER_SUBSCRIBERS_ENDPOINT = "https://api.sender.net/v2/subscribers";
const KIT_SUBSCRIBERS_ENDPOINT = "https://api.kit.com/v4/subscribers";
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const NEWSLETTER_REPLY_TO = "wolexzthebrand@gmail.com";

export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get("Origin");
    const requestUrl = new URL(request.url);

    if (origin && new URL(origin).hostname !== requestUrl.hostname) {
      return json({ ok: false, message: "This subscription request could not be verified." }, 403);
    }

    const contentType = request.headers.get("content-type") || "";
    const input = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());

    const email = String(input.email || "").trim().toLowerCase();
    const firstname = String(input.firstname || "").trim().slice(0, 80);
    const honeypot = String(input.company || "").trim();
    const startedAt = Number(input.startedAt || 0);
    const consent = input.consent === true || input.consent === "true" || input.consent === "on";
    const elapsed = Date.now() - startedAt;

    if (honeypot || !startedAt || elapsed < 1500 || elapsed > 2 * 60 * 60 * 1000) {
      return json({ ok: true, message: "Please check your inbox for the next step." });
    }

    if (!consent) {
      return json({ ok: false, message: "Please confirm that you want to receive the newsletter." }, 400);
    }

    if (!isValidEmail(email)) {
      return json({ ok: false, message: "Please enter a valid email address." }, 400);
    }

    if (env.NEWSLETTER_PROVIDER === "kit") {
      return subscribeWithKit(env, { email, firstname, requestUrl, input });
    }

    if (!env.SENDER_API_TOKEN || !env.SENDER_GROUP_ID) {
      console.error("Sender newsletter environment variables are missing");
      return json({ ok: false, message: "Subscription is temporarily unavailable. Please try again shortly." }, 503);
    }

    const payload = {
      email,
      firstname,
      groups: [env.SENDER_GROUP_ID],
      fields: {
        "{$signup_source}": cleanField(input.source, "WTB blog popup"),
        "{$signup_path}": cleanField(input.path, "/blog/"),
        "{$signup_utm_source}": cleanField(input.utmSource, "direct"),
        "{$signup_utm_medium}": cleanField(input.utmMedium, "organic"),
        "{$signup_utm_campaign}": cleanField(input.utmCampaign, "organic"),
      },
      trigger_automation: true,
    };

    const response = await fetch(SENDER_SUBSCRIBERS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDER_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const senderBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const responseText = JSON.stringify(senderBody).toLowerCase();
      if (response.status === 409 || responseText.includes("already") || responseText.includes("exist")) {
        return json({ ok: true, message: "You are already on the list. Watch your inbox for the next WTB growth note." });
      }

      console.error("Sender subscription failed", response.status, senderBody);
      return json({ ok: false, message: "We could not add you just now. Please try again." }, 502);
    }

    const welcomeSent = await sendWelcomeEmail(env, { email, firstname });

    return json({
      ok: true,
      message: welcomeSent
        ? "You are in. Check your inbox for your WTB welcome email."
        : "You are in. Your welcome email is being prepared.",
    });
  } catch (error) {
    console.error("Newsletter subscription error", error);
    return json({ ok: false, message: "Something interrupted the signup. Please try again." }, 500);
  }
}

async function subscribeWithKit(env, { email, firstname, requestUrl, input }) {
  if (!env.KIT_API_KEY || !/^\d+$/.test(String(env.KIT_FORM_ID || ""))) {
    console.error("Kit newsletter environment variables are missing or invalid");
    return json({ ok: false, message: "Subscription is temporarily unavailable. Please try again shortly." }, 503);
  }

  const headers = {
    "X-Kit-Api-Key": env.KIT_API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const created = await fetch(KIT_SUBSCRIBERS_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, first_name: firstname, state: "inactive" }),
  });
  if (!created.ok) {
    console.error("Kit subscriber creation failed", created.status);
    return json({ ok: false, message: "We could not add you just now. Please try again." }, 502);
  }

  const referrer = new URL(requestUrl.origin);
  const path = String(input.path || "/");
  referrer.pathname = path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 200) : "/";
  for (const [key, value] of [
    ["utm_source", input.utmSource],
    ["utm_medium", input.utmMedium],
    ["utm_campaign", input.utmCampaign],
  ]) {
    if (value) referrer.searchParams.set(key, cleanField(value, "").slice(0, 100));
  }

  const added = await fetch(`https://api.kit.com/v4/forms/${env.KIT_FORM_ID}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, referrer: referrer.href }),
  });
  if (!added.ok) {
    console.error("Kit form subscription failed", added.status);
    return json({ ok: false, message: "We could not add you just now. Please try again." }, 502);
  }

  return json({ ok: true, message: "Check your inbox to confirm your WTB subscription." });
}

async function sendWelcomeEmail(env, subscriber) {
  if (!env.RESEND_API_KEY) {
    console.error("Newsletter welcome email skipped: RESEND_API_KEY is not configured");
    return false;
  }

  const firstName = escapeHtml(subscriber.firstname || "there");
  const from = env.FROM_EMAIL || "WTB AI Marketing <hello@wtbaimarketing.com>";
  const replyTo = env.NEWSLETTER_REPLY_TO || NEWSLETTER_REPLY_TO;
  const subject = "You're in - welcome to the WTB AI Growth Letter";
  const text = [
    `Hello ${subscriber.firstname || "there"},`,
    "",
    "Welcome to the WTB AI Growth Letter.",
    "You will receive practical ideas on AI, WhatsApp, content and customer growth for Nigerian businesses.",
    "",
    "Start here: https://wtbaimarketing.com/?utm_source=welcome_email&utm_medium=email&utm_campaign=wtb_ai_growth_letter",
    "",
    "Reply to this email anytime. Your response goes directly to Wole.",
    "",
    "Wole and the WTB team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#eef2f8;color:#15171c;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Practical AI ideas and smarter growth moves for your business.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f8;width:100%;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #dde3ee;">
          <tr><td style="height:7px;background:#f3b51f;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:24px 32px;background:#0d1018;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="58"><img src="https://wtbaimarketing.com/assets/logo-wtb.png" width="52" height="52" alt="WTB" style="display:block;border:1px solid #f3b51f;border-radius:50%;"></td>
              <td style="padding-left:13px;color:#ffffff;"><strong style="font-size:18px;">WTB AI Marketing</strong><br><span style="color:#9fb7ee;font-size:11px;font-weight:700;">THE AI GROWTH LETTER</span></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:42px 32px;background:#155dfc;color:#ffffff;">
            <p style="margin:0 0 12px;color:#dce7ff;font-size:12px;font-weight:800;">WELCOME TO THE LIST</p>
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:39px;line-height:1.05;">You just gave your business an AI advantage.</h1>
            <p style="margin:17px 0 0;color:#edf3ff;font-size:17px;line-height:1.55;">Practical ideas to help you attract customers, work smarter and grow with AI.</p>
          </td></tr>
          <tr><td style="padding:38px 32px;">
            <p style="margin:0 0 18px;font-size:17px;line-height:1.7;">Hello ${firstName},</p>
            <p style="margin:0 0 22px;color:#3f4754;font-size:16px;line-height:1.7;">Welcome to the WTB AI Growth Letter. You will get clear, useful ideas on AI, WhatsApp, content and customer growth, written for Nigerian businesses that need results, not noise.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;border-left:4px solid #f3b51f;background:#f7f9fd;"><tr><td style="padding:22px;">
              <p style="margin:0 0 8px;color:#155dfc;font-size:11px;font-weight:800;">WHAT TO EXPECT</p>
              <h2 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:24px;">One useful idea. One smarter next move.</h2>
              <p style="margin:0;color:#3f4754;line-height:1.65;">Short lessons, proven tools and practical examples you can put to work in your business immediately.</p>
            </td></tr></table>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#155dfc" style="border-radius:5px;">
              <a href="https://wtbaimarketing.com/?utm_source=welcome_email&amp;utm_medium=email&amp;utm_campaign=wtb_ai_growth_letter" style="display:inline-block;padding:16px 24px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">Explore WTB AI Marketing &rarr;</a>
            </td></tr></table>
            <p style="margin:28px 0 0;color:#3f4754;font-size:15px;line-height:1.65;">Reply to this email anytime. Your response goes directly to Wole.<br><br><strong style="color:#15171c;">Wole and the WTB team</strong></p>
          </td></tr>
          <tr><td style="padding:30px 32px;background:#0d1018;color:#ffffff;">
            <p style="margin:0 0 8px;color:#f3b51f;font-size:11px;font-weight:800;">WTB AI MARKETING AGENCY</p>
            <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;">Helping ambitious businesses turn AI into practical growth.</p>
            <p style="margin:0;color:#aeb8ca;font-size:12px;line-height:1.7;"><a href="https://www.instagram.com/wolexzthebrand/" style="color:#ffffff;">Instagram</a>&nbsp;&nbsp; <a href="https://www.facebook.com/wolexztrickz" style="color:#ffffff;">Facebook</a>&nbsp;&nbsp; <a href="https://www.linkedin.com/in/wolexxz/" style="color:#ffffff;">LinkedIn</a>&nbsp;&nbsp; <a href="https://www.tiktok.com/@wolexzthebrand" style="color:#ffffff;">TikTok</a>&nbsp;&nbsp; <a href="https://wa.me/2348097585489" style="color:#ffffff;">WhatsApp</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: subscriber.email,
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    console.error("Newsletter welcome email failed", response.status, await response.text());
    return false;
  }

  return true;
}

export function onRequestGet() {
  return json({ ok: false, message: "Use the newsletter form to subscribe." }, 405);
}

function cleanField(value, fallback) {
  const clean = String(value || "").trim().slice(0, 180);
  return clean || fallback;
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
