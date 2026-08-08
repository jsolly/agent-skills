---
name: optimize-workspace
description: Use when the user says `/optimize-workspace` or `/memory-to-config`, or wants a monthly workspace audit — mine sessions, prompts, skills, memories, and friction signals for preferences, stuck loops, and reinvented wheels; drain encodeable memories into durable config; promote/peel rules, skills, guards, and AGENTS.md. Report-first capital plan, then AskUserQuestion on every proposed change. NOT for writing new memories as a filing system, unattended `/loop` runs, or one-off encoding of a singleton incident.
---

# Optimize Workspace

> **Integrate with `/ship`.** Repo edits from this skill (dotagents or child repos) must not land as
> tracked writes on a `main` checkout; isolation is harness-/repo-owned. Machine edits and memory
> deletions apply live.

A **monthly, attended** capital-plan pass that makes agents quieter: less rediscovery, preferences in
standing brief/config, skills findable by the words you actually say, and a thinner memory corpus.

**Success metric: Quiet agents** — sessions rarely re-derive the same fix; the brief holds real prefs;
soft-archive almost never graduates because true one-offs stay one-offs.

## Jobs (all of them)

One invocation runs four lanes, then a single approval walkthrough:

| Lane | Job |
| --- | --- |
| **Preferences + friction** | Mine corrections/prefs and stuck loops → brief, rules, permissions, hooks. |
| **Reinvented wheels** | Cross-scan skills/rules/memories/plans/sessions for duplicate procedures → merge, relabel, or point. |
| **Session autopsy** | Use worst/repeated sessions (all harnesses) as evidence for the above. |
| **Promote + peel** | Add missing durable config; propose evidence-backed deletion/merge of dead or duplicate config. |

**Memory → config is an explicit job, not a side effect.** When a memory documents a *behavior*
tooling/config can capture (rule, guard, hook, permission, gate, skill, `AGENTS.md` line), drain it:
PROMOTE-then-delete, or RETIRE when already captured / dead. Soft-archive is a waiting room for first
sightings, not a permanent filing system. KEEP stays rare (live external state config cannot encode).

**Stance: config beats memory when the knowledge is reusable behavior.** Auto-memory stays enabled so
this skill can drain it — a memory is a debt marker, not a knowledge base. Bias hard toward PROMOTE
and RETIRE for encodeable behavior; KEEP only when config genuinely cannot represent the fact.

## Composition (how a pass runs)

1. **Mine broadly** — anything valuable (signals below).
2. **Update soft-archive** — first sightings get `watch`; reappearances graduate to candidates.
3. **Cluster by recurrence** — only recurring patterns (or clear encodeable memory→config behaviors)
   become proposed *changes*.
4. **Emit a tiered report** — capital plan by blast radius / sessions saved (Tier I safety → Tier II
   productivity → Tier III preference/style). One-offs stay in an appendix (no question yet).
5. **AskUserQuestion every proposed change** — high-impact; nothing applies without an explicit per-
   candidate approval. Show the drafted diff in the option preview. Batch up to 4 questions per call;
   each question is still one decision.
6. **Apply the approved set** — then summarize. Never push; repo edits wait for `/ship`.

## Signal sources (mine anything valuable)

Scan all of these that exist on the machine. Absence of a path is not a failure — note it and continue.

1. **`memory/*.md`** (+ `MEMORY.md` index) — primary corpus to drain. Read every file.
2. **`memory/WATCH.md`** — soft-archive index (gitignored with `memory/`). Create if missing.
3. **Degraded-performance report** (Claude friction today; still required):

   ```bash
   bash reports/degraded-ai-performance-report.sh
   EXAMPLES=1 bash reports/degraded-ai-performance-report.sh
   ```

4. **Claude transcripts** — `~/.claude/projects/**/*.jsonl`
5. **Cursor transcripts** — `~/.cursor/projects/*/agent-transcripts/*.jsonl`
6. **Codex sessions** — `~/.codex/sessions/`, `~/.codex/history.jsonl` (and related indexes if present)
7. **Config inventory** — `skills/*/SKILL.md`, `rules/*.md`, `global-instructions/AGENTS.md`,
   `agents/*.md`, child-repo `AGENTS.md` files under `~/code`, and plan dirs
   (`.cursor/plans/`, `.claude/plans/`, `.codex/plans/`) for reinvention/overlap
