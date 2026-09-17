# WTB Editorial Outreach Worker

This Cloudflare Worker runs every Wednesday at 09:00 UTC (10:00 WAT) and sends no more than five approved first-contact editorial pitches, plus one follow-up after six days. It will not send to unverified contacts, send a second follow-up, or send after a recipient is marked declined, paid-only, or suppressed.

## Required Cloudflare secrets

Set these in the Worker dashboard or with Wrangler. Never commit them.

- `RESEND_API_KEY` — the Resend key already used for WTB email, added separately to this Worker.
- `ADMIN_TOKEN` — a new long random value that protects `/health`, `/admin/prospects`, and `/admin/run`.

## Operating boundary

The scheduled Worker dispatches only verified prospects placed in its queue with an individual subject, first email, and permitted follow-up. It does not invent contacts, scrape arbitrary sites, buy links, or automatically reply to publishers. A research/backlink data provider and an inbound-reply integration can be added later without weakening these safeguards.
