---
name: find-edgecase-slop
description: >-
  Use when the user says `/find-edgecase-slop`, or asks to find hard-coded /
  spiked edge-case complexity, edge-case slop, one-off special cases, or places
  where complexity was spiked for a rare path. Scans the git repo at CWD,
  switches into plan mode if needed, and turns every finding into its own todo
  (exhaustive). NOT for auto-fixing those hits, a general refactor/complexity
  census, or unrelated bug hunting — report + plan todos only unless the user
  later asks to clean up.
---

# Find Edge-Case Slop

Look for places where we have hard coded or spiked the complexity for an edge
case. Report your findings.

This skill is **read-only planning**: enter plan mode, scan the CWD repo, and
materialize every hit as a todo. Do not edit code or start cleanup unless the
user explicitly asks after reviewing the plan.

## Enter plan mode (first action)

1. **If the session is not already in plan mode, switch into it** (Cursor:
   `SwitchMode` → `plan`; other harnesses: the equivalent read-only / planning
   posture if available). Explain briefly: edge-case slop findings must land as
   a plan with exhaustive todos before any cleanup.
2. **If already in plan mode, stay there** — do not bounce modes.
3. Stay in plan mode through the scan and todo materialization. **Only leave
   plan mode if the user later asks to clean up** (then switch to agent /
   implementation mode).

## Scope

- **Repo = CWD.** Resolve the git repo rooted at (or containing) the current
  working directory. Scan that repo only — not sibling repos under `~/code`.
- **If CWD is not inside a git repo**, stop and say so. Do not invent a target.
- **No path argument required.** Optional focus hints from the user (a path,
  module, or subsystem) narrow the scan; otherwise cover the whole repo.

## What counts as edge-case slop

Flag **hard-coded or spiked complexity for a rare / one-off path** — not every
branch, guard, or validation. Prefer hits that look like debt, not legitimate
domain rules.

Smell patterns (non-exhaustive):

- Special-cased branches / `if` ladders for a single weird input, customer, ID,
  locale, browser, or date
- Magic literals, allowlists, denylists, or override maps whose only job is one
  rare case
- Near-duplicate copies of a happy-path function with one extra twist
- Comment-marked spikes (`// edge case`, `// hack for …`, `// special case for
  X`, `FIXME` / `HACK` tied to a rare path)
- Compatibility shims or one-off adapters that exist only for an obsolete or
  singular caller
- Test-only fixtures that force production code to grow a permanent special case

**Do not flag** ordinary validation, null checks, standard error handling, or
complexity that clearly encodes a durable product rule — unless it's clearly a
one-off spike that should have been a general mechanism.

## Procedure

1. Enter plan mode (above).
2. Confirm the CWD git root (`git rev-parse --show-toplevel`).
3. Scan the repo (respecting any user focus hint). Use search + targeted reads;
   prefer evidence (file:line, short quote of the spike) over vibes.
4. Report findings briefly in the plan (path + why it's edge-case slop).
5. **Immediately materialize exhaustive todos** (below). The plan is incomplete
   until every finding is a todo.
6. Pause. Do not edit or clean up unless the user asks.

## Materialize the full todo list (still plan mode)

After the scan, **create a todo for every finding** via the harness todo tool
(`TodoWrite` in Cursor; equivalent elsewhere). Mandatory — not optional polish.

- **One todo per finding**, not one vague "clean up edge cases" bucket.
- **Content must stand alone** — `path` (ideally `file:line`) + short why
  ("Hard-coded override for customer X in `foo.ts:42`"). Vague todos fail this
  gate.
- **Exhaustive** — every reported finding gets a todo; no silent omissions.
  If the scan finds nothing, say so in one sentence and leave the todo list
  empty (do not invent filler todos).
- Mark all todos `pending`. Only flip them when the user later asks to act and
  work lands.

## Don't

- Don't edit code, open cleanup PRs, or leave plan mode unless the user asks.
- Don't expand into a general complexity / refactor census — stay on edge-case
  spikes.
- Don't invent findings to fill the list; empty is a valid result.
- Don't scan outside the CWD git repo.
