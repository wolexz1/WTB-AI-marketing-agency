import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestPost } from "../functions/api/submit.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function makeRequest({ spam = false, readiness = false } = {}) {
  const startedAt = Date.now() - 5000;
  const data = new FormData();
  data.set("name", "Test Founder");
  data.set("email", "founder@example.com");
  data.set("message", "I need a campaign review.");
  data.set("_form_started_at", String(startedAt));
  data.set("_form_token", `wtb-${startedAt}-wtbaimarketing.com`);
  if (readiness) {
    data.set("_subject", "AI readiness fix plan quotation request");
    data.set("_next", "/ai-business-readiness-check/thank-you/");
    data.set("service", "AI business readiness fix plan");
    data.append("selected_fix[]", "WhatsApp AI assistant");
    data.append("selected_fix[]", "AI call receptionist and follow-up");
    data.append("selected_fix[]", "AI-assisted email automation");
    data.append("selected_fix[]", "Marketing growth plan");
    data.set("assessment", "WhatsApp replies: no; After-hours calls: no; Email updates: no; Marketing results: no");
  }
  if (spam) data.set("_honey", "spam");
  return new Request("https://wtbaimarketing.com/api/submit", { method: "POST", body: data });
}

test("successful brief sets a short-lived lead marker", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  const response = await onRequestPost({ request: makeRequest(), env: { RESEND_API_KEY: "test" } });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://wtbaimarketing.com/thank-you/");
  assert.match(response.headers.get("set-cookie"), /^wtb_brief_received=1;/);
});

test("rejected spam does not set a lead marker", async () => {
  const response = await onRequestPost({ request: makeRequest({ spam: true }), env: {} });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("email failure does not set a lead marker", async () => {
  globalThis.fetch = async () => new Response("failed", { status: 500 });
  const response = await onRequestPost({ request: makeRequest(), env: { RESEND_API_KEY: "test" } });
  assert.equal(response.headers.get("set-cookie"), null);
});

test("readiness plan sends selected fixes once and confirms a quote, not an invoice", async () => {
  const emails = [];
  globalThis.fetch = async (_, options) => {
    emails.push(JSON.parse(options.body));
    return new Response("{}", { status: 200 });
  };
  const response = await onRequestPost({ request: makeRequest({ readiness: true }), env: { RESEND_API_KEY: "test" } });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://wtbaimarketing.com/ai-business-readiness-check/thank-you/");
  assert.match(response.headers.get("set-cookie"), /Path=\/ai-business-readiness-check\/thank-you\//);
  assert.equal(emails.length, 2);
  assert.match(emails[0].text, /WhatsApp AI assistant, AI call receptionist and follow-up, AI-assisted email automation, Marketing growth plan/);
  assert.match(emails[0].text, /WhatsApp replies: no; After-hours calls: no; Email updates: no; Marketing results: no/);
  assert.match(emails[1].text, /seven calendar days/);
  assert.match(emails[1].text, /invoice after you approve/);
});
