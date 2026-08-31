# WTB WhatsApp AI Guides Landing Page Design

## Purpose

Build a fast, premium, mobile-first product page at `/whatsapp-ai-guides/` for Nigerian businesses handling 40 or more WhatsApp conversations per day. The page sells two independent digital guides:

- `launchpad`: WhatsApp AI Launchpad, NGN 5,500 (`550000` kobo)
- `growth-engine`: WhatsApp AI Growth Engine, NGN 10,500 (`1050000` kobo)

The page must help a qualified buyer understand the cost of delayed replies, inspect real guide pages, choose a guide and complete payment quickly. It must not invent testimonials, ratings, scarcity, endorsements, guarantees or product capabilities.

## Scope And Isolation

The implementation lives inside the current WTB static Cloudflare Pages project and reuses its established Cloudflare Functions, R2, KV, Resend, Meta Pixel and Conversions API patterns.

New public routes:

- `/whatsapp-ai-guides/`
- `/whatsapp-ai-guides/thank-you/`
- `/whatsapp-ai-guides/digital-product-policy/`

New route-scoped assets live under `/assets/whatsapp-ai-guides/`. New backend code lives under a dedicated `/functions/api/whatsapp-ai-guides/` namespace. Existing WTB pages, navigation, AI Explorers routes and product logic remain unchanged.

The two paid PDFs are never copied into a public website directory. They are uploaded separately to private R2 object keys and are released only through the protected download route after verified payment.

## Experience Architecture

The page uses static semantic HTML, one route-scoped stylesheet and a small deferred vanilla JavaScript file. It has no framework bundle, animation library, loading splash screen, normal WTB navigation or autoplay media.

The visual direction uses:

- WTB blue, deep blue, gold, charcoal, warm paper and restrained WhatsApp green
- Georgia for editorial headlines and Inter/system UI for body text
- The official WTB portrait logo
- Real Launchpad and Growth Engine covers as the hero product proof
- Six approved inside-page previews, loaded as compressed thumbnails and enlarged only on request
- Approved Nigerian business imagery below the first screen, selected for the surrounding message
- CSS-only entry motion, hover feedback and calculator count-up, disabled by `prefers-reduced-motion`

The first mobile screen communicates the audience, problem, Meta Business Agent role, two prices and purchase action. Growth Engine is visually preferred without obscuring Launchpad. Every purchase cluster repeats the exact product name, price and reassurance: secure Paystack payment, instant PDF delivery and no subscription.

## Page Flow

The page follows the approved builder brief:

1. Static announcement bar
2. Minimal WTB header
3. Product-led hero with both guide CTAs
4. Silent money leak pain section
5. Lost-opportunity calculator
6. Before-and-after transformation
7. Meta Business Agent capability boundaries
8. Real inside-page preview carousel/grid and accessible zoom dialog
9. Two product cards
10. Compact comparison and value anchor
11. FAQ
12. Business-owner sharing section
13. Final product CTA
14. Small WTB implementation close and legal disclaimer

The optional video is excluded from version one. It adds no required information and would complicate the performance budget. It can be tested later as an isolated experiment.

## Checkout Flow

Each purchase button carries only a trusted product ID and CTA location. The browser never submits an amount.

1. The buyer chooses Launchpad or Growth Engine.
2. A lightweight email field is shown with the chosen product and exact price.
3. The browser records `SelectGuide` and sends the email, product ID, CTA location, UTMs and click identifiers to the checkout endpoint.
4. The server validates the email and resolves the product through a fixed server-side product map.
5. The server initializes Paystack with the fixed amount, NGN currency, callback URL, internal reference and non-sensitive metadata.
6. The endpoint returns the Paystack authorization URL and the browser redirects immediately.
7. The callback page never grants access by itself. It asks the verification endpoint to verify the reference against Paystack.
8. The `charge.success` webhook is the primary fulfilment trigger. Callback verification is an idempotent recovery path.
9. The server verifies successful status, exact amount, NGN currency, expected product ID and unique reference.
10. The verified order is persisted in KV and a signed, expiring download token is created.
11. The buyer receives the correct secure download action on the success page and through Resend email.

Checkout initialization must visibly respond within 100 ms. A request lasting longer than three seconds changes to a retry state and explains that no payment was taken.

## Private Delivery

Private R2 object keys:

- `whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf`
- `whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf`

The download endpoint validates the signed token, reference, product and expiry before reading the corresponding R2 object. It sets an attachment filename, private cache headers and a PDF content type. Download counts and expiry are bounded through environment configuration.

Fulfilment is idempotent. Repeated webhook or verification calls may restore access but cannot create duplicate order records, delivery emails or Meta Purchase events.

## Buyer Email

