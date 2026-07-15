# SEO skill evals

Use this file before changing `SKILL.md` frontmatter. If a description change alters expected routing, update these cases in the same changeset.

## Positive load cases

The `seo` skill should load for:

- `/seo audit this site with Ahrefs and fix anything actionable`
- `/seo example.com`
- `/seo https://www.example.com`
- `Run Ahrefs Site Audit, inspect all issues, and remediate the codebase`
- `Use Google Search Console to check whether these fixed URLs are indexed`
- `Submit the sitemap and changed URLs after the SEO fixes deploy`
- `Which sitemap is submitted in Search Console, and is it stale or on the wrong host?`
- `Run a full GSC indexation sweep across my sitemap and tell me what isn't indexed`
- `Why are a bunch of my posts showing Server error in GSC when they load fine, and how do I get them re-crawled?`
- `The sitemap has redirects and wrong canonicals; fix the source`
- `Ahrefs says canonical points to redirect; figure out if it is real`
- `Trigger another Ahrefs crawl and compare against the post-fix baseline`
- `Keep fixing, deploying, re-crawling, and scanning until the SEO score is 100 or stops improving`
- `Run Lighthouse on prod and localhost and improve the scores`
- `/seo example.com — iterate all four Lighthouse categories until they stop improving`
- `Our Lighthouse performance and accessibility scores are low; audit and fix them`
- `Make this page faster and improve Core Web Vitals`
- `Run an accessibility audit and fix what's actionable`
- `Improve the Lighthouse best-practices score`
- `Why does Lighthouse score differently on local vs production?`
- `Use Squirrel to get a before/after technical SEO crawl`
- `Submit these public URLs to IndexNow after deploy`
- `Robots.txt, sitemap, noindex, and canonical tags look wrong`
- `Do we need an llms.txt to show up in AI Overviews?`
- `/seo will our pages be eligible for AI Mode / AI Overviews?`
- `Should we add schema markup so we appear in generative AI search?`
- `Is a nosnippet or max-snippet tag blocking us from AI Overviews?`
- `Are we accidentally blocking GPTBot / PerplexityBot in robots.txt?`
- `Should we block GPTBot / Google-Extended, and does that affect Google indexing?`
- `Why isn't this page showing up in AI Overviews?`

## Negative neighbor cases

The `seo` skill should not load for:

- `Research keywords for a new landing page`
- `Write a content calendar for our blog`
- `Improve this page copy for conversion`
- `Plan a backlink outreach campaign`
- `Review this PR for bugs before I push`
- `Set up Google Ads conversion tracking`
- `Create Open Graph images for social sharing`
- `Analyze product-market positioning`
- `Rewrite this page so it ranks in AI Overviews / GEO copywriting`
- `Write content optimized for ChatGPT and Perplexity to cite us`

## Forbidden-load cases

- `/research SEO tools for SaaS startups` → use the research skill.
- `/ship ship the SEO changes` → use the ship skill.
- `Why are emails going to spam?` → not SEO; use email/deliverability guidance if available.
- `Build a new marketing landing page` → use frontend/design or product-marketing guidance, not `seo`, unless the user specifically asks for technical SEO audit/fix.

## Progressive-read expectations

- Read `orchestration.md` for any full audit/fix/verify run.
- Read `issue-triage.md` before classifying Ahrefs, GSC, or Squirrel findings.
- Read `tooling.md` when using the Ahrefs browser UI/export flow, optional Ahrefs API/MCP, GSC API/CLI, Squirrel CLI, Lighthouse (CLI helper, variance/median discipline, lab-vs-field, PSI/CrUX), browser verification, sitemap submission, or IndexNow.
- Read `report-template.md` before final reporting.
- Read `ai-surfaces.md` before answering anything about AI Overviews, AI Mode, or ChatGPT/Perplexity visibility (llms.txt, AI crawlers, snippet eligibility, schema-for-AI), or before classifying a finding on AI-eligibility grounds.
- Keep `SKILL.md` loaded but concise; do not inline detailed API or CLI reference there.

## Routing description target

Good description shape:

```yaml
description: Use when the user says `/seo`, including `/seo <website>`, or asks to audit, fix, or verify technical site quality — SEO plus Lighthouse-scored performance, accessibility, and best-practices — involving Ahrefs, Google Search Console, Squirrel, Google Lighthouse (all four categories, Core Web Vitals / CrUX field data), IndexNow, sitemaps, robots.txt, canonicals, noindex, redirects, crawling, indexing, or technical eligibility for AI Overviews / AI Mode (llms.txt, AI-specific files, structured data for generative AI). Do NOT use for keyword research, content strategy, backlink outreach, paid search, code review, or AI/GEO content writing.
```

Review the positive and negative cases before changing this text. The goal is high recall for technical audit/fix/verify work — SEO crawl issues **and** Lighthouse performance/accessibility/best-practices — and low spillover into marketing/content strategy (keyword research, copywriting, outreach) or code review. Note the deliberate 2026 scope expansion: performance and accessibility are **in** scope (via Lighthouse's four categories), so bare "improve Core Web Vitals" / "run an accessibility audit" now load this skill; only *content/marketing* web-quality work stays out.
