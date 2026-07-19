---
name: seo
description: Use when the user says `/seo`, including `/seo <website>`, or asks to audit, fix, or verify technical site quality — SEO plus Lighthouse-scored performance, accessibility, and best-practices — involving Ahrefs, Google Search Console, Squirrel, Google Lighthouse (all four categories, Core Web Vitals / CrUX field data), IndexNow, sitemaps, robots.txt, canonicals, noindex, redirects, crawling, indexing, or technical eligibility for AI Overviews / AI Mode (llms.txt, AI-specific files, structured data for generative AI). Do NOT use for keyword research, content strategy, backlink outreach, paid search, code review, or AI/GEO content writing.
---

# SEO Audit, Fix, and Verification

Use this for technical site-quality work where the expected output is evidence-backed fixes, not a generic checklist. Scope is **technical SEO plus the three other Lighthouse categories** — performance, accessibility, best-practices — audited and iterated together with Ahrefs/GSC/Squirrel SEO evidence. Not content, keyword, or marketing strategy.

> **Author in a worktree.** When this skill edits repo files (robots.txt, sitemaps, canonicals, config) — work in a git worktree off `main`, never the primary checkout on the `main` branch (`rules/worktree-authoring.md`). Integrate with `/ship`.

## Required first reads

1. Read `references/evals.md` if you are changing this skill.
2. Read `references/orchestration.md` before any full `/seo` run.
3. Read `references/issue-triage.md` before classifying findings.
4. Read `references/tooling.md` before using Ahrefs, GSC, Squirrel, Lighthouse, sitemap submission, IndexNow, or browser automation.
5. Read `references/report-template.md` before final reporting.
6. Read `references/ai-surfaces.md` before answering anything about AI Overviews, AI Mode, or ChatGPT/Perplexity visibility (llms.txt, AI crawlers, snippet eligibility, schema-for-AI).

## Operating principle

Start from crawler/search-console/Lighthouse evidence, classify findings before editing, fix only code/config defects, then verify after deployment with a fresh crawl, inspection, or Lighthouse re-run.

Technical SEO has many false positives. Expected infrastructure redirects and search-tool diff noise are not bugs just because a crawler lists them. Lighthouse scores are **inherently variable** — median ≥3 runs and compare medians, never a lone run. **Performance is the flaky category** (lab-simulated, throttled); corroborate it with field data (CrUX/PSI) and never chase it run-to-run to 100. Accessibility, best-practices, and SEO are far more deterministic and iterate cleanly.

Lighthouse runs via the **CLI** (the `lighthouse-run.mts` helper), not the browser. The Lighthouse Chrome *extension* is not automatable — its popup is browser chrome, it can't even reach `localhost`, and Chrome's own docs say prefer DevTools/CLI over it. Use `claude-in-chrome` only for the rendered head/canonical/schema verification the skill already does, never to drive Lighthouse.

## Optional website argument

`/seo <website>` sets the target site. Normalize bare domains by prepending `https://`, preserving paths only when the user provided one. Examples:

- `/seo example-app.com` → `https://example-app.com/`
- `/seo https://www.example-app.com` → `https://www.example-app.com/`

Still confirm the canonical host once live evidence is available; do not assume bare domain vs `www`.

## Workflow summary

1. **Confirm target context** — site URL, canonical host, Ahrefs project ID, GSC property, deployment path, and available credentials/tools.
2. **Collect baseline** — Ahrefs issues, Squirrel crawl where available, Lighthouse (all four categories, median of ≥3 runs) on **both** local dev server and production, live `robots.txt`/sitemap/canonical checks, and GSC URL Inspection for high-priority URLs. Add CrUX/PSI field data for prod.
3. **Classify before fixing** — P0/P1/P2/P3 with evidence, not category names alone.
4. **Inspect the codebase** — route config, framework SEO helpers, sitemap generator, robots output, headers, redirects, and protected routes.
5. **Apply fixes conservatively** — only for actionable code/config defects; document accepted noise.
6. **Deploy only with explicit approval** — never deploy autonomously.
7. **Iterate when authorized** — wait for the deployed app, re-crawl/re-scan/re-run Lighthouse, then keep fixing only while a category score improves and actionable issues remain. Iterate all four Lighthouse categories, but treat Performance movement inside its median run-to-run variance floor as noise, not progress.
8. **Re-crawl and compare** — use a post-fix baseline, not stale "Yesterday" diffs; re-run Lighthouse (median) on local and prod; then verify IndexNow/GSC/sitemap outcomes.
9. **Report evidence** — before/after counts, all four Lighthouse category medians (local + prod) and field data, iteration scores, resolved issues, remaining issues, accepted noise, and manual follow-ups.

Full details: `references/orchestration.md`.

## Gotchas

