---
name: ui-ux-pro-max
description: Use when the user wants professional UI/UX strategy, design-system generation, landing page structure, visual polish, responsive checks, accessibility checks, conversion-focused layouts, or industry-specific design recommendations for WTB website pages.
---

# UI UX Pro Max

Project-local helper skill inspired by:
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## What It Is

UI UX Pro Max is a design-intelligence skill/CLI for generating stronger design systems and UI recommendations across many platforms. The upstream project describes itself as an AI skill for professional UI/UX across multiple platforms and frameworks.

It includes ideas around:

- Industry-specific UI reasoning
- Landing page patterns
- Style recommendations
- Color palettes
- Typography pairings
- UX guidelines
- Accessibility checks
- Design anti-patterns
- Pre-delivery quality checks

## How It Helps WTB

Use this skill to improve:

- Homepage hero and CTA flow
- Service pages
- SEO landing pages
- Pricing clarity
- Contact and brief forms
- Website brief form conversion
- Mobile responsiveness
- Trust and authority sections
- Image and motion choices
- Accessibility and contrast

## WTB Design Direction

WTB should use this skill as a premium agency design advisor, not as a generic template generator.

Recommended WTB pattern:

- Landing style: `Trust & Authority` + `Conversion-Optimized`
- Visual style: `Editorial Grid` + `AI-Native UI` used lightly
- Tone: premium, confident, practical, Nigerian market-aware
- CTA rhythm: clear CTA above fold, then repeated after service proof and pricing
- Avoid: neon AI gradients, generic SaaS cards, fake futuristic overload

## Static Site Rule

The WTB site is plain HTML, CSS, and JavaScript.

So:

- Do not add React, Next.js, Tailwind, shadcn, Framer Motion, or other frameworks unless the user explicitly asks.
- Prefer vanilla CSS/JS.
- Keep assets light for Cloudflare Pages.
- Use CSS transforms and opacity for motion.
- Respect `prefers-reduced-motion`.

## Design Checklist

Before finishing any WTB design update:

- Is the page goal clear in 5 seconds?
- Is the main CTA visible?
- Does the design feel premium but still easy to scan?
- Does the page work on mobile, tablet, and desktop?
- Are images unique and compressed?
- Are buttons and links obvious?
- Is contrast strong enough?
- Are form fields simple and trust-building?
- Does the copy say "we" instead of "I"?
- Does the SEO metadata still match the page?

## Suggested Use Cases

- "Improve this page design."
- "Make the pricing section look more premium."
- "Audit the homepage like a UI/UX expert."
- "Create a better landing page structure."
- "Make this SEO page more conversion-focused."
- "Check if the mobile view feels professional."

## Upstream Install Note

The upstream repo suggests installing the CLI with:

```bash
npm install -g uipro-cli
uipro init --ai codex
```

This local file does not install the CLI. It gives Codex a project-local UI/UX Pro Max workflow for the WTB website.

