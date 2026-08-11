# Inventory and view-only dashboard

## Inventory

Report missing paths loudly; never silently omit a harness or evidence lane.

Canonical config:

- `skills/*/SKILL.md` plus references/scripts
- `rules/*.md`, `agents/*.md`, `global-instructions/AGENTS.md`
- relevant primary-checkout child `AGENTS.md` files
- live `~/.{cursor,claude,codex}/skills/<name>` targets, including broken links
  and tool-only orphans

Evidence and debt:

**Lookback for logs and conversations: last 30 days.** When mining
transcripts, session files, history, and the degraded report for
friction/evidence, only consider material from that rolling window (mtime or
entry timestamp — whichever the source exposes). Skip older logs/convos; do
not treat them as current evidence. Config assets above (skills/rules/agents/
brief) are not time-windowed.

- harness memory corpus, `MEMORY.md`, and `memory/WATCH.md`
- `reports/degraded-ai-performance-report.sh` with examples — defaults to a
  30-day window; do not widen it
- Claude project transcripts, Cursor agent transcripts, Codex
  sessions/history (≤30 days), and in-context FOLLOW-UP/TODO/DEFERRED material

Tool-managed built-ins and live-only bodies without a canonical source are
inventory findings, not editable skill-gauntlet targets.

For every asset record name/path, one-line purpose, origin, editability/reason,
and overlaps/dependencies. Cluster duplicate procedures, skill/rule
restatements, memory already captured in config, and skills whose body may add
no value beyond the harness default.

## Dashboard

Write and open `<run>/dashboard.html`; paste its absolute `file://` URL in
chat. It is view-only: no forms, mutation buttons, or selection controls.

Show:

- complete asset inventory and unavailable sources;
- capital counts/clusters and recommended skill/capital selection;
- for selected skills: frozen contract, non-sealed coverage summary, status,
  trials/judgments, harness-reported models, regressions, candidate summary,
  and held-out results only after use;
- for capital: candidate kind, target, exact-diff evidence link, and apply
  status.

Render from `state.json` with simple local HTML.

## Selection handoff

Summarize counts and the recommended set in chat, ask for skill names/capital
ids (or “all recommended”), then wait. A dashboard interaction is never
authorization. After chat selection, persist it, snapshot originals, and run
the selected lanes autonomously.
