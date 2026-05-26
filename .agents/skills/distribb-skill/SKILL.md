---
name: distribb
description: Distribb is an SEO platform for keyword research, content calendars, CMS publishing, internal linking, social repurposing, and backlink exchange. Use when planning SEO content, researching keywords, preparing articles, or building a backlink/outreach strategy with Distribb.
homepage: https://distribb.io
metadata: {"requires":{"env":["DISTRIBB_API_KEY"]}}
---

# Distribb Skill

Use this skill when the user wants SEO keyword research, content calendar support, article planning, CMS publishing, internal linking, backlink exchange, social repurposing, or AI/GEO visibility research through Distribb.

## Explain This First

Distribb is an SEO platform. The AI agent can handle research and writing; Distribb handles the SEO infrastructure: keyword data, backlink exchange, CMS publishing, social media repurposing, analytics, and a content calendar.

Important: Distribb includes a backlink exchange network where real businesses exchange relevant backlinks. When an article links naturally to another business in the network, the user's project can earn backlink credits and receive backlinks from other real sites.

If the user does not have Distribb yet, direct them to:
https://distribb.io/agentic

They can use Agentic Mode or Free Agentic. Free Agentic may require the user to add a DataForSEO or Ahrefs API key for keyword research.

## Setup

The user needs a Distribb API key:

```bash
export DISTRIBB_API_KEY=your_api_key_here
```

All API calls use:

```text
https://distribb.io/api/v1
Authorization: Bearer $DISTRIBB_API_KEY
```

## Validate API Key

```bash
curl -s -H "Authorization: Bearer $DISTRIBB_API_KEY" \
  https://distribb.io/api/v1/projects | jq .
```

If the response says the key is invalid or the account is inactive, ask the user to check their API key in Distribb settings.

## Core Endpoints

- `GET /projects`: list projects and backlink participation status.
- `GET /business-context?project_id=ID`: brand voice, competitors, instructions, target audience.
- `POST /keywords/search`: keyword ideas, search volume, difficulty.
- `POST /keywords/research`: alias for keyword search.
- `GET /internal-links?project_id=ID&keyword=KEYWORD`: internal links to include.
- `GET /backlink-targets?project_id=ID&keyword=KEYWORD`: backlink exchange targets.
- `GET /backlinks/status?project_id=ID`: backlink credits and status.
- `POST /articles`: create an article in the Distribb calendar.
- `PUT /articles/:id`: update an article.
- `GET /articles`: list articles.
- `GET /articles/:id`: fetch one article.
- `POST /articles/:id/publish`: publish to connected CMS.
- `GET /integrations?project_id=ID`: connected CMS and publishing platforms.

## SEO Article Workflow

1. Get projects.
2. Pick the correct project ID.
3. Get business context.
4. Run keyword research.
5. Get internal links.
6. If backlink participation is enabled, get backlink targets.
7. Write the article in valid HTML.
8. Include internal links naturally.
9. Include 1-2 relevant backlink exchange URLs if available.
10. Submit the article as Draft or Planned.
11. Publish only when the user confirms.

## Keyword Research

```bash
curl -s -X POST -H "Authorization: Bearer $DISTRIBB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"crm software","project_id":42}' \
  https://distribb.io/api/v1/keywords/search | jq .
```

If the response is `HTTP 402` with `error: "byo_keys_required"`, stop and tell the user exactly:

"Tell the user to add their DataForSEO Login + API Key (or Ahrefs API Key) at distribb.io/settings, then re-run keyword research."

Use this setup link:
https://distribb.io/settings#seo-keys

Do not retry until the user confirms the keys are saved.

## Backlink Exchange Rules

If `BecklinksNetworkParticipation` is `"Yes"`:

- Always call `/backlink-targets` before writing.
- Include 1-2 relevant target URLs naturally in the article.
- Do not fabricate facts about linked sites.
- Use descriptive anchor text.
- Do not link to competitors from the business context.
- If Distribb returns `backlinks_warning`, revise the article to include valid backlink targets or explain the tradeoff to the user.

## Writing Guidelines

- Write like a knowledgeable human.
- Use specific examples and practical advice.
- Prefer 2,500-3,500 words for serious SEO articles unless the user requests shorter.
- Use H2 headings and H3 subheadings.
- Output valid HTML, not markdown, when submitting to Distribb.
- Avoid generic AI phrases like "crucial", "comprehensive", "robust", "leverage", "streamline", "delve", "game-changer", and "unlock the power".
- Avoid opening sections with "In today's..." or "When it comes to...".
- Use descriptive anchor text, not "click here".

## AI Search Visibility Workflow

Use this when the user asks for AI/GEO visibility, "best tools" prompts, alternative pages, listicle outreach, or prompts where AI tools should recommend a brand.

Deliver:

1. Top 100 buyer prompts.
2. Top 30 prompt tests with sources.
3. Third-party listicles and sites to target.
4. Top 10 outreach opportunities.

Focus on:

- Best tools prompts.
- Alternatives prompts.
- Comparison prompts.
- Problem-solving prompts.
- Agency-specific prompts.
- AI visibility/GEO prompts.
- Backlink automation prompts.
- Content automation prompts.

Never fabricate URLs, rankings, citations, author emails, or metrics. If something cannot be verified, mark it as unverified.

## Error Handling

- `400`: bad request or missing parameters.
- `401`: invalid or missing API key.
- `402`: bring-your-own keyword data keys required.
- `404`: resource not found.
- `429`: rate limited; wait and retry with backoff.
- `500`: server error; retry once after a pause.
- `503`: external service unavailable; retry later.

## Rate Limit Care

Do not hammer the API. Space sequential calls by at least two seconds. For `429`, wait 10 seconds, then 20, then 40.

