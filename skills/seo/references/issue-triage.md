# SEO issue triage

Classify by user impact and ownership, not by the crawler's category label.

## Tiers

| Tier | Meaning | Typical action |
| --- | --- | --- |
| P0 | Critical indexing/crawl failure on important public pages | Fix now, deploy, re-verify |
| P1 | Actionable code/config defect likely to affect crawl/indexing or search appearance | Fix in current session when scoped |
| P2 | Useful improvement or low-risk warning | Batch or schedule |
| P3 | Informational, accepted noise, third-party, or not code-owned | Document, do not patch |

## P0 examples

- Public revenue or landing page has accidental `noindex`.
- Important public page blocked by `robots.txt`.
- Redirect loop or long redirect chain prevents final 200 response.
- Canonical points to a redirected, blocked, or wrong-host URL and GSC confirms indexing trouble.
- Sitemap excludes primary public pages or lists only redirecting/private URLs.

## P1 examples

- Wrong canonical host across public pages.
- Sitemap includes admin, auth-gated, or noindex pages.
- Stale internal links point at redirects or 404s.
- Duplicate/missing titles or meta descriptions across important public templates.
- Code-owned redirect chain can be flattened safely.
- GSC indexed URL now returns 404/410 without an intentional removal path.
- Public page indexed but snippet-suppressed (`nosnippet`, `data-nosnippet`, `max-snippet:0` via meta robots or `X-Robots-Tag`) when snippet/AI-surface eligibility is a stated goal — confirm the suppression is not intentional first.

## P2 examples

- Missing social tags.
- Thin or short meta descriptions on low-value pages.
- Missing image alt text where not accessibility-critical.
- Short redirect chain on low-importance URL with internal-link cleanup available.
- Non-critical performance SEO warnings.

## P3 examples

