# SEO tooling reference

Use the safest available path. Do not invent credentials or persist secrets.

## Ahrefs

**A missing `AHREFS_API_TOKEN` does not mean Ahrefs is unavailable** — it only rules out API path #3. For any full `/seo` run, the logged-in browser UI is the **default, required** path: open `app.ahrefs.com/site-audit`, match the project to the target host, read the Health Score and All Issues, and drill into each issue's data-explorer for affected URLs. Record the Ahrefs **Health Score as the primary baseline**. Fall back to Squirrel-as-primary only when (a) the host has no Ahrefs project, or (b) a login/CAPTCHA wall blocks access. Determine availability by attempting this path, not by checking for an env token.

Preferred order:

1. Browser UI in the user's logged-in Ahrefs session.
2. Browser UI exports when table data is too large to inspect manually.
3. Direct API with `AHREFS_API_TOKEN` only if the user explicitly has paid API access.
4. Ahrefs MCP only if already configured and available in the active agent environment.

Default assumption: no paid Ahrefs API. Manually navigate the Site Audit project, inspect issue rows, trigger crawls from the UI, set compare baselines, and submit IndexNow from the UI when available.

Use `scripts/ahrefs-issues.mts` only for optional API reads. It requires `--project-id` and `AHREFS_API_TOKEN`.

Known constraints:

- Site Audit project ID is visible in Ahrefs URLs such as `/site-audit/<project-id>/...`.
- New full crawls should be triggered through the browser UI unless the user confirms another supported path.
- "New" issue rows depend on compare baseline. Use the most relevant crawl, not automatically "Yesterday".
- IndexNow submission in Ahrefs may require the crawl setting to know the key even if the key file exists on the site.

## Google Search Console

**A missing `GSC_ACCESS_TOKEN` / `GOOGLE_APPLICATION_CREDENTIALS` does not mean GSC is unavailable.** If `gcloud` is installed, URL Inspection is reachable via ADC: use an existing session, or hand the user the exact interactive `gcloud auth application-default login --scopes=...webmasters` command (it needs their browser consent) and proceed once authed. Do not silently drop GSC — surface it as a required step. Ahrefs's "GSC Insights" tab is performance data (delayed follow-up), not a substitute for URL Inspection.

Run `gcloud` and the GSC scripts directly. They read `~/.config/gcloud` (a credential dir, like `~/.aws`) for ADC — if a `gcloud`/ADC call fails, check that ADC login ran and a quota project is set, not the SDK install. A misleading **`gcloud failed to load … problems with your Python interpreter`** or a false **"ADC not ready"** / **"quota project not set"** on `print-access-token` is almost always a missing/expired ADC login, not a broken interpreter — **do not reinstall the SDK or repoint `CLOUDSDK_PYTHON`.**

Use GSC for Google-side evidence:

- URL Inspection (**read-only**) for indexed/canonical/robots/fetch state on selected URLs. There is **no API/CLI to *request indexing*** — "Request Indexing" is GSC-UI-only; (re)submitting the sitemap is the only programmatic re-crawl nudge.
- Sitemaps API to **list / submit / re-submit / delete** sitemaps (`GET` / `PUT` / `DELETE` on `…/sites/{siteUrl}/sitemaps/{feedpath}`). On a full run, **list submitted sitemaps and confirm the registered feed is the canonical host** with a recent `lastDownloaded` — a stale apex-vs-`www` submission that 301s, or a months-old `lastDownloaded`, silently starves discovery/crawling even when the live sitemap is perfect.
- Search Analytics only for delayed performance follow-up, not same-day fix verification.

Credentials:

- Prefer `GSC_ACCESS_TOKEN` for a short-lived bearer token.
- `GOOGLE_APPLICATION_CREDENTIALS` service-account support depends on local OAuth/JWT availability and property permissions.
- If `gcloud` is installed, run ADC login once, set a quota project, then let `gsc-inspect.mts` call `gcloud auth application-default print-access-token`:

```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
gcloud auth application-default set-quota-project YOUR_GCP_PROJECT_ID
node skills/seo/scripts/gsc-inspect.mts --check-auth
```

Verify token retrieval (do not pass `--scopes` to `print-access-token`; scopes come from ADC login):

```bash
gcloud auth application-default print-access-token >/dev/null && echo "GSC auth ready"
```

The Search Console API also requires a quota project. If calls return 403 mentioning ADC or quota project, rerun `set-quota-project` with a project where Search Console API is enabled and your Google account has access to the GSC property.

- Never commit service-account JSON or OAuth tokens.

Use `scripts/gsc-inspect.mts` for batch URL Inspection. Default cap should preserve quota; inspect a representative URL set instead of every crawled URL.

## Squirrel CLI

Use Squirrel as local technical crawl evidence, not as a replacement for Ahrefs/GSC.

Check availability:

```bash
squirrel self doctor
```

Use:

```bash
scripts/squirrel-baseline.sh pre https://example.com .seo-audit
scripts/squirrel-baseline.sh post https://example.com .seo-audit
```

Default to surface coverage. Escalate only when the user asks or the site size warrants it.

Squirrel crawls arbitrary hosts and writes `~/.squirrel/logs`; the wrapper's `self doctor` probe is non-fatal, so it never aborts the crawl. Read the score from the `.llm` (`<score overall>` plus per-`<cat>` rows), and **track the relevant sub-scores** (Structured Data, Crawlability, Core SEO, Social, Indexability) — the headline `overall` blends categories irrelevant to technical SEO (e.g. `Video` on a site with no video, accessibility), so it can plateau or under-move even when a real fix lands a large sub-score gain.

