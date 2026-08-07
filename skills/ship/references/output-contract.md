# Reviewer Output Contract

**This is the canonical output format every review subagent must follow.** Every agent in this package `agents/` inlines this contract; installs expose them at `~/.cursor/agents/*.md`. The `/ship` orchestrator consumes this format. Drift across agents breaks the aggregator.

When you edit an agent's `## Output format` block, mirror this file exactly (modulo the agent-specific `## Out of scope` sub-block, which is per-lens).

---

## Calibration banner

> Only flag issues that would cause real problems. Minor wording improvements, stylistic preferences, premature-abstraction quibbles, and "this could be slightly clearer" are not findings.

This banner is the first thing under `## Output format` in every agent.

## Finding shape (4 fields)

Every finding uses exactly these four labels:

- **File:line** — `path/to/file.ts:42` (or a range `42-58` for spans). Required. No vague references.
- **What** — one-line summary of the issue.
- **Why it matters** — concrete consequence in this codebase. Not "best practice"; what actually breaks or who actually pays.
- **Fix** — specific remediation. If the fix isn't obvious or has multiple options, say so.

## Severity buckets

Group findings under exactly these three headings, in this order:

### Critical (must fix before push)

Bugs, security holes, data-loss risks, breaking changes, guideline violations with material impact. The push should not happen with these unaddressed.

### Important (should fix before push)

Real issues that hurt correctness, maintainability, or operability — not push-blockers, but `/ship` still grinds them in the same run (no user followup).

### Minor (nice to have)

Bounded cleanups, alternative approaches, and small quality improvements that are still concrete (file:line + fix). The orchestrator skips `confidence-scorer` for this bucket but still presents and **eagerly fixes** verified Minors before shipping — so keep the bar above pure taste: if you would not want the orchestrator to apply it in this run, do not report it.

## Cap

Report at most 10 findings across all severities. Rank by `Critical` then `Important` then `Minor`; if you have more, keep the top 10 and append:

```text
<N> additional lower-priority findings omitted.
```

Exception: `confidence-scorer` is exempt — it scores one finding per invocation by design.

## Verdict line

Every output ends with:

```text
**Ready to ship: <Yes / With fixes / No>**
**Reasoning:** <one sentence>
```

Verdict thresholds (per-agent — the orchestrator re-derives a global verdict from the merged set):

- **No** — at least one Critical finding in this lens.
- **With fixes** — Important findings only, no Critical.
- **Yes** — only Minor findings, or no findings at all.

## Empty-scope verdict

If the diff has no files in your lens (e.g., infra-reviewer on a pure UI change), return only:

```text
**Ready to ship: Yes**
**Reasoning:** No files in <lens> scope.
```

No findings, no calibration banner, no Critical Rules block. One paragraph total.

## Critical Rules (DO/DON'T)

Insert this block in every agent, just before `## Output format`:

```markdown
## Critical Rules

DO:
- Categorize by actual severity — not everything is Critical.
- Be specific (file:line, not vague references).
- Explain why each finding matters in concrete terms.
- Commit to a verdict.

DON'T:
- Mark style nitpicks as Critical or Important.
- Flag findings outside your declared scope (other agents cover those).
- Hedge ("you might consider…") — state the issue and the fix directly.
- Return findings without a file:line reference.
```

Pre-existing agent-specific rules (e.g., `secrets-scanner`'s redaction guidance) stay in addition to this block — not replaced by it.

## Full template (copy-paste into each agent)

```markdown
## Critical Rules

DO:
- Categorize by actual severity — not everything is Critical.
- Be specific (file:line, not vague references).
- Explain why each finding matters in concrete terms.
- Commit to a verdict.

DON'T:
- Mark style nitpicks as Critical or Important.
- Flag findings outside your declared scope (other agents cover those).
- Hedge ("you might consider…") — state the issue and the fix directly.
- Return findings without a file:line reference.

## Output format

<!-- Output contract canon: references/output-contract.md -->

Only flag issues that would cause real problems. Minor wording improvements, stylistic preferences, premature-abstraction quibbles, and "this could be slightly clearer" are not findings.

Group findings by severity. Use these labels exactly:

### Critical (must fix before push)

[Bugs, security holes, data loss risks, breaking changes, guideline violations with material impact]

### Important (should fix before push)

[Real issues that hurt correctness, maintainability, or operability — fixed in the same /ship run]

### Minor (nice to have)

[Bounded cleanups and small quality improvements the orchestrator will eagerly fix before shipping]

For each finding:
- **File:line** — location
- **What** — one-line summary
- **Why it matters** — concrete consequence
- **Fix** — specific remediation

Report at most 10 findings across all severities. If more, keep top 10 by severity and append `<N> additional lower-priority findings omitted.`

End with a verdict line:

**Ready to ship: Yes / With fixes / No**
**Reasoning:** <one sentence>

If you find nothing in your scope, return only:

**Ready to ship: Yes**
**Reasoning:** No files in <lens> scope.
```

## Drift detection

When updating this contract, also update every agent's inlined copy. A drift-check script can grep each `agents/*.md` for the fenced template above and flag mismatches.