- Ahrefs "New" rows can mean compare-baseline noise. Adjust the baseline before claiming regressions.
- HTTP to HTTPS and apex to `www` redirects are usually P3 if they resolve cleanly and have no stale internal links.
- Redirect chains are actionable when code-owned, long, looped, or caused by stale internal links. Do not flatten hosting-level canonicalization blindly.
- Do not verify structured data by grepping static HTML. Use rendered browser output or an external rich-results style check.
- Noindex pages are not automatically broken. Check whether they are intentionally private and whether they are discoverable through sitemap/internal links.
- Post-deploy crawler results can lag caches/CDNs. Verify live output before deciding a fix failed.
- Stop optimization loops at 100 or when the score stops improving. Do not patch P3 accepted noise just to chase a score.
- **Lighthouse scores are noisy — median ≥3 runs (5 for stabler Performance) and compare medians.** A single run swings 5-10 points with no code change. `lighthouse-run.mts` does the medianing; don't read a lone run.
- **Do not chase the Performance category run-to-run.** It's lab-simulated and throttled — the flakiest category. A "gain" inside the median's min–max spread is variance, not a fix. Corroborate with field data (CrUX/PSI) before claiming a real perf win, and don't grind Performance toward 100 the way you would SEO/a11y/best-practices.
- **Lab ≠ field.** A 90+ Lighthouse Performance score does not guarantee passing Core Web Vitals in the field (CrUX). Report both; let field data arbitrate perf.
- **The Lighthouse Chrome extension is not an automation path.** It can't reach `localhost` or authenticated pages and its popup isn't page DOM. Run Lighthouse via the CLI helper. If you want an MCP-native path, `chrome-devtools-mcp`'s `lighthouse_audit` tool covers accessibility/SEO/best-practices only — **it excludes Performance** (route perf to that server's performance-trace tools), so it is not a substitute for the CLI when Performance is in scope.
- **Run Lighthouse on both local and prod.** Local (dev server) catches regressions pre-deploy; prod is ground truth. They diverge (minified/CDN/caching) — a fix that moves local but not prod, or vice versa, is a signal, not a contradiction.
- GSC performance metrics lag indexing changes; same-day verification should use URL Inspection and crawl evidence, not clicks/impressions.
- A missing API token is not an unavailable tool. Ahrefs's primary path is the logged-in browser UI (open `app.ahrefs.com/site-audit`, match the project to the target host); GSC's is `gcloud` ADC. Attempt those — and record Ahrefs Health Score as the primary baseline — before falling back to Squirrel-only, which is justified only by a login wall or a missing project.
- AI Overviews / AI Mode eligibility is not a separate workflow — generative AI features run on core Search ranking, so the gate is the same indexability plus snippet-eligibility this skill already audits. There is no "GEO/AEO/LLMO" track, and `llms.txt`, AI-specific files/markup, and schema-added-for-AI-citations are empirically debunked (independent log/controlled studies, not just Google's word). The operative AI-eligibility lever most audits miss is snippet suppression (`nosnippet`, `data-nosnippet`, `max-snippet:0`); note that `Google-Extended` and third-party AI bots (GPTBot, ClaudeBot, PerplexityBot) are distinct from Googlebot and do not gate Google AI Overviews. Eligibility is not selection: never promise AI-citation gains. Read `references/ai-surfaces.md` before answering anything about AI Overviews, AI Mode, or ChatGPT/Perplexity visibility.

## Helper scripts

Run scripts from this skill directory or pass explicit paths:

- `scripts/ahrefs-issues.mts` — fetch Ahrefs issue JSON with `AHREFS_API_TOKEN`.
- `scripts/gsc-inspect.mts` — inspect URL indexing status with a bearer token or service account.
- `scripts/squirrel-baseline.sh` — run named Squirrel baseline audits.
- `scripts/lighthouse-run.mts` — run Lighthouse N times against one URL (local or prod), median the four category scores, and emit failing audits sorted by fix priority. Needs Chrome installed; uses a `lighthouse` on PATH or falls back to `npx -y lighthouse`.
- `scripts/seo-triage.mts` — normalize evidence into sorted tiered findings.

Each script supports `--help`. Scripts must write data to stdout and status/errors to stderr.

## Safety rules

- Never write credentials, API tokens, OAuth tokens, or service-account JSON into the repo.
- Never deploy, submit production data writes, or mutate external project settings without explicit user approval.
- Never treat external-page issues as codebase defects.
- Never delete redirect, noindex, or robots rules without checking index/crawl consequences.
- Never call work complete without fresh verification evidence.

## Maintenance

Skills are a routing tax. Future updates should usually append gotchas and eval cases. Change the frontmatter description only when `references/evals.md` demonstrates a load failure or spillover failure, and update the evals in the same change.
