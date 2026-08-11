---
name: find-edgecase-slop
description: >-
  Use when the user says `/find-edgecase-slop`, or asks to find hard-coded /
  spiked edge-case complexity, edge-case slop, one-off special cases, or places
  where complexity was spiked for a rare path — also the former `/refactor`
  cleanup-scan niche for "this file is a mess of special cases." Scans the git
  repo at CWD, switches into plan mode if needed, and finishes by creating a
  plan whose todos are one exhaustive laundry-list item per finding. NOT for
  auto-fixing those hits, a general behavior-preserving restructure / DRY
  extract census, unrelated bug hunting, or hard-deleting a feature/flag/
  subsystem (use remove-feature) — report + plan todos only unless the user
  later asks to clean up.
---

# Find Edge-Case Slop

Read-only plan: locate rare-path / hard-coded spikes in the **CWD git repo**, report evidence, then call CreatePlan with one structured todo per hit. No edits/PRs unless the user later asks to clean up.

## First action: plan posture

If not already in plan/read-only mode, switch into it (Cursor: `SwitchMode` → `plan`). Stay there through scan + CreatePlan. Leave only if the user later asks to implement.

## Scope

- Repo = `git rev-parse --show-toplevel` for CWD. Scan that tree (not limited to dirty files; not sibling repos).
- Not a git repo → stop and say so.
- Optional user focus hint narrows; otherwise whole repo.

## What counts (precision)

Flag **hard-coded or spiked complexity for a rare/one-off path** — debt, not durable domain rules.

Smells: customer/ID/locale/date special-case ladders; magic allow/deny maps for one case; near-duplicate happy-path copies with one twist; comment-marked hacks (`edge case` / `HACK` / rare-path `FIXME`); obsolete one-caller shims; test fixtures that forced a permanent production special case.

**Do not flag** ordinary validation, null checks, standard errors, or complexity that clearly encodes a lasting product/regulatory rule — unless it's obviously a one-off spike that should have been a general mechanism. Empty result is valid; inventing filler is not.

## Procedure

1. Enter/stay plan mode.
2. Confirm git root; scan with evidence (`path` ideally `file:line` + brief why).
3. Report findings briefly.
4. **Immediately** finish with `CreatePlan` — mandatory; do **not** use `TodoWrite` (or equivalent) as the finish artifact. Constraints:
   - Title/overview summarize the scan (repo + finding count).
   - Plan body: short evidence list (`path` ideally `file:line` + why); no implementation steps.
   - `todos`: one actionable pending item per finding; exhaustive; no bucket todos.
   - Nothing found → one-sentence plan body; omit `todos` (or pass an empty list).
5. Pause for user review/confirm of that plan (CreatePlan confirm UI). Leave plan mode only if they later ask to implement.
