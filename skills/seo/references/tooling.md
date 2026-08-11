# SEO tooling

Safest available path. Never invent or persist secrets. Tokens from env / interactive auth only; print missing *names*, never values. Script data → stdout; diagnostics → stderr.

## Ahrefs

Missing `AHREFS_API_TOKEN` ≠ unavailable — only rules out the API. Full runs: **logged-in browser UI is required** (`app.ahrefs.com/site-audit` → match host → Health Score + All Issues / data-explorer / exports). Fall back to Squirrel-as-primary only if no project or login/CAPTCHA blocks. Attempt the UI; don't gate on an env token.

Default: no paid API. Trigger crawls, set compare baselines, and IndexNow from the UI. Project ID is in `/site-audit/<id>/…`. “New” rows follow the **compare baseline you set** — use the relevant crawl, not auto-“Yesterday”. IndexNow in Ahrefs may need the crawl setting to know the key even when the key file is live.

`scripts/ahrefs-issues.mts` — optional API reads; needs `--project-id` + `AHREFS_API_TOKEN`. Ahrefs “GSC Insights” is delayed performance data, **not** URL Inspection.

## Google Search Console

Missing `GSC_ACCESS_TOKEN` / `GOOGLE_APPLICATION_CREDENTIALS` ≠ unavailable. If `gcloud` is installed, use ADC (or hand the user the interactive login) and proceed — don't silently drop GSC.

**Auth gotcha:** `gcloud` / ADC reads `~/.config/gcloud`. A misleading **`gcloud failed to load … problems with your Python interpreter`** or false **“ADC not ready” / “quota project not set”** on `print-access-token` is almost always missing/expired ADC login — **do not reinstall the SDK or repoint `CLOUDSDK_PYTHON`.**

```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
gcloud auth application-default set-quota-project YOUR_GCP_PROJECT_ID
node skills/seo/scripts/gsc-inspect.mts --check-auth
# scopes come from ADC login — do NOT pass --scopes to print-access-token
gcloud auth application-default print-access-token >/dev/null && echo "GSC auth ready"
```

Prefer `GSC_ACCESS_TOKEN` when you have a short-lived bearer. 403 mentioning ADC/quota → `set-quota-project` on a project with Search Console API enabled + property access.

**Fleet default (operator personal ADC):** set a quota project with Search Console API enabled. Raw `curl` needs `-H "x-goog-user-project: YOUR_GCP_PROJECT_ID"` (or `GSC_QUOTA_PROJECT` for `gsc-inspect.mts`). Domain property example: `sc-domain:example.com`.

Use GSC for:

- **URL Inspection** (read-only) — indexed/canonical/robots/fetch. **No API to “Request Indexing”** (UI-only); programmatic nudge = (re)submit sitemap.
- **Sitemaps API** — list/submit/delete. Always list first: registered feed must be **canonical host**, recent `lastDownloaded`, zero errors. Stale apex-vs-`www` or months-old download silently starves crawl even when live sitemap is fine → `PUT` canonical, `DELETE` stale (with approval).
- Search Analytics = delayed follow-up only, not same-day verify.

`scripts/gsc-inspect.mts` for batch inspection; default `--max` preserves quota (representative set / ≤~200 whole-sitemap when it fits). Never commit SA JSON or OAuth tokens.

## Squirrel

Local crawl evidence — not an Ahrefs/GSC replacement.

```bash
squirrel self doctor   # non-fatal in the wrapper; crawl still runs
scripts/squirrel-baseline.sh pre https://example.com .seo-audit
scripts/squirrel-baseline.sh post https://example.com .seo-audit
```

Default surface coverage. Read `.llm` `<score overall>` **and** per-`<cat>` rows; track Structured Data / Crawlability / Core SEO / Social / Indexability — headline `overall` blends irrelevant cats (e.g. Video) and can mask real sub-score gains. Logs under `~/.squirrel/logs`.

## Lighthouse

All four categories, **local and prod** (divergence is a signal). CLI helper only:

```bash
scripts/lighthouse-run.mts http://localhost:4321/ --runs 3
scripts/lighthouse-run.mts https://example.com/ --runs 5 --preset desktop --output-dir .seo-audit/lh
```

Needs `lighthouse` on PATH or `--lighthouse-bin` (no `npx` fallback) + local Chrome. **Don't automate the Chrome extension** (can't reach localhost; popup isn't page DOM). `chrome-devtools-mcp` `lighthouse_audit` **excludes Performance** — not a CLI substitute when Perf is in scope.

**Variance:** 5–10 pt swings with no code change are normal (worst in Performance). Median ≥3 (5 for stabler Perf); movement inside min–max spread = noise. Don't chase Perf to 100 (non-linear, lab-only).

**Lab ≠ field:** prod Performance claims need CrUX/PSI. PSI returns lab + field without local Chrome:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com/&category=performance&strategy=mobile"
```

Needs `key=` or open `https://pagespeed.web.dev/` / hand the user the URL. Neither reaches localhost — local truth = CLI only. CrUX is Chrome-opt-in (undercounts Safari/Firefox). Whole-site multi-page: Unlighthouse if needed.

## Mutations & browser

Browser: rendered head/canonical/meta/structured data; Ahrefs UI; GSC UI fallback. Stop on login/CAPTCHA/permissions/destructive confirm/ambiguous project.

Sitemap submit / IndexNow: only public canonical URLs; key file at canonical root when using IndexNow; user approval when the environment requires it. Absent GSC creds → exact manual UI steps, don't invent success.
