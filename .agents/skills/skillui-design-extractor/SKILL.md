---
name: skillui-design-extractor
description: Use when the user wants to extract, study, document, or compare a website design system from a URL, local repo, or reference site, then adapt the useful design lessons into the WTB website without copying another brand directly.
---

# SkillUI Design Extractor

Project-local helper skill inspired by:
https://github.com/amaancoderx/npxskillui

## What SkillUI Is

SkillUI is a CLI that can analyze a live website, git repo, or local codebase and extract design-system details such as:

- Colors
- Typography
- Spacing
- Animations
- Components
- Screenshots
- Design tokens
- `DESIGN.md`
- `SKILL.md`
- Reference files for layout, interactions, and visual guidance

The upstream tool is designed to package a reference site's visual system into files an AI coding agent can read.

## How It Helps WTB

Use this skill when we want to:

- Study a competitor or inspiration website before redesigning a WTB page.
- Extract WTB's own design system into a cleaner `DESIGN.md`.
- Compare WTB against a reference site and identify what feels weaker.
- Improve consistency across homepage, service pages, pricing, contact, website brief, and SEO landing pages.
- Capture design tokens so future pages stop feeling random.

## Important WTB Rule

Never copy another brand exactly.

Use extracted design systems for:

- Layout ideas
- Spacing rhythm
- Typography hierarchy
- CTA patterns
- Motion style
- Component structure

Do not copy:

- Logos
- Exact brand colors
- Proprietary illustrations
- Exact page sections
- Brand-specific copy
- Trademarked assets

## When To Use It

Use this skill for requests like:

- "Study this website and mirror the feel."
- "Extract design inspiration from this site."
- "Make our site look more premium like this reference."
- "Create a DESIGN.md for WTB."
- "Audit our website design system."
- "Compare WTB to this competitor."

## Suggested Commands

If SkillUI is installed globally:

```bash
skillui --url https://example.com --format design-md --out ./design-references/example
```

For deeper extraction with screenshots:

```bash
skillui --url https://example.com --mode ultra --screens 8 --out ./design-references/example
```

For this local WTB project:

```bash
skillui --dir . --name "WTB AI Marketing Agency" --format design-md --out ./design-references/wtb-current
```

## WTB Workflow

1. Pick the reference site or WTB page to analyze.
2. Extract design tokens/reference files.
3. Summarize what is useful for WTB.
4. Translate useful ideas into WTB's own brand rules.
5. Update `DESIGN.md` if the design direction changes.
6. Apply changes in plain HTML/CSS/JavaScript unless the user asks for a framework.
7. Check speed, mobile layout, CTA clarity, SEO metadata, and image weight before finishing.

## Local Install Note

The upstream package says it can be installed with:

```bash
npm install -g skillui
```

It requires Node.js 18+. Ultra mode requires Playwright and Chromium.

This project-local file does not install the CLI automatically; it gives Codex a stable workflow for using SkillUI safely with the WTB website.

