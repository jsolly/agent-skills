---
name: optimize-workspace
description: Use when the user says `/optimize-workspace` or `/memory-to-config`, or wants a monthly workspace audit — mine sessions, memories, and friction for encodeable prefs/procedures; promote into durable config; peel/merge dead duplicates. Report-first capital plan, then AskUserQuestion on every proposed change. NOT for writing new memories as a filing system, unattended `/loop` runs, or encoding a singleton incident.
---

# Optimize Workspace

> **Integrate with `/ship`.** Repo edits wait for `/ship`. Machine edits and memory deletions apply live.

Attended, ~monthly capital-plan pass. Success metric: **quieter agents** — prefs in standing config, less rediscovery, memory used as a debt marker to drain (not a filing system). **No unattended / loop mode.**

## Four lanes → one approval walkthrough

| Lane | Job |
| --- | --- |
| Preferences + friction | Corrections/prefs + stuck loops → brief, rules, permissions, hooks |
| Reinvented wheels | Duplicate procedures across skills/rules/memories/plans/sessions → merge/relabel |
| Session autopsy | Worst/repeated sessions (all harnesses) as evidence |
| Promote + peel | Encode missing durable config; evidence-backed delete/merge of dead/duplicate config |

## Mine these sources (skip missing paths; never skip a whole harness silently)

1. `memory/*.md` + `MEMORY.md`
2. `memory/WATCH.md` (soft-archive; create if missing)
3. Degraded report: `bash reports/degraded-ai-performance-report.sh` (+ `EXAMPLES=1`)
4. Claude `~/.claude/projects/**/*.jsonl`
5. Cursor `~/.cursor/projects/*/agent-transcripts/*.jsonl`
6. Codex `~/.codex/sessions/`, `~/.codex/history.jsonl`
7. Config inventory: `skills/*/SKILL.md`, `rules/*.md`, `global-instructions/AGENTS.md`, `agents/*.md`, child-repo `AGENTS.md` under `~/code`, plan dirs
8. In-memory FOLLOW-UP / pending / TODO / DEFERRED; buried config suggestions in prose

Thin parsers ⇒ targeted reads still required — do not silently omit Cursor/Codex/friction.

## Recurrence gate

Propose new durable config only when: ≥2 sessions (any harness), or ≥2 repos, or clear repeat in the degraded report, or a memory that is already encodeable behavior (FOLLOW-UP / how-to-apply / repeating gotcha). **First-sighting singletons → soft-archive only** (`WATCH.md` + report appendix). No inventing rules/guards/skills for one-offs.

## Soft-archive (`memory/WATCH.md`)

Waiting room, not permanent filing. First sight → watch row. Reappearance → graduate to candidate. Stale inert watches → offer RETIRE (still AskUserQuestion).

## Candidate kinds (each needs its own approval)

| Kind | On approval |
| --- | --- |
| **PROMOTE** | Encode into config, then delete source memory |
| **RETIRE** | Already captured / dead — delete memory (grep-proof first) |
| **PEEL** | Unused *and* duplicate/better owner — delete/merge config |
| **MERGE / RELABEL** | Consolidate overlapping skills/rules |
| **PREFERENCE** | Repeated correction → `global-instructions/AGENTS.md` or a rule |

**KEEP** is report-only (live external state / open trackers) — not a walkthrough apply; not a failure. Default peel = evidence-backed only; no radical thin unless the user sets that bias.

## Pass algorithm

1. Mine all lanes → reconcile WATCH → cluster by recurrence.
2. Draft every candidate (target file + exact diff). Undrafted "consider a rule" is not a candidate. Verify "already in config" / "missing" against the live repo.
3. Emit **tiered report** (I safety → II productivity → III preference/style; one-offs in appendix).
4. **AskUserQuestion every candidate** — up to 4 questions per call, one decision each; recommendation first with `(Recommended)`; drafted diff in apply preview. Never infer blanket approval.
5. Apply approved set. **PROMOTE delete only after the edit lands**; if edit fails, leave memory. RETIRE only after proof of capture/death.
6. Reconcile `MEMORY.md` / `WATCH.md`. Summarize (contract below). Remind `/ship` per touched repo.

### Memory heuristics

- Rollout COMPLETE/SHIPPED/DONE → RETIRE (grep-proof).
- Live FOLLOW-UP / encodeable pending → PROMOTE.
- Recurring gotcha → PROMOTE.
- First sight → WATCH.
- Live external state / in-flight tracker → KEEP.
- One-off with no reusable rule → WATCH (never manufacture a guard).
- Superseded → RETIRE (name superseder).

### AskUserQuestion shape

header ≤12 chars; question names the change; options typically Apply as drafted (Recommended) / different target / Retire-skip / Keep — adapt for PEEL/MERGE; preview = exact diff.

## Config landing zones

**dotagents:** `rules/*.md`, `global-instructions/AGENTS.md`, `guards/block-*.sh`, `hooks/*.sh`, `permissions/agent.json`, `gate/gate-lib.sh`, `skills/*/SKILL.md`.

**Child repos:** that repo's `AGENTS.md` / hooks / pins — never author `CLAUDE.md` (symlink). One repo → that repo; many → dotagents. Prefer child until a second repo needs it. Edit in that repo's worktree.

Guards still bind (`block-claude-md-write`, `block-prod-db-migrations`, `block-stack-delete`, `block-edit-on-main`). Never push/merge from this skill.

## Closing summary

```text
optimize-workspace — <N> memories, <S> sessions/sources, <M> report buckets

APPLIED — repo (working tree; run /ship)
  ▸ <name> → <target> …
APPLIED — machine (live)
  ▸ …
DELETED — retired memories (grep-proof)
  ▸ …
WATCH — soft-archived first sightings
  ▸ …
KEPT — config can't encode
  ▸ …
PEELED / MERGED
  ▸ …
SKIPPED — declined
  ▸ …

Corpus: <N> → <N-deleted>. Watch list: <W>. Working tree: <f> files across <repos>.
Next: /ship per repo with edits. Machine edits already live.
```

## Don't

- Promote a singleton into durable config.
- Delete memory before config capture (or after a failed edit).
- Infer blanket / vibe approval.
- Use soft-archive as permanent filing, or treat KEEP as failure.
- Silently skip an entire harness or the friction lane.
- Push/merge repo changes from this pass.
