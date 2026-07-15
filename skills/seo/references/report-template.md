# SEO report template

Use this structure for full `/seo` runs. Keep it concise; include evidence and remaining risk before implementation trivia.

```markdown
## Outcome

[One paragraph: what changed, current health/counts, and whether the SEO loop is complete.]

## Before And After

| Metric | Before | After |
| --- | --- | --- |
| Ahrefs Health Score | [value] | [value] |
| Ahrefs Actual Issues | [value] | [value] |
| Ahrefs New Issues | [value] | [value] |
| Squirrel Score | [value or n/a] | [value or n/a] |
| Lighthouse Performance (prod, median) | [value ± spread] | [value ± spread] |
| Lighthouse Accessibility (prod, median) | [value] | [value] |
| Lighthouse Best-Practices (prod, median) | [value] | [value] |
| Lighthouse SEO (prod, median) | [value] | [value] |
| Lighthouse (local, all four medians) | [P/A/BP/SEO] | [P/A/BP/SEO] |
| CrUX/PSI field (LCP/INP/CLS) | [value or n/a] | [value or n/a] |
| GSC inspected URLs healthy | [value or n/a] | [value or n/a] |

## Iterations

| Iteration | Change Set | Deploy Evidence | Ahrefs/Squirrel | LH P/A/BP/SEO (prod) | Actual Issues | Stop/Continue Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Baseline | n/a | [value] | [P/A/BP/SEO] | [value] | Baseline |
| 1 | [summary] | [CI/deploy/live check] | [value] | [P/A/BP/SEO] | [value] | [continue/stop reason] |

## Fixed

- `[tier]` [issue]: [evidence and fix summary]

## Remaining

- `[tier]` [issue]: [why it remains, owner, and next action]

## Accepted Noise

- [Issue]: [why it is expected or not code-owned]

## Verification

- [Command/tool]: [fresh result]
- [Ahrefs crawl timestamp and compare baseline]
- [GSC / sitemap / IndexNow result]
- [Optimization loop stop reason: score 100, no improvement, accepted noise only, blocked, or regression]

## Manual Follow-Ups

- [Only items requiring user/account/operator action]
```

If no issue was found, say that clearly and list remaining tool gaps or unverified surfaces.
