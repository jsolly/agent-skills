---
name: seo
description: Use when the user says `/seo`, including `/seo <website>`, or asks to audit, fix, or verify technical site quality — SEO plus Lighthouse-scored performance, accessibility, and best-practices — involving Ahrefs, Google Search Console, Squirrel, Google Lighthouse (all four categories, Core Web Vitals / CrUX field data), IndexNow, sitemaps, robots.txt, canonicals, noindex, redirects, crawling, indexing, or technical eligibility for AI Overviews / AI Mode. Do NOT use for keyword research, content strategy, backlink outreach, paid search, ordinary code review, or "write content so AI cites us."
---

# SEO Audit, Fix, and Verification

Evidence-backed technical site quality: crawl/index/snippet eligibility **plus** all four Lighthouse categories (performance, accessibility, best-practices, SEO). Not content/keyword/marketing strategy.

> **Integrate with `/ship`.** Edits that need landing go through the fleet ship path — do not invent a parallel publish path. Never deploy without explicit user approval.

## Required reads (full runs)

1. `references/orchestration.md` — full `/seo` loop
2. `references/issue-triage.md` — classify before edit
3. `references/tooling.md` — Ahrefs / GSC / Squirrel / Lighthouse / IndexNow
4. `references/report-template.md` — closing report
5. `references/ai-surfaces.md` — before any AI Overviews / AI Mode / ChatGPT / Perplexity eligibility ask

## Operating spine

Evidence → classify (ownership + tier) → conservative code/config fixes → authorized deploy (if any) → fresh re-measure → evidence report.

- Confirm **canonical host from live evidence** (redirects/canonicals/sitemap/GSC/Ahrefs) — do not assume bare vs `www` from the invoke argument.
- `/seo <website>`: prepend `https://` to bare domains; preserve user-provided paths; still confirm canonical live.
- **Tool availability** = attempt primary paths (Ahrefs logged-in Site Audit UI + Health Score; GSC via `gcloud` ADC). Missing an API token alone ≠ unavailable. Squirrel-only is a justified fallback, not the default.
- Lab decisions use **median ≥3 runs** (more when stabilizing Performance); treat within-spread movement as noise. Track all four categories separately for **local and production**. Corroborate prod Performance with field data (CrUX/PSI) — lab ≠ field.
- Run Lighthouse via **CLI helper** (`scripts/lighthouse-run.mts`), not the Chrome extension (not automatable; can't reach localhost). `chrome-devtools-mcp` lighthouse_audit excludes Performance — not a substitute when Perf is in scope.
- Stop at score ceiling, plateau, regression, external/blocked residue, or missing product decisions — not on one lucky green run. Do not grind accepted P3 noise.

## AI-surface honesty (hard)

Eligibility = classic indexability + **snippet eligibility** (watch `nosnippet` / `data-nosnippet` / `max-snippet:0`). AI-bot allows ≠ Google AI Overviews. Never file missing `llms.txt` / AI-specific files / “schema for AI citations” as defects. Never promise citation/selection gains. Details: `references/ai-surfaces.md`.

## Safety

- Never write credentials, API tokens, OAuth tokens, or service-account material into the repo.
- Never deploy, submit production data writes, or mutate external project settings without explicit approval.
- Never treat external-page / third-party issues as codebase defects.
- Never delete redirect, noindex, or robots rules without checking crawl/index consequences.
- Never call work complete without fresh verification evidence (live/crawl/lab — not code diff alone).
- Do not verify structured data from static HTML alone when rendered output is required.

## Helpers

- `scripts/ahrefs-issues.mts` — optional API (`AHREFS_API_TOKEN`); UI is primary
- `scripts/gsc-inspect.mts` — URL Inspection via bearer / ADC
- `scripts/squirrel-baseline.sh` — named pre/post crawl baselines
- `scripts/lighthouse-run.mts` — N runs, median four categories (`lighthouse` on PATH or `--lighthouse-bin`; no `npx` fallback)
- `scripts/seo-triage.mts` — normalize evidence into tiered findings

Each supports `--help`. Data → stdout; status/errors → stderr.