## Google Lighthouse

Lighthouse scores four categories — **Performance, Accessibility, Best-Practices, SEO** — and this skill iterates all four. Run it on **both** the local dev server and production; they legitimately diverge (minification, CDN, caching), so a fix that moves one but not the other is a signal to investigate, not a contradiction.

### How to run it (CLI, not the extension)

Run via `scripts/lighthouse-run.mts`, which wraps the Lighthouse CLI, runs N times, and medians the scores:

```bash
scripts/lighthouse-run.mts http://localhost:4321/ --runs 3
scripts/lighthouse-run.mts https://example.com/ --runs 5 --preset desktop --output-dir .seo-audit/lh
```

It prefers a `lighthouse` binary on PATH (respecting a pinned global/local install) and otherwise falls back to `npx -y lighthouse`. **Chrome must be installed** — the CLI and Node API both drive a real local Chrome (headless here). The same command handles localhost and prod; you just pass the URL.

The **Lighthouse Chrome extension is not an automation path** — Chrome's own docs say "you should use Chrome DevTools rather than this Chrome Extension workflow. The DevTools workflow allows for testing local sites and authenticated pages, while the extension does not." The extension popup is browser chrome (not page DOM), so `claude-in-chrome` cannot drive it, and it can't reach `localhost`. Do not try to automate it.

MCP-native alternative: `chrome-devtools-mcp` ships a `lighthouse_audit` tool, but it covers **accessibility, SEO, and best-practices only and excludes Performance** (that server routes performance to its `performance_start_trace` / `performance_analyze_insight` tools). It is not a substitute for the CLI when Performance is in scope.

### Variance — the load-bearing caveat

Lighthouse scores "tend to change due to the inherent variability in web and network technologies, even if there hasn't been a change to the page" (Google). Swings of **5-10 points with no code change are normal**; the effect is concentrated in **Performance** (lab-simulated + throttled). Accessibility, Best-Practices, and SEO are far more deterministic.

- **Median ≥3 runs; 5 for stabler Performance.** Google: "The median Lighthouse score of 5 runs is twice as stable as 1 run." The helper does this — never read a single run.
- **Compare medians across iterations, and treat movement inside a category's min–max spread as noise**, not progress. This matters most for Performance.
- **Do not chase Performance to 100.** Its score is non-linear (99→100 costs about as much as 90→94) and lab-only. Iterate it, but stop when the median plateaus within its variance floor.

### Lab vs field — corroborate Performance with real users

A lab Lighthouse Performance score is not real-user truth: a meaningful share of pages scoring 90+ still fail a Core Web Vital in the field. For production, pull **field data** and let it arbitrate perf:

- **PageSpeed Insights API** — one endpoint returns *both* Lighthouse lab data and CrUX field data, no local Chrome needed. Lowest-friction prod signal:

  ```bash
  curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com/&category=performance&strategy=mobile"
  ```

- **CrUX API** — field-only (LCP/INP/CLS), origin and URL level, 28-day sliding window at the 75th percentile. Chrome-opt-in only, so it undercounts Safari/Firefox/iOS-Chrome vs a site's own RUM — weight it accordingly.

Both need a Google API key (`key=` query param); if none is configured, hand the user the exact URL to open, or use the PSI **web UI** (`https://pagespeed.web.dev/`) via `claude-in-chrome` for prod. Neither reaches `localhost` — localhost perf/field truth only comes from the local Lighthouse CLI run.

For a whole-site (multi-page) pass instead of per-URL, **Unlighthouse** (`npx unlighthouse --site <url>`) runs Lighthouse on every page, auto-discovering URLs via robots.txt/sitemap/internal links.

## Browser verification

Use browser tools for:

- Rendered head/canonical/meta/structured-data checks.
- Ahrefs UI crawls, settings, and compare baselines.
- GSC UI fallback when API credentials are unavailable.

Stop if blocked by login, CAPTCHA, permissions, destructive confirmation, or ambiguous account/project selection.

## Live HTTP checks

Directly verify:

- `robots.txt`
- sitemap index and child sitemaps
- canonical page HTML
- redirect chain and final status
- `X-Robots-Tag` headers
- IndexNow key file

Use crawler user agents only when diagnosing bot-specific behavior; do not rely on one user agent as universal truth.

## Sitemap submission

First **list what is already submitted** (`GET …/sites/{siteUrl}/sitemaps`) and confirm the registered feed is the canonical host, with a recent `lastDownloaded` and zero errors/warnings. A stale or wrong-host submission is itself a fix — e.g. an apex feed that 301s to `www`, or one Google last fetched months ago, silently starves crawling even when the live sitemap is perfect. Resolve it by submitting the canonical URL (`PUT …/sitemaps/{feedpath}`) and deleting the stale entry (`DELETE`).

Submit via GSC only after:

- Sitemap URL is live and returns 200.
- Sitemap points to canonical public URLs.
- User has approved external mutation if required by the environment.

If GSC credentials are absent, provide exact manual UI steps instead.

## IndexNow

Submit only public canonical URLs that changed or were newly published.

Requirements:

- Key is known.
- Key file is hosted at the root of the canonical host and returns the key content.
- Payload host matches the canonical host.

Use direct API submission when Ahrefs UI is blocked, and report the HTTP status.

## Credential safety

- Read tokens from environment variables only.
- Print missing-variable names, never token values.
- Write machine-readable output to stdout and diagnostics to stderr.
- Avoid logging full page content when URLs or HTML may reveal private routes.
