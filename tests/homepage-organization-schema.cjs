const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('homepage organization provides an accurate customer contact', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const objects = scripts.flatMap((match) => {
    const data = JSON.parse(match[1]);
    return data['@graph'] || [data];
  });
  const organization = objects.find((object) => object['@id'] === 'https://wtbaimarketing.com/#organization');
  assert.equal(organization.contactPoint['@type'], 'ContactPoint');
  assert.equal(organization.contactPoint.contactType, 'customer service');
  assert.equal(organization.contactPoint.email, 'wolexzthebrand@gmail.com');
  assert.equal(organization.contactPoint.telephone, '+2348097585489');
});
