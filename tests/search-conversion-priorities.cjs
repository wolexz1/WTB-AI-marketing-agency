const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('influencer page offers a direct in-page brief', () => {
  const html = fs.readFileSync('influencer-marketing-agency-nigeria/index.html', 'utf8');
  assert.match(html, /<title>Influencer Marketing Agency Nigeria \| Creator Campaigns \| WTB<\/title>/);
  assert.match(html, /<button class="button brief-modal-trigger" type="button">Plan my influencer campaign<\/button>/);
});

test('calculator explains its next step without blocking the free estimate', () => {
  const html = fs.readFileSync('ads-budget-calculator-nigeria/index.html', 'utf8');
  assert.match(html, /Your estimate is free and does not require an email/);
  assert.match(html, /href="#ads-lead" data-ads-cta/);
  assert.match(html, /name="calculator_estimate" data-ads-hidden-estimate/);
});

test('TikTok article answers the question before the image', () => {
  const html = fs.readFileSync('blog/tiktok-creative-center-nigeria-2026/index.html', 'utf8');
  const heroEnd = html.indexOf('class="article-hero-image"');
  const answer = html.indexOf('Start with TikTok Creative Center');
  assert.ok(answer > 0 && answer < heroEnd);
});
