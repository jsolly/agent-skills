# Capital plan (memories, rules, agents, brief)

Read after the user selects capital candidates (or “all recommended”). Apply the selected set autonomously — no per-diff re-ask. Still draft exact diffs before mutating. Escalate only genuine blockers.

## Goal

Drain encodeable debt: prefs and procedures into standing config; peel/merge dead duplicates; treat memory as a debt marker, not a filing system.

## Mine → candidates (pre-selection)

During inventory, mine all lanes and draft candidates into `capital/candidates.md` + dashboard:

| Lane | Job |
| --- | --- |
| Preferences + friction | Corrections/prefs + stuck loops → brief, rules, permissions, hooks |
| Reinvented wheels | Duplicate procedures across skills/rules/memories/plans/sessions → merge/relabel |
| Session autopsy | Worst/repeated sessions (all harnesses) as evidence |
| Promote + peel | Encode missing durable config; evidence-backed delete/merge of dead/duplicate config |

Sources: same list as `references/inventory-and-dashboard.md` (memories, WATCH, degraded report, Claude/Cursor/Codex transcripts, config inventory).

### Recurrence gate

Propose **new** durable config only when: ≥2 sessions (any harness), or ≥2 repos, or clear repeat in the degraded report, or a memory that is already encodeable behavior (FOLLOW-UP / how-to-apply / repeating gotcha).

**First-sighting singletons → soft-archive only** (`WATCH.md` + appendix). No inventing rules/guards/skills for one-offs.

### Soft-archive (`memory/WATCH.md`)

Waiting room, not permanent filing. First sight → watch row. Reappearance → graduate to candidate. Stale inert watches → RETIRE candidates (applied when selected).

### Candidate kinds

| Kind | On apply |
| --- | --- |
| **PROMOTE** | Encode into config, then delete source memory |
| **RETIRE** | Already captured / dead — delete memory (grep-proof first) |
| **PEEL** | Unused *and* duplicate/better owner — delete/merge config |
| **MERGE / RELABEL** | Consolidate overlapping skills/rules (skill body merges defer to skill-gauntlet when that skill is also selected) |
| **PREFERENCE** | Repeated correction → `global-instructions/AGENTS.md` or a rule |

**KEEP** is report-only (live external state / open trackers) — not an apply failure. Default peel = evidence-backed only; no radical thin unless the user selected a thin-bias cluster.

Every candidate must include **target file + exact diff**. Undrafted “consider a rule” is not a candidate. Verify “already in config” / “missing” against the live repo.

### Memory heuristics

- Rollout COMPLETE/SHIPPED/DONE → RETIRE (grep-proof).
- Live FOLLOW-UP / encodeable pending → PROMOTE.
- Recurring gotcha → PROMOTE.
- First sight → WATCH.
- Live external state / in-flight tracker → KEEP.
- One-off with no reusable rule → WATCH (never manufacture a guard).
- Superseded → RETIRE (name superseder).

### Tiering (dashboard + candidates.md)

I safety → II productivity → III preference/style; one-offs in appendix (WATCH only unless recurrence).

## Apply (post-selection)

1. Snapshot originals for every file that will change (`references/persistence.md`).
2. Apply selected candidates in dependency order (encode before delete; merge before peel of losers).
3. **PROMOTE delete only after the edit lands**; if edit fails, leave memory and mark `blocked` with reason.
4. RETIRE only after proof of capture/death (grep-proof).
5. Reconcile `MEMORY.md` / `WATCH.md`.
6. Append each outcome to `capital/apply-log.md` and update dashboard / `state.json`.

Do **not** re-prompt for approval per candidate after selection. If the user selected “all recommended,” that is standing authorization for the drafted set. If a draft is wrong mid-apply (conflict, missing target, guard deny), mark blocked and continue with the rest.

### Config landing zones

**dotagents:** `rules/*.md`, `global-instructions/AGENTS.md`, `guards/block-*.sh`, `hooks/*.sh`, `permissions/agent.json`, `gate/gate-lib.sh`, `skills/*/SKILL.md` (prefer skill-gauntlet when the skill itself is selected).

**Child repos:** that repo's `AGENTS.md` / hooks / pins — never author `CLAUDE.md` (symlink). One repo → that repo; many → dotagents. Prefer child until a second repo needs it. Edit in that repo's worktree.

Guards still bind (`block-claude-md-write`, `block-prod-db-migrations`, `block-stack-delete`, `block-edit-on-main`). Never push/merge from this skill.

### Interaction with skill gauntlet

- If a MERGE touches a skill that is also in the skill-gauntlet selection, let the gauntlet own the skill body; capital lane records the overlap and skips conflicting skill-body edits.
- Pure rule/brief/memory work stays in this lane.

## Hard don'ts (capital)

- Promote a singleton into durable config.
- Delete memory before config capture (or after a failed edit).
- Use soft-archive as permanent filing, or treat KEEP as failure.
- Silently skip an entire harness or the friction lane during mining.
- Infer selection the user did not give (“all recommended” counts only when they said so).
