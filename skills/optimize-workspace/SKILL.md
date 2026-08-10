---
name: optimize-workspace
description: >-
  Use when the user says `/optimize-workspace` or `/memory-to-config`, or wants
  an exhaustive workspace optimization — inventory skills/rules/memories/agents/
  brief, open a view-only HTML dashboard, wait for selection, then autonomously
  run a Skills Upgrade Gauntlet on selected skills and a capital-plan
  promote/peel/merge pass on selected memories/rules/agents/brief until each
  item is green, retired, or applied. NOT for writing new memories as a filing
  system, encoding a singleton incident, or shipping/merging PRs from this skill.
---

# Optimize Workspace

> **Integrate with `/ship`.** Repo edits wait for `/ship`. Machine edits and memory deletions apply live.

**Outcome:** selected workspace assets are honestly improved or retired — skills via a blind Skills Upgrade Gauntlet; memories/rules/agents/brief via evidence-backed capital-plan apply — with a live dashboard and resumable run state. Success metric: **quieter agents** (prefs in standing config, skills that earn their tokens, memory as a debt marker to drain).

Method peer: [Gauntlet Loop](https://somethingbig.ai/gauntlet-loop) / [Skills Upgrade](https://somethingbig.ai/skills-upgrade). Creation-side peer: `/solly-create-skill`.

## Product gate

Claim `done` only when all hold:

1. Inventory covered every available scope (missing paths skipped loudly; whole harness never skipped silently).
2. View-only dashboard written, opened, and linked in chat before any upgrade/apply.
3. User selected the set in chat (or explicitly resumed a prior run) — never start from dashboard clicks.
4. Every selected **skill** is green (decisive upgrade) or **Green — retire**, with held-out evidence after install.
5. Every selected **capital** candidate is applied, blocked with reason, or deliberately skipped after selection — no silent drops.
6. Immutable originals preserved; run state persisted so the pass can resume.
7. Exact model IDs logged for every contestant/judge run; unavailable conditions labeled, never faked.

## Required progressive loading

1. Before inventory or resume decisions, read `references/persistence.md`.
2. Before writing/opening the dashboard, read `references/inventory-and-dashboard.md`.
3. After selection, for each selected skill, read `references/skill-gauntlet.md` before mutating that skill.
4. After selection, before applying capital candidates, read `references/capital-plan.md`.

Do not preload the skill-gauntlet or capital-plan refs until that lane has selected work.

## Loop

1. **Resume check** — if an incomplete run exists under `~/.config/dotagents/optimize-workspace/`, offer resume vs new run (`references/persistence.md`).
2. **Inventory** — skills, rules, agents, global brief, memories, session/friction sources, overlaps (`references/inventory-and-dashboard.md`).
3. **Dashboard** — write `dashboard.html` + `state.json` in the run dir; `open` it; paste the `file://` link. View-only.
4. **Select and wait** — present inventory clearly, recommend a default set, wait for the user's reply in chat. Do not begin upgrades until they respond.
5. **Snapshot originals** — copy every selected skill (full dir) and every capital target that will be edited into `originals/` before mutation.
6. **Autonomous lanes** — work until every selected item is resolved. Pause only for a genuine external blocker or an action that could affect live systems/data.
   - **Skills** → `references/skill-gauntlet.md` (independent experiment per skill).
   - **Memories / rules / agents / brief** → `references/capital-plan.md` (draft exact diffs, then apply the selected set without per-diff re-asks).
7. **Install / apply** — write winning skill versions into the canonical skill dirs; apply capital edits; refresh installer links only if skills were added/removed/renamed.
8. **Final sealed eval** — for each upgraded (non-retired) skill, fresh contestant + judge runs on the held-out set; update dashboard.
9. **Receipt** — notify the user the run is complete; remind `/ship` per touched repo.

Keep the dashboard and `state.json` updated throughout. Never ask the user to direct experiments, approve revisions, interpret results, or decide what to try next after selection.

## Two lanes

| Lane | Assets | Resolution |
| --- | --- | --- |
| Skill Gauntlet | Selected `skills/<name>/` | Outcome contract → benchmark → blind eval → upgrade or **Green — retire** |
| Capital plan | Memories, rules, agents, `global-instructions/AGENTS.md`, child-repo briefs | PROMOTE / RETIRE / PEEL / MERGE / PREFERENCE / KEEP — apply after selection |

## Models

Use real models available in the current harness. Verify and log the exact model for every contestant and judge. Never silently substitute, route two labeled conditions through the same underlying model while claiming they differ, or claim an unavailable model was tested. Skip unavailable conditions and label them on the dashboard.

Standing skill principle: a skill should primarily contain what the model could not reasonably know on its own.

## Hard don'ts

- Start the gauntlet/capital apply before the user selects (unless resuming an already-selected run).
- Promote a singleton into durable config.
- Delete memory before config capture (or after a failed edit).
- Manufacture a revised skill just to paint the dashboard green — retire instead.
- Leak held-out tasks, eval packets, or verdicts to skill builders before final eval.
- Write skill bodies into `~/.{cursor,claude,codex}/skills/` (symlinks only) or `~/.cursor/skills-cursor/`.
- Author into `CLAUDE.md` (symlink); push/merge from this skill; invoke `/ship` unless the user asks after the pass.
- Fake model IDs or skip a harness/friction source silently.

## Receipt

```text
optimize-workspace — run <id> — <S> skills, <C> capital candidates

SKILLS
  ▸ <name> — Green (upgrade) | Green — retire | blocked (<reason>)
CAPITAL — repo (working tree; run /ship)
  ▸ …
CAPITAL — machine / memory (live)
  ▸ …
WATCH / KEPT / BLOCKED
  ▸ …

Dashboard: file://…/dashboard.html
Originals: ~/.config/dotagents/optimize-workspace/<id>/originals/
Next: /ship per repo with edits. Machine edits already live.
```
