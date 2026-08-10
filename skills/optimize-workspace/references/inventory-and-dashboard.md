# Inventory and dashboard

Read before writing or opening the dashboard. Selection happens in chat — the dashboard is **view-only**.

## Inventory scopes

Skip missing paths loudly (note on dashboard). Never skip a whole harness silently.

### Config assets (canonical under the active `dotagents` checkout)

| Asset | Paths |
| --- | --- |
| Skills | `skills/*/SKILL.md` (+ sibling `references/`, `scripts/`) |
| Rules | `rules/*.md` |
| Agents | `agents/*.md` |
| Global brief | `global-instructions/AGENTS.md` |
| Child briefs | `~/code/*/AGENTS.md` (primary checkouts) when relevant |

Also note live symlink targets under `~/.{cursor,claude,codex}/skills/<name>` — bodies must resolve to the canonical skill dir, not tool-local copies. Flag broken links / tool-only orphans.

**Not editable via this skill's skill-gauntlet:** `~/.cursor/skills-cursor/` (Cursor built-ins), whole-directory symlinks, or skills that exist only as live copies with no canonical dir.

### Memory and friction sources

1. `memory/*.md` + `MEMORY.md` (relative to the memory corpus the harness uses; typically under the personal agent home / personal-memory paths already in use)
2. `memory/WATCH.md` (soft-archive; create if missing when capital lane runs)
3. Degraded report: `bash reports/degraded-ai-performance-report.sh` (+ `EXAMPLES=1`) from the dotagents checkout
4. Claude `~/.claude/projects/**/*.jsonl`
5. Cursor `~/.cursor/projects/*/agent-transcripts/*.jsonl`
6. Codex `~/.codex/sessions/`, `~/.codex/history.jsonl`
7. In-memory FOLLOW-UP / pending / TODO / DEFERRED; buried config suggestions in prose

Thin parsers ⇒ targeted reads still required.

### Per-asset record

For each inventoried item capture:

- **Name / path**
- **What it does** (one sentence from frontmatter description or first heading)
- **Origin** (canonical repo path, child repo, memory-only, live-orphan)
- **Editable?** (yes / no + reason)
- **Dependencies / overlaps** (shared triggers, duplicate procedures, skill↔rule restatements, memory already encoded in config)

## Overlap discovery

Cluster before presenting selection:

- Duplicate procedures across skills/rules/memories/plans/sessions → MERGE / RELABEL capital candidates
- Skill whose entire body is model-common knowledge → gauntlet retirement candidate
- Memory already mirrored in brief/rules → RETIRE capital candidate
- Rules that only restate a skill → PEEL / MERGE

## Dashboard contract

Write `dashboard.html` under the run dir (`references/persistence.md`). Open with `open <path>` (macOS) or the platform equivalent. Paste the absolute `file://` link in chat.

### View-only

No forms, no upgrade buttons, no selection controls that mutate state. The user selects by replying in the agent chat.

### Must show

### Inventory

- Complete skill inventory: purpose, origin, editable, overlaps
- Capital-side summary: memories/rules/agents/brief counts, recommended promote/peel/merge clusters
- Recommended default selection (skills + capital) with one-line rationale each

### Per selected skill

Update live during the run:

- Outcome contract (after freeze)
- Benchmark coverage summary (counts/kinds — **not** sealed held-out task text before use)
- Status: red / yellow / green / Green — retire / blocked
- Exact model IDs for every contestant and judge
- Completed trials, blind results, judge explanations
- Regressions, iteration history, current candidate diff summary
- Held-out performance (only after sealed eval)

### Capital lane

- Candidate list with kind (PROMOTE / RETIRE / PEEL / MERGE / PREFERENCE / KEEP)
- Draft target paths, apply status, evidence links into run-dir logs

Regenerate HTML from `state.json` whenever status changes. Prefer boring readable HTML (one file, inline CSS) over a framework.

## Selection handoff (chat)

After opening the dashboard:

1. Summarize inventory counts and the **recommended** set.
2. Ask the user to select (skills by name, capital by id/cluster, or “all recommended”).
3. **Wait.** Do not start gauntlet or capital apply until they reply.
4. On reply, lock selection into `state.json`, snapshot originals, then run autonomously.
