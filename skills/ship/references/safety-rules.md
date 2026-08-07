# Agent safety rules — git discipline + shell guards

## Git safety (no `block-git` guard)

Git safety during `/ship` is **orchestrator discipline**, not a shell guard. There is no `block-git` — agents may run normal git commands in Cursor/Claude/Codex.

**Non-negotiable skill rules:**

- Never `--no-verify` on commit (skips the repo pre-commit gate when wired). Never `--no-verify` on push either — even though the fleet gate no longer lives at push time, bypassing hooks is still forbidden.
- Never `git push --force`, `--force-with-lease`, or `git reset --hard`.
- Never `git add -A` or `git add .` — stage by name.
- Never bare `gh pr create` — always `DOTAGENTS_SHIP=1 gh pr create` (step 11 / `pr-integration.md`).
- Never bare `git push` — always `git push … # DOTAGENTS_SHIP=1` (trailing comment; branch push, direct-push, fix-red re-pushes). Keep `DOTAGENTS_SHIP=1 gh pr create` as a **leading** env prefix (guard-only; unaffected).

**Enforcement layers:**

| Layer | Role |
| --- | --- |
| **`/ship` orchestrator** | Runs the gate explicitly before push; never bypasses with `--no-verify`; marks every push with trailing `# DOTAGENTS_SHIP=1` and every PR create with leading `DOTAGENTS_SHIP=1`. |
| **Repo pre-commit hook** | Backstop when `core.hooksPath=.git-hooks` is wired — gate runs at every commit. |
| **`block-pr-create-outside-ship`** | Denies bare `gh pr create` / `gh pull-request create` unless the segment carries `DOTAGENTS_SHIP=1`. |
| **`warn-push-outside-ship`** | Soft ask on bare remote `git push` unless the segment carries trailing `# DOTAGENTS_SHIP=1` (or legacy leading env) (advisory; Claude/Codex only). |
| **Human terminal** | Manual git outside agent sessions — outside this skill's scope. |

Shell guards do **not** hard-block ordinary git (`commit` / `--no-verify` / force-push). `warn-push-outside-ship` is advisory only (ask, never deny). Do not assume hooks will block `--no-verify` or force push.

## Remaining shell guards (prod DB, stack teardown, PR create, CLAUDE.md)

Mechanical blocks — plus one soft advisory for push-outside-ship.

| Layer | Where | Covers |
| --- | --- | --- |
| **Home (laptop)** | `block-prod-db-migrations`, `block-stack-delete`, `block-pr-create-outside-ship`, advisory `warn-push-outside-ship` (Claude/Codex), plus path/write guards `block-edit-on-main` and `block-claude-md-write`, wired into each tool's app-owned config by an agent following `host machine setup docs` | Local Cursor, Claude Code, and Codex sessions on any wired machine |

The three hard shell guards are `block-prod-db-migrations`, `block-stack-delete`, and `block-pr-create-outside-ship`, plus the path/write guards and the advisory `warn-push-outside-ship`. Run the repo-root `doctor-agents.sh` (under the top-level `scripts` dir) to verify live wiring.

Install or refresh symlinked skills/agents/rules:

```bash
# Laptop: run the host skill installer (install-local-agent-runtime.sh).
# Cloud: bash .cursor/install-cloud-skills.sh
```

## Verify guard wiring

```bash
jq '.hooks.PreToolUse[] | select(.matcher == "Bash")' ~/.claude/settings.json
jq '.hooks.beforeShellExecution' ~/.cursor/hooks.json
```

## What this does NOT do

- Does not hard-block git operations — `/ship` orchestrator discipline still forbids unsafe git
  (stage by name; never `--no-verify` / force-push to `main`). `warn-push-outside-ship` asks on
  bare remote pushes (Claude/Codex) but never denies. The laptop global brief carries the same
  invariants for Cursor (no home-dir rules loader); do not cite private-only rule paths from this
  public-packaged skill.
- Does not run the gate — the skill runs the gate explicitly (orchestration steps 11–12).
