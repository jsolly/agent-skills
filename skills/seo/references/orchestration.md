# SEO orchestration

Use this for full `/seo` runs. For small one-off questions, answer narrowly and do not run the full loop.

## Phase 0: Scope and setup

If invoked as `/seo <website>`, parse the first non-option argument as the target site:

- Bare domains get `https://` prepended.
- Add a trailing `/` for origin-only URLs.
- Preserve a path if the user provided one, but treat the origin as the site scope unless they explicitly request a single-page audit.
- Do not infer `www` or apex as canonical from the argument alone; verify with live redirects, canonicals, sitemap, and GSC/Ahrefs project settings.

Confirm or infer:

- Target site URL and canonical host.
- Repo root and framework.
- Ahrefs project ID or project URL.
- GSC property URL.
- Available tools: browser session, Ahrefs UI/export, optional Ahrefs API/MCP, GSC API/CLI, Squirrel CLI, Lighthouse (Chrome installed + `lighthouse` on PATH or `npx`), deployment access.
- The **local dev server** command and URL (for local Lighthouse runs) and the production URL.
- Whether the user wants audit-only, fix-only, or audit-fix-verify.

**Determine tool availability by attempting each tool's primary path** (Ahrefs logged-in browser UI; GSC via `gcloud` ADC), not by checking for an env token. A missing API token never, on its own, means a tool is unavailable.

Stop and ask if the target site, codebase, or deploy authority is ambiguous.

## Phase 1: Baseline evidence

Collect enough evidence before editing:

