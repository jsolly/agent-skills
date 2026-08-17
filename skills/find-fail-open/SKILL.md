---
name: find-fail-open
description: >-
  Use when the user says `/find-fail-open`, or asks to audit where failures
  cause silent skips, silent continues, swallowed errors, or silent
  degradation — empty catch, catch-then-default, discarded exit codes,
  fire-and-forget async, `|| true`, status-blind HTTP, missing-tool skips,
  CI gates neutered by `continue-on-error`, checks that return "allowed" when
  they cannot run, circuit breakers stuck open with no alert. Scans the git
  repo at CWD,
  switches into plan mode if needed, and finishes by creating a plan whose
  todos are one exhaustive laundry-list item per finding. NOT for fixing the
  hits, reviewing one diff for silent failures (the `error-handling-reviewer`
  agent under `/ship` owns that lens), rare-path hard-coded complexity
  (`find-edgecase-slop`), or root-causing one known bug (`investigate`).
---

# Find Fail-Open

Read-only audit: locate every site in the **CWD git repo** where a failure lets
execution continue down a success-shaped path without a signal an operator or
monitor can see, then call CreatePlan with one structured todo per hit. No
edits/PRs unless the user later asks to fix.

## First action: plan posture

If not already in plan/read-only mode, switch into it (Cursor: `SwitchMode` →
`plan`). Stay there through scan + CreatePlan. Leave only if the user later
asks to implement.

## Scope

- Repo = `git rev-parse --show-toplevel` for CWD. Scan that tree (not limited
  to dirty files; not sibling repos).
- Not a git repo → stop and say so.
- Optional user focus hint (path, language, class) narrows; otherwise whole
  repo.
- Skip `.git/`, vendored and generated trees (`node_modules/`, `vendor/`,
  `dist/`, lockfiles) — nobody will fix them, and `--hidden` drags git's stock
  `hooks/*.sample` scripts into every shebang-resolved sweep. When auditing the
  repo that hosts this skill, skip `skills/find-fail-open/` too: the catalog's
  own example code matches its own recipes. Test files count only when
  the suppression hides a real gate (a runner flag that turns failures green, an
  assertion-less error path); ordinary swallowing inside test helpers is noise,
  and including it drowns the one-todo-per-finding plan.

## What counts (precision)

A finding needs **both** halves:

1. **A failure is available** — thrown error, non-zero exit, timeout, non-2xx,
   parse failure, missing binary/file/permission, rejected promise.
2. **The program proceeds success-shaped anyway** — skips the work, returns a
   default/empty/stale value, flips into degraded mode, or exits 0 — and
   nothing an operator or monitor can query records that it happened.

Half two is the discriminator. Logging alone does not clear a hit: a
`catch { log(e); return [] }` is still fail-open when the caller cannot tell
that empty from a real empty. Conversely an empty `catch` around a
consequence-free cleanup call is not fail-open.

Read `references/detection.md` for the fourteen defect classes plus the
intentional bucket, per-surface ripgrep recipes, sweep hygiene, triage rules,
corroborating linter rule IDs, the severity ladder, and the audit-record
fields.

**Classify, never delete.** Intentional best-effort code (telemetry beacons,
non-blocking hooks, optional formatters) is syntactically identical to the
accidental kind. Every hit stays in the audit with `intended` set to `true`,
`false`, or `unclear` plus a rationale quote (or "none found") — silently
dropping a class is how these audits under-report. Empty result is valid;
inventing filler is not.

## Procedure

1. Enter/stay plan mode.
2. Confirm git root; enumerate the surfaces present — languages (bash, JS/TS,
   Python, Go, other) **and** config/gate files (CI workflows under `.github/`,
   `.circleci/`, git hooks, `Makefile`, `package.json` scripts, Dockerfiles).
   Sweeps must pass `--hidden` (with `-g '!.git/*'`), or every dot-directory
   reports clean because it was never read. Shell files are resolved by shebang
   and embedded languages (a Python heredoc inside a `.sh`) by content, not by
   container extension — see the sweep-hygiene section of the reference.
3. Sweep per `references/detection.md` — recall first: record every candidate,
   filter later. A recipe that exits with `No files were searched` marks that
   surface **unswept**, not clean.
4. Confirm each candidate by reading the enclosing block/function. A raw grep
   line is not evidence; a comment or string literal that merely matches the
   pattern is not a finding.
5. Classify each confirmed hit against the audit-record fields and triage rules
   in `references/detection.md` — class, severity (`safety` > `reliability` >
   `ux` > `telemetry`), `intended` (`true`/`false`/`unclear`) + rationale quote,
   confidence, and the verbatim evidence line. One row per `file:line`: when
   several classes match, keep the highest-severity one.
6. Report findings briefly (counts by class and severity, plus the worst few).
7. **Immediately** finish with `CreatePlan` — mandatory; do **not** use
   `TodoWrite` (or equivalent) as the finish artifact. Constraints:
   - Title/overview summarize the scan (repo, finding count, severity split).
   - Plan body: evidence list — `file:line`, class, one-line why-it-is-fail-open
     (and the fix direction where obvious); no implementation steps.
   - `todos`: one actionable pending item per finding; exhaustive; no bucket
     todos. Intentional hits get a todo to confirm or annotate the waiver.
   - Nothing found → one-sentence plan body; omit `todos` (or pass an empty
     list).
8. Pause for user review/confirm of that plan (CreatePlan confirm UI). Leave
   plan mode only if they later ask to fix.

## Don't

- Don't edit, fix, or open a PR from this skill.
- Don't judge by syntax alone — an empty catch with no downstream consequence
  is not a finding, and a fully-logged catch that returns a default is.
- Don't collapse the audit to empty-catch hunting; the shell, async,
  status-blind, and CI-gate classes carry most of the real risk.
- Don't let a dot-directory report clean by omission — a CI gate neutered by
  `continue-on-error: true` is the top-severity finding and lives where the
  default globs never look.
- Don't drop intentional fail-open hits or a whole class to shorten the list.
- Don't stall on toolchain setup: regex + reading the enclosing code is the
  floor; Semgrep/CodeQL are optional corroboration, never a gate.

## Receipt

`repo · surfaces swept (extension / shebang / embedded) and any left unswept · findings by class · severity split · intended vs accidental · plan created (yes/no)`
