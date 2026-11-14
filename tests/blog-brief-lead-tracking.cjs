const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('script.js', 'utf8');
const handlerSource = source.match(/blogBriefForm\?\.addEventListener\("submit", (async \(event\) => \{[\s\S]*?\n  \})\);/)[1];

async function submitBrief(success) {
  const events = [];
  const note = { textContent: '' };
  const submit = { disabled: false };
  const blogBriefForm = {
    action: '/api/submit',
    querySelector: (selector) => selector === '#quickFormNote' ? note : submit,
    reset: () => {},
  };
  const context = {
    blogBriefForm,
    fetch: async () => ({ ok: success, json: async () => ({ success }) }),
    FormData: class {},
    window: { location: { pathname: '/blog/example/' }, gtag: (...args) => events.push(args) },
  };
  const handler = vm.runInNewContext(`(${handlerSource})`, context);
  await handler({ preventDefault() {} });
  return { events, note, submit };
}

test('successful blog briefs record a lead exactly once', async () => {
  const result = await submitBrief(true);
  const leads = result.events.filter((event) => event[1] === 'generate_lead');
  assert.equal(leads.length, 1);
  assert.equal(leads[0][2].source_path, '/blog/example/');
  assert.equal(result.submit.disabled, false);
});

test('failed blog briefs do not record a lead', async () => {
  const result = await submitBrief(false);
  assert.equal(result.events.filter((event) => event[1] === 'generate_lead').length, 0);
  assert.equal(result.submit.disabled, false);
});
