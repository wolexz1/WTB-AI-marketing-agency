# WTB SEO and Traffic Validation Baseline

Baseline captured: 2026-08-23

## Search Console baseline

Window: 2026-05-20 to 2026-08-20, web search, final data.

### Fresh 28-day checkpoint

Window: 2026-07-23 to 2026-08-20, web search, final data, retrieved 2026-08-23.

The strongest current opportunities are the pages already appearing on page one or close to it:

| Page | Impressions | Clicks | Average position | Readout |
| --- | ---: | ---: | ---: | --- |
| `/ads-budget-calculator-nigeria/` | 126 | 2 | 5.6 | Highest-volume page-one opportunity; improve snippet CTR and add qualified conversion paths |
| `/ai-consulting-nigeria/` | 18 | 0 | 6.7 | Page-one visibility without clicks; test a sharper buyer-intent title/description before changing content |
| `/app-marketing-agency-nigeria/` | 8 | 1 | 5.0 | Early commercial traction; keep linked to app acquisition and go-to-market pages |
| `/blog/elevenlabs-whatsapp-ai-agent-nigeria-2026/` | 16 | 1 | 8.3 | Page-one blog opportunity; strengthen the business-use-case CTA |
| `/blog/how-to-introduce-ai-to-children-nigeria-2026/` | 12 | 1 | 9.4 | Near-top-10 informational opportunity; improve scanability and parent-focused internal links |
| `/go-to-market-strategy-nigeria/` | 8 | 1 | 6.5 | Commercial page-one opportunity; connect the service proof more directly to the brief path |
| `/startup-marketing-agency-nigeria/` | 9 | 1 | 13.2 | Near-page-one opportunity; build one or two relevant editorial links and improve above-fold proof |

Query-level signals include `ai marketing agency` at position 11.1, `b2b saas marketing agency nigeria` at position 2.4, `best seo expert in lagos` at position 17.5, and `affordable digital marketing agency abuja` at position 83.6. These are directional Search Console signals, not keyword-volume estimates; the live rank tracker is still awaiting approval for its one-time paid check.

### Query-to-page interpretation

- The app-marketing page is matching four closely related commercial searches (`app marketing agency`, `app marketing company`, `app marketing firm`, and `app promotion agency`), confirming that the page is reaching the intended buyer language.
- The startup page is strongest for the spaced variant `start up marketing agency` at position 3.5, while the exact `startup marketing agency` variant is nearer position 14.2; retain both natural variants in headings and copy rather than forcing repetition.
- The ads calculator is receiving a page-two click opportunity from the `5k naira` query at position 2, so the calculator should keep its practical budget examples visible without changing the page to target an unrelated term.
- The ElevenLabs WhatsApp page currently shows only branded query variants in this 28-day slice; its next test should be non-branded WhatsApp AI and voice-agent language supported by the article, not more brand repetition.

| Page | Impressions | Clicks | Average position | Immediate action |
| --- | ---: | ---: | ---: | --- |
| `/ads-budget-calculator-nigeria/` | 205 | 4 | 6.2 | Snippet updated; monitor CTR and deepen links from ads guides |
| `/blog/google-ads-vs-meta-ads-nigeria-2026/` | 74 | 5 | 7.3 | Maintain, add qualified internal links and CTA tracking |
| `/blog/social-media-manager-cost-nigeria-2026/` | 86 | 2 | 9.8 | Snippet updated; monitor click appeal and connect pricing to services |
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
- Lead-path event check: 41 `form_start` events from 17 users; no `generate_lead`, `contact_click`, or `brief_start` rows were returned in this window.
- Conversion delivery was hardened in commit `dd6aa2c` with beacon transport and a data-layer fallback; the live `/script.js` now contains both safeguards.

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

## Fresh crawl validation

OpenSEO crawled 50/50 pages after the latest release on 2026-08-23. The follow-up issue endpoint returned no issue rows but included a provider caveat, so the final structural check was also performed against production HTML:

- Homepage, website development Nigeria, and AI marketing agency Lagos now descend `H1 → H2 → H3` without the previous initial skip.
- The live pages returned HTTP 200 after commit `19d6b77`.
- The earlier metadata audit warnings were removed before this final crawl; the result is documented without treating the caveated empty issue response as standalone proof of zero issues.

## Live rank-tracking setup

Configured 2026-08-23 in OpenSEO:

- Tracker: `ae21662d-8387-4a45-a24e-d62deec77581`
- Market: Nigeria, English, mobile, top 40 results, manual schedule.
- Keywords: 10 commercial queries covering AI marketing, digital marketing, AI consultancy, app marketing, and WhatsApp AI.
- A live check is estimated at 90 credits / `$0.0832`; no live check has been started yet.

## Reporting routine

- Weekly: inspect deployment status, new links, referral sessions, and lead events.
- Every 14 days: review queries with impressions but low CTR and adjust titles or snippets only when intent supports it.
- Every 30 days: compare this baseline against clicks, impressions, positions, engaged sessions, enquiries, and qualified lead rate.
- Do not judge a backlink by authority alone; record editorial relevance, target page, link type, referral traffic, and assisted enquiries.
