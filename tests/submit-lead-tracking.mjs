import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestPost } from "../functions/api/submit.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function makeRequest({ spam = false } = {}) {
  const startedAt = Date.now() - 5000;
  const data = new FormData();
  data.set("name", "Test Founder");
  data.set("email", "founder@example.com");
  data.set("message", "I need a campaign review.");
  data.set("_form_started_at", String(startedAt));
  data.set("_form_token", `wtb-${startedAt}-wtbaimarketing.com`);
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
