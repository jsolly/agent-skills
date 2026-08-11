# Reviewer output contract

Shared by fleet review agents under `agents/`. Each agent keeps its own Scope / Out of scope; this file owns severity labels, finding shape, caps, and verdict lines.

## Finding filter

Only flag issues that would cause real problems. Minor wording improvements, stylistic preferences, premature-abstraction quibbles, and "this could be slightly clearer" are not findings.

## Severity labels (use exactly)

### Critical (must fix before push)

Bugs, security holes, data loss risks, breaking changes, guideline violations with material impact.

### Important (should fix before push)

Real issues that hurt correctness, maintainability, or operability — fixed in the same `/ship` run.

### Minor (nice to have)

Bounded cleanups and small quality improvements the orchestrator will eagerly fix before shipping.

## Finding shape

For each finding:

- **File:line** — location
- **What** — one-line summary
- **Why it matters** — concrete consequence
- **Fix** — specific remediation

Report at most 10 findings across all severities. If more, keep top 10 by severity and append `<N> additional lower-priority findings omitted.`

## Verdict

End with:

**Ready to ship: Yes / With fixes / No**
**Reasoning:** \<one sentence\>

If nothing in scope:

**Ready to ship: Yes**
**Reasoning:** \<one sentence naming empty scope\>

## Critical rules (all reviewers)

DO: categorize by actual severity; be specific (file:line); explain concrete impact; commit to a verdict.

DON'T: mark style nitpicks as Critical/Important; flag outside declared scope; hedge; omit file:line.
