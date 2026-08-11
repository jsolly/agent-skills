# SEO report template

Use this structure for full `/seo` runs. Be **concise and complete**: every tracked dimension and
every finding that needs a decision must appear — never trade required triage/accounting for
brevity. Lead with evidence and remaining risk before implementation trivia.

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

Report **every** row that was measured this run (use `n/a` + reason when a tool was unavailable).
Keep local and production, and each Lighthouse category, distinct — never average environments or
categories into one score.

## Findings triage (required when any defect/uncertainty exists)

| Finding | Severity | Owner | Root-cause hypothesis | Next |
| --- | --- | --- | --- | --- |
| [one defect or uncertainty per row] | P0–P3 / impact | code/config/infra/content/product/third-party | [why it happens] | fix / ask / document / wait |

Do not collapse multiple distinct surfaces into one bullet. Separate known defects from product
blockers and from impact-only evidence.

## Known vs unresolved

- **Known:** […]
- **Unresolved / product-legal:** […]

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

## Verification limits / reopen (required on stop, hold, or intentional-suppression)

State explicitly:

- **Can verify after an authorized change:** [e.g. live headers/HTML, X-Robots-Tag, index/snippet
  re-inspection, LH medians, field CWV].
- **Cannot verify / must not promise:** [e.g. AI answer selection/citation; outcomes not in evidence].
- **Reopen if:** [concrete future evidence — field regression, movement beyond lab spread *with*
  field corroboration, Legal/product approval received, measured product priority].

Audit-only / hold reports still need this section when an unblock is pending.

## Manual Follow-Ups

- [Only items requiring user/account/operator action — prefer one focused question]
```

If no issue was found, say that clearly and list remaining tool gaps or unverified surfaces.
Narrow one-off refusals may omit unused tables, but must still keep eligibility-vs-selection honesty
and any verification-limits that apply.
