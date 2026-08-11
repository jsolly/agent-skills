---
name: seo
description: >-
  Use when the user says `/seo`, including `/seo <website>`, or asks to audit,
  fix, or verify technical site quality — SEO plus Lighthouse-scored performance,
  accessibility, and best-practices — involving Ahrefs, Google Search Console,
  Squirrel, Google Lighthouse (all four categories, Core Web Vitals / CrUX field
  data), IndexNow, sitemaps, robots.txt, canonicals, noindex, redirects,
  crawling, indexing, or technical eligibility for AI Overviews / AI Mode. Do
  NOT use for keyword research, content strategy, backlink outreach, paid
  search, ordinary code review, "write content so AI cites us," or dual-viewport
  browser smoke of a just-changed UI surface (use verify-ui).
---

# SEO Audit, Fix, and Verification

Evidence-backed technical site quality: crawl/index/snippet eligibility **plus** all four Lighthouse categories. Not content/keyword/marketing strategy.

> **Integrate with `/ship`.** Edits that need landing go through the fleet ship path. Never deploy without explicit user approval.

## Required reads (full runs)

1. `references/orchestration.md` — loop, depth modes, stop conditions
2. `references/issue-triage.md` — per-finding severity / owner / root-cause before edit
3. `references/tooling.md` — Ahrefs / GSC / Squirrel / Lighthouse / IndexNow (fleet auth + script contracts)
4. `references/report-template.md` — closing report (complete accounting + verification limits)
5. `references/ai-surfaces.md` — before any AI Overviews / AI Mode / ChatGPT / Perplexity eligibility ask

Narrow one-off questions: answer narrowly; do not load the full loop. **Concise ≠ incomplete** —
even short answers must keep required triage rows, environment-specific scores, and
verification-limits / reopen criteria when those slices apply.

## Operating spine

Evidence → classify (ownership + tier) → conservative code/config fixes → authorized deploy (if any) → fresh re-measure → evidence report.

Fleet-non-obvious rules:

- **Canonical host from live evidence** (redirects/canonicals/sitemap/GSC/Ahrefs) — never from the typed domain alone. `/seo <website>`: prepend `https://` to bare domains; preserve paths; still confirm canonical live.
- **Tool availability = attempt primary paths** (Ahrefs logged-in Site Audit UI; GSC via `gcloud` ADC). Missing an API token alone ≠ unavailable. Squirrel-only is a justified fallback, not the default.
- Lab decisions use **median ≥3 runs** (5 when stabilizing Performance); within-spread movement is noise. Track all four categories separately for **local and production**. Corroborate prod Performance with field data (CrUX/PSI) — lab ≠ field.
- Run Lighthouse via **`scripts/lighthouse-run.mts`**, not the Chrome extension, not `chrome-devtools-mcp` lighthouse_audit when Perf is in scope (that tool excludes Performance).
- Stop at ceiling, plateau, regression, external/blocked residue, or missing product decisions — not one lucky green run. Do not grind accepted P3 noise.

## AI-surface honesty (hard)

Eligibility = classic indexability + **snippet eligibility** (`nosnippet` / `data-nosnippet` / `max-snippet:0`). AI-bot allows ≠ Google AI Overviews. Never file missing `llms.txt` / AI-specific files / “schema for AI citations” as defects. Never promise citation/selection gains. Details: `references/ai-surfaces.md`.

## Safety

- Never write credentials/tokens/service-account material into the repo.
- Never deploy, write production data, or mutate external project settings without explicit approval for that action.
- Never treat third-party/external-page issues as codebase defects; never auto-remove deliberate noindex/nosnippet/AI-bot blocks.
- Never delete redirect/noindex/robots rules without crawl/index consequence check.
- Never call work complete without fresh verification (live/crawl/lab — not code diff alone).
- Structured-data conclusions need **rendered** output or a validator; attribute *values*, not tag presence.

## Helpers

- `scripts/ahrefs-issues.mts` — optional API (`AHREFS_API_TOKEN`); UI is primary
- `scripts/gsc-inspect.mts` — URL Inspection via bearer / ADC
- `scripts/squirrel-baseline.sh` — named pre/post crawl baselines
- `scripts/lighthouse-run.mts` — N runs, median four categories (`lighthouse` on PATH or `--lighthouse-bin`; no `npx` fallback)
- `scripts/seo-triage.mts` — normalize evidence into tiered findings

Each supports `--help`. Data → stdout; status/errors → stderr.
