# WTB SEO and Traffic Validation Baseline

Baseline captured: 2026-08-23

## Search Console baseline

Window: 2026-05-20 to 2026-08-20, web search, final data.

| Page | Impressions | Clicks | Average position | Immediate action |
| --- | ---: | ---: | ---: | --- |
| `/ads-budget-calculator-nigeria/` | 205 | 4 | 6.2 | Improve snippet CTR and deepen links from ads guides |
| `/blog/google-ads-vs-meta-ads-nigeria-2026/` | 74 | 5 | 7.3 | Maintain, add qualified internal links and CTA tracking |
| `/blog/social-media-manager-cost-nigeria-2026/` | 86 | 2 | 9.8 | Improve click appeal and connect pricing to services |
| `/blog/why-nigerian-brands-are-moving-to-ambassador-marketing-2026/` | 94 | 0 | 7.0 | Refine search intent and monitor query quality |
| `/blog/vibe-coded-app-needs-users-2026/` | 79 | 1 | 8.8 | Build discovery through editorial links and app-service links |
| `/blog/whatsapp-ai-lead-generation-nigeria-2026/` | 71 | 2 | 7.3 | Expand non-branded query reach and track brief starts |
| `/digital-marketing-agency-abuja/` | 163 | 0 | 77.1 | Completed title, local-intent, and opening-copy revision |

## GA4 baseline

Window: 2026-07-24 to 2026-08-22, last 30 complete days.

- AI Explorers: 287 sessions, 69 engaged sessions.
- Homepage: 78 sessions, 21 engaged sessions.
- Contact: 7 sessions, 7 engaged sessions.
- Main WTB lead paths now emit `form_start`, `generate_lead`, `contact_click`, and `brief_start` events.
- `generate_lead` still needs to be marked as a GA4 key event after the first fresh events appear.

## Direct GA4 verification

Verified 2026-08-23 through the read-only Analytics Data API using the configured service account and property `536828608`:

- Homepage: 70 sessions, 20 engaged sessions, 28.6% engagement rate.
- AI Explorers: 43 sessions, 20 engaged sessions, 46.5% engagement rate.
- Contact: 7 sessions, 7 engaged sessions, 100% engagement rate.
- About: 7 sessions, 5 engaged sessions, 71.4% engagement rate.

OpenSEO's project integration still reports `ga4_not_connected`; this is separate from the verified direct API access above. Until the OpenSEO OAuth integration is completed, GA4 reporting should use the direct read-only property connection and must not be described as an OpenSEO-connected report.

## 30-day success checks

Review Search Console and GA4 after 30 complete days:

1. Priority blogs gain clicks and maintain or improve average position.
2. Abuja page moves from the 70-90 range toward page one for its primary local queries.
3. Contact-form, WhatsApp, strategy-call, and brief-start events can be attributed to source pages.
4. Outreach produces relevant referring domains and referral sessions, not only raw link counts.
5. No new broken links, canonical conflicts, structured-data errors, or deployment drift appear.

## Backlink baseline

Verified 2026-08-23 through OpenSEO for the root domain:

- 46 backlinks from 11 referring domains and 23 referring pages.
- 0 broken backlinks; 1 broken page remains to investigate separately.
- Spam score is 13 overall; `leonlinks.org` is the only visible high-risk referring domain and is not a model for future outreach.
- The approved pipeline prioritises editorially relevant Nigerian technology, business, and marketing publications rather than bulk placements.

## Indexation gate

Google Search Console URL Inspection verified 2026-08-23 for 10 priority pages:

- All 10 returned `PASS: Submitted and indexed`.
- All were `INDEXING_ALLOWED` and fetched successfully by Googlebot Smartphone.
- Google-selected canonicals matched the declared canonicals on all 10 pages.
- No priority page is currently blocked by robots, a canonical conflict, or a fetch failure.

## Reporting routine

- Weekly: inspect deployment status, new links, referral sessions, and lead events.
- Every 14 days: review queries with impressions but low CTR and adjust titles or snippets only when intent supports it.
- Every 30 days: compare this baseline against clicks, impressions, positions, engaged sessions, enquiries, and qualified lead rate.
- Do not judge a backlink by authority alone; record editorial relevance, target page, link type, referral traffic, and assisted enquiries.