The immediate Resend message confirms payment, names the purchased guide, gives the secure download action, states the product-specific first step and includes an optional WhatsApp share link. It never includes the permanent R2 object path.

The 24-hour, day-three and day-seven nurture messages are not part of version one because the current static project has no scheduled mail queue. Their copy remains documented for a later consent-aware automation phase.

## Refund Policy

These are immediately delivered digital products. Payments are non-refundable after secure PDF access, except when:

- the buyer was charged twice for the same intended purchase;
- verified payment succeeded but WTB failed to deliver working access; or
- the delivered PDF is corrupt and WTB cannot provide a working replacement.

The policy appears on the dedicated policy page and is linked beside checkout. It does not limit any rights that apply under Nigerian law.

## Analytics And Meta Deduplication

Browser events:

- `PageView`
- `ViewContent`
- `SelectGuide`
- `InitiateCheckout`
- `ShareClick`
- `PreviewOpen`
- `CalculatorComplete`

`Purchase` fires only after server verification. Browser and server Purchase events share the same event ID derived from the Paystack reference so Meta can deduplicate them. Purchase value is `5500` or `10500` with currency `NGN`.

UTM values, CTA location, landing URL and valid ad click identifiers are captured without changing, truncating or lowercasing the click ID. No buyer name or email appears in URLs or analytics payloads.

Referral links use a non-sensitive random buyer code and UTM fields. Sharing never blocks paid delivery.

## Calculator

The calculator uses the approved formula:

`missed or delayed chats per day * 30 * estimated purchase rate * average gross profit`

Inputs have visible labels, sensible numeric limits and Nigerian Naira formatting. The result is explicitly an illustrative potential gross-profit risk, never a guarantee or projected revenue claim.

## Security And Failure Handling

- The Paystack secret, Resend key and token secret remain Cloudflare secrets.
- Product amounts exist only in the server product map.
- Checkout input is validated and rate limited.
- Webhook signatures are verified before fulfilment.
- Download tokens are signed, expiring and product-specific.
- Responses use restrictive security headers and no-store/private caching where appropriate.
- The CSP allows only the services required by the page and checkout.
- Logs exclude secrets, complete tokens and buyer email addresses.

Failure states explain whether payment was not taken, remains pending, failed or succeeded while delivery is being prepared. There is no indefinite spinner.

## Performance And Accessibility Gates

- Initial transfer target: at most 500 KB before interaction
- Initial JavaScript target: at most 100 KB compressed
- Hero visual target: at most 150 KB in responsive WebP/AVIF
- No initial video request or Paystack browser library
- All below-fold media lazy loaded with dimensions
- LCP target at most 2.5 seconds, INP at most 200 ms and CLS at most 0.1
- Full keyboard operation, visible focus, useful alternative text and 4.5:1 body-text contrast
- Preview dialog closes with Escape and returns focus
- Mobile sticky CTA respects safe areas and never covers content

## Verification Strategy

Automated checks cover:

- exact product prices and labels across the page;
- no AI Explorers or children-product wording;
- product CTA mapping and browser amount tampering resistance;
- calculator correctness and input boundaries;
- checkout initialization success, timeout and error states;
- Paystack verification for success, wrong amount, wrong currency, wrong product, failed and pending transactions;
- webhook signature validation and idempotent fulfilment;
- secure download token validation, expiry and product isolation;
- email product mapping;
- matching browser/server Meta event IDs;
- no horizontal overflow or JavaScript errors at 360, 390, 430, 768 and desktop widths;
- keyboard, dialog and reduced-motion behavior;
- page-weight and asset-dimension budgets;
- regression proof that unrelated WTB routes and files did not change.

Manual release checks include desktop and mobile screenshots, Slow 4G checkout behavior, Paystack test-mode purchase evidence, email receipt, private R2 delivery, Meta Test Events and Cloudflare production route verification.

## Deployment Inputs

The build requires these Cloudflare bindings before live payment testing:

- `PAYSTACK_SECRET_KEY` secret
- `RESEND_API_KEY` secret
- `DOWNLOAD_TOKEN_SECRET` secret
- `FROM_EMAIL` plain text
- `ADMIN_EMAIL` plain text
- a KV binding for WhatsApp AI guide orders
- an R2 binding for the existing private-products bucket or an approved dedicated private bucket
- download TTL and download-limit settings

The final Paystack callback and webhook URLs are derived from `https://wtbaimarketing.com/whatsapp-ai-guides/`. Test keys are used until all test-mode evidence passes; live keys are not required to build or preview the page.

## Release Boundary

No unrelated homepage, service, blog, AI Explorers, shared header, shared footer, global design or payment behavior may change. Any shared file edit must be demonstrably necessary and covered by regression checks. The preferred implementation uses route-scoped files so this condition remains easy to prove.
