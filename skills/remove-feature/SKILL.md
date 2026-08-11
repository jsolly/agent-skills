---
name: remove-feature
description: >-
  Use when the user says `/remove-feature`, or wants to fully remove/rip out/
  delete/kill a feature, flag, endpoint, or subsystem — hard delete with no
  compat layer. Plan-mode scope + full removal manifest, then finishes planning
  by creating a plan whose todos are one exhaustive laundry-list item per
  DELETE / HUMAN-GATED / VERIFY REPLACEMENT item; delete only after an execute
  choice. NOT for soft-disable, leaving a flag off, deprecating with a shim, or
  bugfixes — refuse those and offer soft-disable outside this skill vs
  true-removal reconfirm.
---

# Remove Feature

> **Integrate with `/ship`.** Code deletion ships via `/ship`. Destructive prod/schema/IaC/external tails are human-gated.

North star: feature **gone**, survivors don't reference it, survivors still work. Evidence = green oracle + zero-hit reference sweep + orphan tools clean (or justified leftovers). No comment-outs, null stubs, or flags left default-off.

**Activation boundary:** if the user asks to soft-disable / leave a flag off / shim, **refuse hard-delete under this skill** — offer soft-disable outside-skill vs reconfirm true removal.

## Plan mode through handoff

Phases 1–2, filled manifest, CreatePlan, and handoff are **read-only**. Enter plan mode first; leave only when the user chooses an execute path.

## Phase 1 — Scope (confirm before archaeology)

One focused ask at a time. Pin: identity + entry points; in/out boundary (feature-owned vs shared KEEP); stateful/external surface; removal shape (hard delete default); **data disposition — never assume drop**. Echo scope; confirm before tracing.

## Phase 2 — Trace (read-only)

Name-grep is blind to renames/support layers. Order:

1. **Git archaeology first** — `git log -S`/`-G`, rename follow, introducing PR diffs as inverse footprint.
2. **Call-graph / typecheck-as-worklist** — then Knip/depcheck/vulture after first deletion pass.
3. **"Only reader left?"** for every resource the feature touched.
4. Walk **every** category in `references/orphan-smells.md` (skipped = missing work).

## REMOVAL MANIFEST (stop before deleting)

```text
REMOVAL MANIFEST — <feature>
introduced:   <commit/PR SHA(s)>
entry points: <routes / commands / endpoints / flag keys / jobs>
oracle:       <repo check+test commands>
baseline:     <must be GREEN before any deletion>

DELETE (feature-only):
  files / symbols / deps / tests / flags / routes / assets / docs
  schema:     <SWEEP — columns on KEPT tables; orphan enums; retention tunables>
  observ.:    <SWEEP — alarms/filters/dashboards/log groups outside src/>
KEEP (shared — do NOT touch):
  <symbols/files live paths also use>
VERIFY REPLACEMENT:
  backup/DR:  <new tables on backup grants / BACKUP_TABLES?>
  convention: <replacement matches current repo convention?>
HUMAN-GATED (propose exact commands; do not execute):
  db / data purge / env-secret / iac / external consoles
```

Red baseline ⇒ stop. HUMAN-GATED: remove from templates/migrations in the diff; propose exact apply commands; never run destructive prod applies yourself.

## CreatePlan → handoff → execute

After the filled manifest: **immediately** finish planning with `CreatePlan` — mandatory; do **not** use `TodoWrite` (or equivalent) as the finish artifact. Constraints:

- Title/overview name the feature and summarize DELETE / HUMAN-GATED / VERIFY counts.
- Plan body: the filled REMOVAL MANIFEST (verbatim structure above); no deletion yet.
- `todos`: one actionable pending item per concrete DELETE / HUMAN-GATED / VERIFY REPLACEMENT item; exhaustive; leaf-before-root; no bucket todos; no KEEP todos.
- Nothing to delete after scope (refuse / empty) → one-sentence plan body; omit `todos` (or pass an empty list).

Pause for user review/confirm of that plan (CreatePlan confirm UI). **Final fork** (`AskUserQuestion`, single select): continue-here / change-model / hand-to-workflow / stop. **Do not Execute until answered.**

Leave plan mode only then. Atomic commits; oracle green between each; collapse flag branches to surviving path; re-run orphan tools; `git diff --stat` must stay inside the manifest.

## REMOVAL EVIDENCE (before done)

```text
REMOVAL EVIDENCE — <feature>
oracle before/after: GREEN
reference sweep:     0 live hits (justify leftovers)
orphan tools:        clean or justified
deps pruned / kept-code intact / docs-config updated
human-gated:         exact commands proposed, or n/a
falsification:       likeliest surviving dependent path — why it didn't break
scope:               git diff --stat within manifest
```

Independent review for surviving refs/collateral/shims. Ship code via `/ship`. **State remaining human-gated tail** — code merge alone is not done.

## Don't

- Soft-disable / flag-off / shim under this skill (wrong activation)
- Grep-and-delete without scope confirmation; delete KEEP/shared symbols
- Run destructive prod migrations or stack teardowns yourself
- Skip plan mode, CreatePlan laundry-list todos, or the handoff pause
- Declare done while human-gated remainder is unstated