- HTTP to HTTPS redirect resolving cleanly.
- Apex to `www` or `www` to apex canonical host redirect resolving cleanly.
- External pages controlled by third parties.
- Ahrefs compare-baseline "New" rows after a legitimate host/canonical change.
- Protected/private pages intentionally noindexed and absent from sitemap.
- Crawl noise with no internal inlinks and no GSC indexing problem.
- Missing `llms.txt`, AI text files, or AI-specific markup — not required for generative AI search (Google), and independent log studies show AI bots essentially never fetch `llms.txt`.
- AI crawler (`GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) disallowed in `robots.txt` as a deliberate content-protection choice — surface, do not auto-unblock.

## Lighthouse category findings

Lighthouse Performance, Accessibility, and Best-Practices audits are their own finding class (SEO audits fold into the tiers above). Tier by **user impact and code-ownership**, exactly like crawl findings — not by Lighthouse's own weight alone.

- **Accessibility** — failing audits with a clear code owner (missing form labels, image `alt`, insufficient contrast, non-programmatic names, invalid ARIA) are typically **P1**; they are deterministic and rarely false-positive. A missing-`alt` on a decorative image, or a contrast flag on a third-party embed, is **P2/P3**.
- **Best-Practices** — security/correctness audits (no HTTPS, vulnerable library, console errors, missing `rel=noopener`) are **P1** when code-owned; cosmetic/deprecation warnings are **P2**.
- **Performance** — tier the **audit**, not the score. A code-owned opportunity that also breaks a Core Web Vital in the field (render-blocking resources tanking LCP, unbounded CLS, an oversized hero image) is **P1**. A lab-only opportunity with no field impact, or one inside the score's run-to-run variance, is **P2** — and "the Performance median ticked down 3 points" is **not a finding at all** (variance). Never file a Performance item you can only see in a single lab run.

Confirm a Lighthouse audit reproduces across the median run set before filing it — a one-run-only failure is noise. Prefer fixing the source (the audit's root cause) over the symptom.

## False-positive filters

Apply these before proposing code changes:

1. **Redirect noise:** If the redirect is HTTP to HTTPS or apex/`www` normalization, resolves to the canonical 200 page, and has no stale internal inlinks, classify P3.
2. **Chain ownership:** If a chain includes a code-owned redirect or stale internal link, classify by the code-owned segment, not the hosting redirect.
3. **External pages:** Treat external-page issues as P3 unless the codebase links to a bad external URL that should be updated.
4. **Structured data:** Static HTML absence is not proof. Verify rendered HTML or a rich-results style tool before classifying P0/P1. Classify schema findings on rich-result grounds only: absence is never P0/P1 *on AI-eligibility grounds* (Google's [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says it is not required for generative AI search), and a controlled experiment found adding schema produced no AI-citation uplift on any platform. Never file "add/expand schema" as an AI-citation fix. See `references/ai-surfaces.md`.
5. **Noindex / snippet / AI-bot intent:** Determine whether the page is public, private, temporary, or account-gated before changing `noindex`. Same intent check for `nosnippet`/`max-snippet` and for AI-crawler `robots.txt` blocks — suppression and AI-bot blocks are frequently deliberate, not defects.
6. **Cache lag:** Immediately after deploy, verify live URL output and cache headers before declaring a crawler result stale or unresolved.
7. **GSC status ≠ live status:** A crawler/GSC `Server error (5xx)` or `Crawled - currently not indexed` for a URL that returns **200 live** (confirm with a crawler UA too) is a **stale crawl artifact**, not a live defect — cluster the affected URLs' `lastCrawlTime`s and a past outage window usually jumps out. The fix is a re-crawl nudge (resubmit the sitemap / Request Indexing in the UI), not a code change. Only treat it as a live bug if the URL still errors now.
8. **AI-era files:** A missing `llms.txt`, "AI text file," or AI-specific markup/Markdown is not a defect. Google states none of these are needed to appear in generative AI search; do not file them as findings or recommend adding them. AI Overviews / AI Mode eligibility reduces to the indexability and snippet-eligibility already checked elsewhere in triage.
9. **AI crawler controls:** A robots.txt `Disallow` for a third-party AI bot (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) or for `Google-Extended` is not a Google-indexing defect — those tokens do not govern Googlebot, Search, or AI Overviews/AI Mode. Classify P3 unless the user's explicit goal is third-party AI access policy.
10. **AI feature display:** Absence from AI Overviews/AI Mode is gated by snippet eligibility (`nosnippet`/`data-nosnippet`/`max-snippet`/`noindex`) and indexing, not a missing AI file, schema, or Google-Extended token. If a page carries those snippet directives, that is the cause and may be intentional — verify intent before changing.
11. **Tag presence ≠ tag validity:** A crawler can score Social/Open-Graph healthy while the rendered `og:image`/`twitter:image` is malformed — e.g. a site host concatenated with an already-absolute CDN URL (`https://site.com``https://cdn…/img.webp`). Verify the **rendered attribute value**, not just that the tag exists or that the crawler's category score is green. Treat a broken default social image (sitewide, on the most-shared pages) as P1.

## Root-cause map

| Finding | Likely code/config surface |
| --- | --- |
| Wrong canonical | Head component, SEO helper, site URL env, framework config |
| Sitemap redirect/private URL | Sitemap generator, route exclusion list, canonical host config |
| Robots blocking public pages | `robots.txt`, route-specific headers, deploy config |
| Accidental noindex | Head component, auth-gated layout, `X-Robots-Tag` header |
| Snippet suppressed (`nosnippet`/`max-snippet`) | Head meta robots, SEO helper, `X-Robots-Tag` header |
| AI crawler blocked (`GPTBot`/`ClaudeBot`/`PerplexityBot`/`Google-Extended`) | `robots.txt`, CDN/WAF bot rules |
| Broken internal link | Navigation config, content source, route rename |
| Code-owned redirect chain | Framework redirects, server config, Cloudflare/Vercel rules |
| Duplicate title/meta | Template defaults, dynamic page metadata |
| Malformed `og:image`/asset (host + already-absolute CDN URL) | SEO/head template prepends `scheme://host` to a `{% static %}`/asset helper that already returns an absolute CDN URL when a CDN is enabled — drop the prefix |
| Wrong/stale sitemap submitted in GSC | Manual GSC submission on the non-canonical host (apex vs `www`) or a months-old `lastDownloaded` — re-submit canonical feed, delete stale |
| IndexNow suggestion | Hosted key file, Ahrefs crawl setting, changed public URL list |
| Not appearing in AI Overviews / AI Mode | Page not indexed, or snippet directives (`nosnippet`/`data-nosnippet`/`max-snippet`)/`noindex` — not llms.txt, schema, or Google-Extended |
| AI bot blocked (GPTBot/ClaudeBot/Google-Extended) | `robots.txt` AI-bot policy — distinct from Googlebot; no Google-indexing impact |

## Decision prompt

For each issue, be able to say:

> This is `[tier]` because `[evidence]`. The owner is `[code/config/infrastructure/content/third-party]`. The next action is `[fix/document/ask/wait]`.

If that sentence is not clear, gather more evidence before editing.
