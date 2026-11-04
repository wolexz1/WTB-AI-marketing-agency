const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('script.js', 'utf8');
const openModal = source.match(/const openModal = \(\) => \{[\s\S]*?\n\};/)[0];
const navigations = [];
const context = {
  modal: null,
  document: { querySelector: () => null },
  window: { location: { assign: (url) => navigations.push(url) } },
};
vm.runInNewContext(`${openModal}\nopenModal();`, context);
assert.deepEqual(navigations, ['/contact/#briefForm']);
console.log('Brief button navigates to the contact form when no local form exists.');

const contactPage = fs.readFileSync('contact/index.html', 'utf8');
const hero = contactPage.match(/<section class="page-hero">[\s\S]*?<\/section>/)[0];
assert.match(hero, /href="#briefForm"/);
assert.match(contactPage, /<input name="brand" type="text" placeholder="Brand name">/);
console.log('Contact page links directly to the form and does not require a brand name.');