8. **In-memory FOLLOW-UP / pending / TODO / DEFERRED** — highest-signal PROMOTEs
9. **Explicit config suggestions buried in prose** — hooks/rules waiting to be named

v1 may analyze Cursor/Codex via targeted agent reads when parsers are thin — still mine them; do not
silently skip a harness because automation is incomplete.

## Recurrence gate

**Do not propose new durable config for a singleton.** A pattern earns a candidate when any of:

- It appears in **≥2 distinct sessions** (any harness), or
- It appears across **≥2 repos**, or
- The degraded report (or equivalent count) shows a **clear repeat** in the window, or
- A memory is already a clear encodeable behavior (FOLLOW-UP / how-to-apply / repeating gotcha) —
  corpus drain does not require re-deriving recurrence from transcripts if the memory itself is the
  second sighting of a known class.

One-offs: **soft-archive only** (report appendix + `WATCH.md`). No AskUserQuestion that invents a
new rule/guard/skill for a first sighting.

## Soft-archive (`memory/WATCH.md`)

Waiting room for first sightings — not forever storage.

- **On first sight:** add a row to `memory/WATCH.md` (signature, source path/session id, date,
  suggested niche). Optionally set memory frontmatter `metadata.watch: true` when the signal is a
  memory file.
- **On reappearance:** remove from watch (or mark graduated), draft the config change, put it in the
  AskUserQuestion walkthrough. After approved PROMOTE → delete the memory if one existed.
- **Stale watch entries** that never recur and are not encodeable behavior → offer RETIRE/delete in
  the receipt lane once verified dead (still AskUserQuestion before delete).

## Candidate kinds (what gets an AskUserQuestion)

Every item below is a *proposed change* and needs its own approval:

| Kind | Meaning | On approval |
| --- | --- | --- |
| **PROMOTE** | Encode behavior into config (rule/guard/hook/permission/gate/skill/AGENTS), then delete source memory if any. | Apply diff → delete memory. |
| **RETIRE** | Already in config / dead fact / rollout receipt — delete memory. | Delete memory (grep-proof first). |
| **PEEL** | Evidence-backed: config unused in the window *and* duplicate / better niche occupant exists. | Delete or merge the config artifact. |
| **MERGE / RELABEL** | Reinvention: consolidate overlapping skills/rules or rename/describe for discoverability. | Apply consolidation. |
| **PREFERENCE** | Repeated user correction/pref → `global-instructions/AGENTS.md` or a rule. | Apply brief/rule edit. |

**KEEP** is not a walkthrough candidate — list KEEP memories in the report with *why* (live state /
in-flight tracker). Do not force them into config to hit a deletion count.

**Default peel stance:** evidence-backed only (unused + duplicate/better owner). Do not radical-thin
unless the user asks for that bias this pass.

## Hard invariants (never cross)

1. **Approval is per-change and explicit.** Apply a config edit or memory deletion only after the
   user approves *that* candidate in AskUserQuestion. Batch questions; never infer approval.
2. **Config-first: never delete a memory whose knowledge isn't captured.** PROMOTE delete only after
   the edit lands; RETIRE only after grep proves capture or death. `memory/` is gitignored —
   deletion is permanent. If the edit fails, do not delete.
3. **Verify against the live repo** before "already in config" or "doesn't exist yet."
4. **Don't invent low-value config.** One-offs, already-covered facts, and classifier-handled cases
   are not PROMOTEs. Over-broad guards are a cost (`guard-narrowing` lesson).
5. **Respect KEEP** for live external state and open trackers.
6. **Repo edits → `/ship` only; never push/merge yourself.** Machine edits + memory deletions apply live.
7. **Guards still bind** (`block-claude-md-write`, `block-prod-db-migrations`, `block-stack-delete`,
   `block-edit-on-main`). Don't route around them.

