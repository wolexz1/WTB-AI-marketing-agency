const SENDER_SUBSCRIBERS_ENDPOINT = "https://api.sender.net/v2/subscribers";

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

    return json({
      ok: true,
      message: "You are in. Check your inbox for your first WTB growth note.",
    });
  } catch (error) {
    console.error("Newsletter subscription error", error);
    return json({ ok: false, message: "Something interrupted the signup. Please try again." }, 500);
  }
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
