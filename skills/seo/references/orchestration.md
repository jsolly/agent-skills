# SEO orchestration

Full `/seo` only. Narrow questions → narrow answers.

## Depth

| Mode | Do | Don't |
| --- | --- | --- |
| Audit-only | Evidence + triage + report | Edit, deploy, external mutations |
| Fix | As above + scoped code/config | Deploy/external writes without approval |
| Iterate | Fix + authorized deploy/re-measure loop | Speculative score-chase past plateau |

Stop and ask if target site, codebase, or deploy authority is ambiguous. Login/CAPTCHA/permissions/destructive confirmations stop automation.

## Setup

Parse `/seo <website>`: prepend `https://` to bare domains; trailing `/` for origin-only; preserve paths (origin = site scope unless single-page asked). **Canonical host = live evidence**, never the typed argument.

Confirm: repo/framework, Ahrefs project, GSC property, local server command/URL, prod URL, and mode (audit / fix / iterate). **Availability = attempt** Ahrefs UI and `gcloud` ADC — not env-token presence.

## Baseline (before any edit)

1. `scripts/squirrel-baseline.sh pre <site-url> <out-dir>` when Squirrel is installed.
2. Lighthouse medians, both targets: `scripts/lighthouse-run.mts <local-url> --runs 3` and `… <prod-url> --runs 5`. Start local server if needed. Pull prod field data (PSI/CrUX — `tooling.md`). Gap → report and continue.
3. **Ahrefs UI required** for a full run (not token-gated): Site Audit → Health Score (primary crawl baseline) + All Issues / exports. `scripts/ahrefs-issues.mts` only with confirmed paid API.
4. Spot-check live: robots, sitemaps, canonical host, redirect chains, noindex/private routes — only as needed to ground findings (model already knows the basics).
5. GSC when `gcloud`/ADC works (`tooling.md`): list submitted sitemaps (canonical host, recent `lastDownloaded`, zero errors); URL Inspection on flagged URLs — **whole-sitemap sweep** when ≤ ~200 URLs (tally `coverageState`); sample larger sites. Unauthed + `gcloud` installed → give exact ADC login, don't silently skip.

Unavailable tool → continue; report the gap.

## Classify → propose → fix

Read `issue-triage.md`. Every finding gets its **own** triage row: source, URLs, evidence,
P0–P3, root-cause hypothesis, owner (code / infra / content / product / third-party / accepted
noise). Do not lump distinct surfaces. Separate P0/P1 from P2/P3 before editing.

Explain before changing indexing, redirects, robots, canonicals, or deploy config. Fix **source
output**, not crawler symptoms; prefer deleting stale sitemap/internal links over shims; update
tests when a harness exists. External settings → describe exact action + approval first.
Intentional noindex/nosnippet/AI-bot blocks → surface, don't auto-remove; when holding, say what
can/cannot be verified after an authorized change.

## Deploy

Never deploy unless this conversation approved that step. Iterative loops need approval covering repeated deploys/re-crawls. Before deploy: changed surfaces, local verification, cache/CDN expectations, repo deploy rules. Ship via `/ship`.

## Iterate (when asked)

Track **both** families; never hide a regression behind another gain; never average categories:

- **SEO-crawl primary:** Ahrefs Health → else Squirrel **sub-scores** (Structured Data, Crawlability, Core SEO, Social, Indexability — not blended `overall`) → else actionable P0/P1 count.
- **Lighthouse:** all four medians, local and prod separately. Performance: only beyond run-to-run spread **and** field-corroborated on prod.

Loop: smallest coherent P0/P1 set (LH: heaviest `failingAudits`) → local verify incl. fresh local LH median → deploy if authorized → wait for live/cache → re-crawl / GSC / prod LH + field → set Ahrefs compare baseline to the prior post-deploy crawl → record all scores.

**Stop** when: ceilings/plateaus with no P0/P1 left; scores unchanged/lower after a full iteration (Performance “unchanged” = inside variance + no field gain); only P2/P3/accepted/external/blocked residue; any tracked regression; next fix needs unapproved product decision; deploy/crawl can't complete. No speculative chase of 100.

## Verify + report

After change: live HTML/headers/sitemap/robots/canonicals; `scripts/squirrel-baseline.sh post …`; LH medians local+prod + field vs baseline (use min–max for noise); Ahrefs crawl + “New” vs immediate post-fix baseline; same GSC URL set; sitemap submit / IndexNow only when routes changed, key hosted, and mutation approved.

Read `report-template.md`. Lead with before/after scores (**complete environment-specific
accounting** — every measured dimension), findings triage table, iteration stop reason, fixed /
remaining / accepted noise, verification artifacts, **verification limits + reopen criteria**, and
manual follow-ups. Never claim resolution from diff alone. Do not compress away required rows to
sound terse.