## The config surface (where promotions land)

**dotagents:** `rules/*.md`, `global-instructions/AGENTS.md`, `guards/block-*.sh`, `hooks/*.sh`,
`permissions/agent.json`, `gate/gate-lib.sh`, `skills/*/SKILL.md`.

**Child repos** (`~/code/...`): that repo's `AGENTS.md`, `.git-hooks/`, version pins — never author
`CLAUDE.md` (symlink). Route: one repo → that repo; many → dotagents. Unsure → prefer the child repo
until you can name a second repo it helps. Author each repo's edits in a worktree of *that* repo.

## Per-pass algorithm

1. **Gather signals** from every available source above. Run the degraded report. Note top buckets
   and worst sessions across harnesses you can read.
2. **Reconcile soft-archive** — refresh `WATCH.md`; graduate reappearances; leave true first-sights
   in the appendix.
3. **Triage memories** to provisional PROMOTE / RETIRE / KEEP / WATCH using the heuristics below
   (encodeable behavior → PROMOTE path; receipts → RETIRE; live state → KEEP; first sight → WATCH).
4. **Cluster recurrence** for transcript/config-inventory findings; draft reinvention MERGEs and
   evidence-backed PEELs.
5. **Draft every candidate before asking** — pick the target file, grep for duplicates, write the
   exact diff or prose block. Undrafted "consider a rule" is not a candidate.
6. **Print the tiered report** (summary + appendix of one-offs/watch). Then **walk every candidate**
   via AskUserQuestion (up to 4 per call; one question per candidate; recommendation first with
   `(Recommended)`; diff in `preview`).
7. **Apply the approved set.** Repo edits in worktrees; machine/memory live. Failed edit → leave
   memory in place.
8. **Corpus hygiene** — reconcile `MEMORY.md` / `WATCH.md` for deleted or graduated entries.
9. **Summarize** (contract below). Remind `/ship` per repo that received edits.

### Decision heuristics (memories)

- Rollout `COMPLETE` / `SHIPPED` / `DONE` → **RETIRE** (grep-proof artifact exists).
- Live `FOLLOW-UP:` / pending encodeable action → **PROMOTE** the pending part.
- Recurring gotcha / how-to-apply that keeps biting → **PROMOTE**.
- First sighting, no recurrence yet → **WATCH** (soft-archive), not PROMOTE.
- Live external state / in-flight tracker → **KEEP**.
- One-off with no reusable rule → **WATCH** or eventually **RETIRE** if inert — never manufacture a guard.
- Superseded → **RETIRE**, naming the superseder.

When torn between PROMOTE and KEEP: *"Is there a file where writing this once would make it
enforced/known every session?"* Yes → PROMOTE. World-state fact → KEEP.

### AskUserQuestion shape (per candidate)

- **header** ≤12 chars; **question** names the candidate and proposed change in one sentence.
- Options typically: `Apply as drafted (Recommended)` · `Apply, different target` · `Retire/skip instead`
  · `Keep / no change` — adapt labels to PEEL/MERGE/PREFERENCE.
- **preview** on the apply option = the exact diff or prose block.
- User answer is decision of record. "Other" → re-draft and re-ask if the change is materially different.

## Closing summary contract

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

## Landing the changes

- **Repo edits** (dotagents + child repos): apply in the appropriate worktree; leave for `/ship`.
  Prefer one PR per theme.
- **Machine edits** (`settings.json`, dotfiles) and **memory / WATCH deletions**: apply live.
  Mirror canonical permission changes into `permissions/agent.json` when needed (that part rides `/ship`).

## Running it

**Manual, ~monthly — do not put on a `/loop`.** Attended by design: you approve every high-impact
change. There is no unattended mode. `/memory-to-config` is an alias trigger for this skill.

## Wiring

Canonical skill under `skills/optimize-workspace/`. After merge to `main`, the installer
per-skill-symlinks it into `~/.claude|cursor|codex/skills/`. `doctor-agents.sh` verifies links.
