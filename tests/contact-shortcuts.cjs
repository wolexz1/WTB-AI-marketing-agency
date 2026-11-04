const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('script.js', 'utf8');
const match = source.match(/const directContactLinks = \(\) => \{[\s\S]*?\n\};/);
assert.ok(match, 'Contact links should take visitors directly to the form');
const links = [
  { href: 'https://wtbaimarketing.com/contact/', expected: 'https://wtbaimarketing.com/contact/#briefForm' },
  { href: 'https://wtbaimarketing.com/contact/?topic=seo', expected: 'https://wtbaimarketing.com/contact/?topic=seo#briefForm' },
  { href: 'https://wtbaimarketing.com/contact/#other', expected: 'https://wtbaimarketing.com/contact/#other' },
  { href: 'https://example.com/contact/', expected: 'https://example.com/contact/' },
  { href: 'https://wa.me/2348097585489', expected: 'https://wa.me/2348097585489' },
];
const context = { URL, window: { location: { origin: 'https://wtbaimarketing.com', href: 'https://wtbaimarketing.com/blog/example/' } }, document: { querySelectorAll: () => links } };
vm.runInNewContext(`${match[0]}\ndirectContactLinks();`, context);
for (const link of links) assert.equal(link.href, link.expected);
console.log('Contact links reach the form; other destinations and existing anchors are preserved.');
