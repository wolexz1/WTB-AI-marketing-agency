# WhatsApp AI Guides Cloudflare setup

This release keeps both paid PDFs private. Do not upload either guide to the public website assets directory.

## Required Cloudflare bindings

Create these bindings for both Preview and Production so checkout can be tested before release:

- `WHATSAPP_AI_GUIDES_DB` - D1 database used for transactional order state, rate limits, delivery retries and atomic download counts. Apply the migrations in filename order: `migrations/0001_whatsapp_ai_guides.sql`, then `migrations/0002_whatsapp_ai_guides_fulfilment.sql`.
- `WHATSAPP_AI_GUIDES_BUCKET` - private R2 bucket containing the paid PDFs.

Upload the files to the bound R2 bucket with these exact object keys:

- `whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf`
- `whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf`

Public bucket access must remain disabled.

## Required variables and secrets

- `PAYSTACK_SECRET_KEY` - secret. Use a Paystack test secret in Preview and the live secret in Production.
- `DOWNLOAD_TOKEN_SECRET` - secret. Generate a long random value. Preview and Production may use different values.
- `RESEND_API_KEY` - secret.
- `FROM_EMAIL` - plain text, for example `WTB AI Marketing <hello@wtbaimarketing.com>`.
- `META_PIXEL_ID` - plain text.
- `META_CAPI_ACCESS_TOKEN` - secret.

Optional reliability controls:

- `WHATSAPP_AI_GUIDES_FULFILMENT_RETRY_DELAYS_MS` - comma-separated retry delays. The default is `750,2500` (two automatic retries).
- `WHATSAPP_AI_GUIDES_DOWNLOAD_TTL_SECONDS` - private-link lifetime. The default is seven days.
- `WHATSAPP_AI_GUIDES_DOWNLOAD_LIMIT` - permitted downloads for one verified order. The default is eight.

## Paystack

- Callback URLs are generated per transaction and return to `https://wtbaimarketing.com/whatsapp-ai-guides/thank-you/`.
- Set the Paystack webhook URL to `https://wtbaimarketing.com/api/paystack/webhook`.
- The server accepts a purchase only after Paystack confirms the exact product reference, status, currency and amount.

## Resend

- Verify `wtbaimarketing.com` in Resend.
- Make sure `FROM_EMAIL` uses that verified domain.
- The buyer receives a private expiring PDF link after verified payment.

## Meta events

- Browser: `ViewContent`, `ProductSelected`, `PreviewOpened`, `InitiateCheckout` and `ShareClick`.
- Server: `Purchase` after Paystack verification.
- Browser and server Purchase use `purchase_<paystack-reference>` as the shared event ID for deduplication.

## Release check

1. Deploy to Preview with Paystack test mode.
2. Confirm both products initialize at their fixed server amounts: NGN 5,500 and NGN 10,500.
3. Complete a test payment for each product.
4. Confirm the thank-you page verifies the payment and downloads only the purchased PDF.
5. Confirm the buyer email arrives and its link downloads only the purchased PDF.
6. Confirm a failed or altered reference cannot unlock a file.
7. Confirm the Meta Test Events panel receives the browser events and one deduplicated Purchase.
8. Copy the same bindings to Production, replacing only the Paystack test secret with the live secret.
