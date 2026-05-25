---
name: design-taste-frontend
description: Senior UI/UX frontend design skill for improving websites and interfaces so they feel premium, specific, responsive, conversion-focused, and less generic. Use when designing, redesigning, auditing, polishing, animating, or optimizing WTB website pages and landing pages.
---

# Design Taste Frontend

Project-local install based on Taste Skill by Leonxlnx:
https://github.com/leonxlnx/taste-skill

## Purpose

Use this skill to stop frontend work from looking generic, templated, or AI-made. It pushes stronger taste in:

- Layout
- Typography
- Spacing
- Motion
- Visual hierarchy
- Forms and CTA states
- Responsive design
- Performance
- Brand-specific art direction

## WTB Baseline

For WTB AI Marketing Agency, use these design dials:

- `DESIGN_VARIANCE: 7`
- `MOTION_INTENSITY: 5`
- `VISUAL_DENSITY: 4`

Meaning:

- Designs should feel premium and a little unexpected, but not confusing.
- Motion should be visible but lightweight.
- Pages should feel spacious enough for a marketing agency, not like a dense dashboard.

## Important Project Adaptation

The original Taste Skill includes React, Next.js, Tailwind, and Framer Motion guidance. This WTB website is currently a static site built with plain HTML, CSS, and JavaScript.

So for this project:

- Prefer HTML/CSS/vanilla JS.
- Do not introduce React, Next.js, Tailwind, Framer Motion, GSAP, or Three.js unless the user explicitly asks and the benefit is clear.
- Use CSS transforms and opacity for animation.
- Avoid animation that hurts loading speed or mobile performance.
- Always test desktop and mobile layout mentally or in browser after edits.

## Design Rules

- Avoid generic centered hero sections unless the page truly needs it.
- Avoid repeated 3-card feature grids when a more memorable layout would work better.
- Avoid excessive glow, neon, purple/blue AI gradients, and default SaaS styling.
- Do not use emojis in website UI copy.
- Avoid filler words like “elevate,” “unleash,” “seamless,” and “next-gen.”
- Use concrete copy tied to the business outcome.
- Keep mobile layouts simple, readable, and single-column when needed.
- Use cards only when they communicate hierarchy; avoid card clutter.
- Keep images relevant, optimized, and unique per page.
- Animate only `transform` and `opacity` where possible.
- Respect reduced-motion users.
- Keep CTAs clear and tactile.

## WTB-Specific Taste Rules

- The site should feel like a sharp Nigerian AI-powered marketing agency, not a generic tech startup.
- Keep the WTB voice practical, confident, and business-focused.
- Every page should support one clear next action: send a brief, book a call, chat, or fill a website brief.
- SEO pages should be useful and credible, not keyword-stuffed.
- Pricing and form pages should reduce confusion and build trust.
- Social proof should feel real and structured, not pasted in.

## Pre-Flight Checklist

Before finishing any frontend/design update:

- Is the page clear within the first 5 seconds?
- Is the main CTA visible and easy to use?
- Does the layout feel intentional on mobile?
- Are images compressed and not repeated unnecessarily?
- Does motion help attention without slowing the page?
- Are text sizes readable and not overlapping?
- Are sections doing different jobs instead of repeating the same pattern?
- Are SEO signals preserved when changing page structure?

