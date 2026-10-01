import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestPost } from "../functions/api/newsletter.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function request(email = "reader@example.com") {
  return new Request("https://wtbaimarketing.com/api/newsletter", {
    method: "POST",
    headers: { Origin: "https://wtbaimarketing.com", "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      firstname: "Reader",
      consent: true,
      startedAt: Date.now() - 3000,
      path: "/blog/example/",
      utmSource: "newsletter-test",
    }),
  });
}

test("Kit signup creates a subscriber and adds them to the confirmed form", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response("{}", { status: 201 });
  };

  const response = await onRequestPost({
    request: request(),
    env: { NEWSLETTER_PROVIDER: "kit", KIT_API_KEY: "test-key", KIT_FORM_ID: "9989263" },
  });

  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /confirm/i);
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://api.kit.com/v4/subscribers",
    "https://api.kit.com/v4/forms/9989263/subscribers",
  ]);
  assert.equal(calls[0].options.headers["X-Kit-Api-Key"], "test-key");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email_address: "reader@example.com",
    first_name: "Reader",
    state: "inactive",
  });
  assert.match(JSON.parse(calls[1].options.body).referrer, /utm_source=newsletter-test/);
});

test("Kit signup fails closed when the form is not configured", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected network call"); };
  const response = await onRequestPost({
    request: request(),
    env: { NEWSLETTER_PROVIDER: "kit", KIT_API_KEY: "test-key" },
  });
  assert.equal(response.status, 503);
});

test("Kit form failure does not report a successful signup", async () => {
  let calls = 0;
  globalThis.fetch = async () => new Response("{}", { status: ++calls === 1 ? 201 : 503 });
  const response = await onRequestPost({
    request: request(),
    env: { NEWSLETTER_PROVIDER: "kit", KIT_API_KEY: "test-key", KIT_FORM_ID: "9989263" },
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 2);
});