1. Run `scripts/squirrel-baseline.sh pre <site-url> <out-dir>` when Squirrel is installed.
2. Run Lighthouse on **both** targets, all four categories, medianed — `scripts/lighthouse-run.mts <local-url> --runs 3` and `scripts/lighthouse-run.mts <prod-url> --runs 5`. Record all four category medians (and each run's min–max spread) per target as the Lighthouse baseline. Start the local dev server first if it isn't running. For production, also pull field data (PSI/CrUX per `tooling.md`) — a lab score is not real-user truth. If Chrome is absent or the local server can't start, report the gap and continue with the other evidence.
3. Inspect Ahrefs issue summaries in the browser UI (**required** for a full run — not optional, not gated on an API token; record Health Score as the primary baseline):
   - Navigate to the Site Audit project.
   - Review all issue groups and affected rows.
   - Use exports for large tables.
   - Use `scripts/ahrefs-issues.mts` only if the user confirms paid API access.
4. Spot-check live output:
   - `robots.txt`
   - sitemap index and sitemap entries
   - canonical host
   - representative redirect chains
   - noindex/private routes
5. GSC evidence (when `gcloud`/ADC is available, see `tooling.md`):
   - **Sitemaps report** — list submitted sitemaps and confirm the registered feed is the canonical host, `lastDownloaded` is recent, and errors/warnings are 0. A stale or wrong-host submission is a high-value, easy-to-miss defect.
   - **URL Inspection** on high-priority flagged URLs. When the sitemap fits the URL-Inspection quota (≤ ~200 URLs), sweep the **whole sitemap** and tally `coverageState` (indexed / crawled-not-indexed / 5xx / unknown) — a cheap, high-signal indexation baseline that surfaces outage-dropped `5xx` clusters and the not-indexed tail. Representative-sampling is the fallback for larger sites only.
   - If unauthenticated and `gcloud` is installed, give the user the exact ADC login command and proceed once authed rather than skipping GSC.
6. Record crawl timestamp and compare baseline for later.

If a tool is unavailable, continue with available evidence and report the gap.

## Phase 2: Classify

Read `issue-triage.md`.

For each finding, record:

- Source: Ahrefs, GSC, Squirrel, browser, live HTTP check, or code inspection.
- Affected URL(s).
- Evidence.
- Tier: P0/P1/P2/P3.
- Root-cause hypothesis.
- Whether the fix is code-owned, infrastructure-owned, content-owned, third-party, or accepted noise.

Do not edit until P0/P1 issues are separated from P2/P3 noise.

## Phase 3: Inspect and propose

For code-owned P0/P1 findings, inspect likely locations:

- Framework config: redirects, site URL, adapter/deploy config.
- SEO/head components and route layouts.
- Sitemap and robots generators.
- Route guards and private/admin pages.
- Header logic such as `X-Robots-Tag`.
- Content sources for titles/descriptions.
- Existing tests around sitemap, robots, canonical, or route output.

Explain proposed changes before editing when the fix affects indexing, redirects, robots, canonical tags, or deployment config.

## Phase 4: Fix

Apply scoped fixes only:

- Fix source output rather than crawler symptoms.
- Prefer deleting stale sitemap entries/internal links over adding compatibility shims for in-progress branch behavior.
- Add or update tests when the repo has a relevant test harness.
- Keep accepted P3 redirect noise documented, not patched.

If a finding requires external settings, describe the exact action and get approval before mutating it.

## Phase 5: Deploy handoff

Never deploy autonomously unless the user has explicitly approved that exact deploy step in the current conversation.

If the user requests an iterative audit/fix loop, confirm that their approval covers repeated deploy waits and re-crawls. If deploy approval is unclear, pause before the first deploy.

Before asking for or running deploy:

- Summarize changed surfaces.
- Confirm verification commands passed locally.
- Identify cache/CDN expectations.
- Confirm any service-specific deploy rule from the repo guidance.

## Phase 6: Iterative deploy/re-crawl loop

Use this loop when the user asks to keep improving scores until they are 100 or no longer improving.

### Score selection

Track every available score. This skill iterates two score families and you must not let one hide the other:

- **SEO-crawl primary** (one of):
  1. Ahrefs Health Score when Ahrefs is available.
  2. Squirrel score when Ahrefs is unavailable — track the relevant **sub-scores** (Structured Data, Crawlability, Core SEO, Social, Indexability), not just `overall`, which blends out-of-scope categories (Video, accessibility) and can mask a real fix's movement (see `tooling.md`).
  3. Count-based proxy when no score exists: actual actionable P0/P1 issue count, lower is better.
- **Lighthouse categories** — track **all four** (Performance, Accessibility, Best-Practices, SEO) as *medians*, separately for local and prod. Each is its own score; a regression in one is not offset by a gain in another. **Performance carries a variance floor** — only movement beyond its median run-to-run spread (and, for prod, corroborated by CrUX/PSI field data) counts as real.

Keep every tracked score in the report. Do not hide a regression in one behind improvement in another, and do not average across categories.

### Loop body

For each iteration:

1. Apply the next smallest coherent set of P0/P1 fixes. Lighthouse fixes come from `failingAudits` (already sorted by weight × severity) — take the heaviest failing audits in the category you're moving.
2. Run local verification, including a fresh local Lighthouse median (`lighthouse-run.mts <local-url>`) to confirm the fix moved the target category before deploying.
3. Deploy only if the user authorized deployment.
4. Wait for the app to be live:
   - Prefer CI/deployment status when available.
   - Verify the live URL reflects the expected output or deployed commit.
   - Account for cache/CDN propagation before re-scanning.
5. Re-run live checks, Squirrel, Ahrefs crawl, GSC URL Inspection, and a **prod Lighthouse median** (plus refreshed CrUX/PSI field data for Performance) where available.
6. Set the Ahrefs compare baseline to the prior post-deploy crawl, not a stale historical crawl.
7. Record all tracked scores (SEO-crawl primary + all four Lighthouse category medians, local and prod), actual issues, new issues, and accepted-noise counts.

### Stop conditions

Stop the loop immediately when any condition is met:

- Every tracked score is at its ceiling (SEO-crawl primary at 100; each Lighthouse category median at 100 or plateaued) and no P0/P1 actionable issues remain.
- All tracked scores are unchanged or lower after a completed deploy/re-crawl iteration. For **Performance specifically**, "unchanged" means movement stayed within the median's run-to-run variance floor and field data (CrUX/PSI) did not confirm a real gain — do not keep iterating Performance on lab noise.
- Remaining issues are P2/P3, accepted noise, external, account-permission blocked, or not code-owned.
- Verification reveals a regression in any tracked category.
- The next fix requires a product/content decision the user has not approved.
- Deployment or crawl cannot be completed after a reasonable wait.

Do not make speculative changes to chase 100. A score can plateau because of infrastructure redirects, crawler limitations, cache lag, plan limits, Lighthouse variance, or issues outside the repo. Chasing the Performance category run-to-run is the canonical anti-pattern — its lab score is non-linear and noisy; stop when its median plateaus.

## Phase 7: Post-fix verification

After deploy or live update:

1. Verify live HTML/headers/sitemap/robots/canonicals directly.
2. Run `scripts/squirrel-baseline.sh post <site-url> <out-dir>` when Squirrel is available.
3. Re-run Lighthouse (median) on prod and local, and refresh CrUX/PSI field data — compare all four category medians against the Phase 1 baseline, using the min–max spread to distinguish a real move from variance.
4. Trigger Ahrefs crawl through the UI.
5. Compare against the immediate post-fix baseline when checking "New" rows.
6. Re-run GSC URL Inspection on the same URL set when available.
7. Submit sitemap via GSC if routes/sitemap changed.
8. Submit changed public URLs to IndexNow when a key is configured and the site hosts the key file.

Do not claim resolution from code changes alone. Use fresh crawler, live HTTP, or GSC evidence.

## Phase 8: Report

Read `report-template.md`.

Lead with the user-visible outcome:

- Health/crawl score before and after.
- All four Lighthouse category medians (local and prod) before and after, with field data for Performance.
- Iteration-by-iteration score movement and stop reason.
- Actual and new issue counts.
- Resolved issues.
- Remaining issues and why they are accepted or blocked.
- Verification commands and external tool evidence.
- Manual actions still required.
