# AI Explorers secure launch setup

This product page is ready to deploy, but payment and private delivery will remain unavailable until these Cloudflare, Paystack and Resend values are configured.

## 1. Keep the customer package private

Do not copy `PRIVATE-AI-Explorers-Customer-Package.zip` into this repository, `assets`, GitHub, or the Cloudflare Pages static files.

1. In Cloudflare, create an R2 bucket named `wtb-private-products`.
2. Upload the customer package to the object key `ai-explorers/AI-Explorers-Customer-Package.zip`.
3. Do not attach a public custom domain to the bucket.
4. In the Pages project bindings, add an R2 binding named `AI_EXPLORERS_BUCKET` pointing to that bucket.

The download endpoint reads the object server-side only after it validates an expiring, signed download token.

## 2. Store orders safely

1. Create a Cloudflare Workers KV namespace, for example `wtb-ai-explorers-orders`.
2. In the Pages project bindings, add it as `AI_EXPLORERS_ORDERS`.

This stores the minimum purchase record needed to verify payment, issue delivery links and count secure download attempts.

## 3. Add production environment variables

Set every value in **Production**. Set them in **Preview** too if test payments will be run against preview deployments.

| Name | Value |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack secret key. Use a `sk_test_...` value for test mode and `sk_live_...` only for production live payments. |
| `RESEND_API_KEY` | Existing WTB Resend API key used to send the purchase email. |
| `FROM_EMAIL` | A verified sender, for example `WTB AI Marketing <hello@wtbaimarketing.com>`. |
| `DOWNLOAD_TOKEN_SECRET` | A unique random value of at least 32 bytes. Do not reuse the Paystack key. |
| `AI_EXPLORERS_OBJECT_KEY` | `ai-explorers/AI-Explorers-Customer-Package.zip` |
| `AI_EXPLORERS_DOWNLOAD_TTL_SECONDS` | `604800` for a seven-day link. |
| `AI_EXPLORERS_DOWNLOAD_LIMIT` | `3` for three downloads per order. |

Never commit these values into a file or paste secret keys into chat.

## 4. Configure Paystack

1. Use Paystack test mode first.
2. Add this webhook URL in Paystack: `https://wtbaimarketing.com/api/paystack/webhook`.
3. Enable the `charge.success` event.
4. Run a test payment for exactly `NGN 7,500`.
5. Confirm the order redirects to `/ai-explorers/thank-you/?reference=...`, shows the secure download, and delivers the email.
6. Confirm a changed amount, wrong reference, expired token or fourth download does not release the product.
7. Switch `PAYSTACK_SECRET_KEY` to the live key only after the end-to-end test passes.

## 5. What to verify after deployment

- The public page presents selected workbook-page previews only. Do not add a public sampler PDF or other downloadable preview file.
- The private ZIP cannot be requested directly from any static URL.
- A paid order can download through `/api/ai-explorers/download?token=...` only.
- The thank-you page remains `noindex`.
- The purchase email comes from the verified WTB sender and its download link works.
- Paystack dashboard, Resend delivery logs and Cloudflare function logs agree on the same payment reference.
