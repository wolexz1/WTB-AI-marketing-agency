# WTB Form Backend Setup

The website forms now submit to the Cloudflare endpoint at `/api/submit`.

## Required Cloudflare variables

Add these in Cloudflare Pages:

- `RESEND_API_KEY` - secret value from Resend.
- `FROM_EMAIL` - a verified sender, for example `WTB AI Marketing Agency <hello@wtbaimarketing.com>`.
- `ADMIN_EMAIL` - optional. Defaults to `wolexzthebrand@gmail.com`.

## Resend setup

1. Create or open your Resend account.
2. Verify your sending domain.
3. Create an API key.
4. Add the API key to Cloudflare Pages as `RESEND_API_KEY`.
5. Add the verified sender address as `FROM_EMAIL`.

## What the backend does

- Sends the lead details to `wolexzthebrand@gmail.com`.
- Sends the visitor an automatic confirmation email.
- Sends website-brief payment details with the exact calculated amount.
- Attaches uploaded files when the total upload size is reasonable.
- Redirects successful submissions to `/thank-you/`.
- Shows a clean WTB fallback page if email sending is not configured yet.
