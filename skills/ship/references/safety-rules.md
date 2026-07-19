# Agent safety rules — git discipline + remaining shell guards

## Git safety (no `block-git` guard)

Git safety during `/ship` is **orchestrator discipline**, not a shell guard. There is no `block-git` — agents may run normal git commands in Cursor/Claude/Codex.

**Non-negotiable skill rules:**

- Never `--no-verify` on commit (skips the repo pre-commit gate when wired). Never `--no-verify` on push either — even though the fleet gate no longer lives at push time, bypassing hooks is still forbidden.
- Never `git push --force`, `--force-with-lease`, or `git reset --hard`.
- Never `git add -A` or `git add .` — stage by name.

**Enforcement layers:**

| Layer | Role |
| --- | --- |
| **`/ship` orchestrator** | Runs the gate explicitly before push; never bypasses with `--no-verify`. |
| **Repo pre-commit hook** | Backstop when `core.hooksPath=.git-hooks` is wired — gate runs at every commit. |
| **Human terminal** | Manual git outside agent sessions — outside this skill's scope. |

Shell guards do **not** intercept git commands. Do not assume Cursor/Claude/Codex hooks will block `--no-verify` or force push.

## Remaining shell guards (prod DB, stack teardown, CLAUDE.md)

Mechanical blocks on prod DB migrations, infra teardown, and authoring into `CLAUDE.md` — not advisory.

| Layer | Where | Covers |
| --- | --- | --- |
| **Home (laptop)** | `block-prod-db-migrations`, `block-stack-delete`, and `block-claude-md-write` wired into each tool's app-owned config by an agent following `host machine setup docs` | Local Cursor, Claude Code, and Codex sessions on any wired machine |

The two shell guards are `block-prod-db-migrations` and `block-stack-delete`, plus the path/write guard `block-claude-md-write`. On a laptop host, run the doctor script to verify live wiring. Cloud VMs skip laptop doctor/guards.

Install or refresh symlinked skills/agents/rules:

```bash
# Laptop-only: run the host skill installer (install-local-agent-runtime.sh). Cloud: bash .cursor/install-cloud-skills.sh.
# Cloud: bash .cursor/install-cloud-skills.sh
```

## Verify guard wiring

```bash
jq '.hooks.PreToolUse[] | select(.matcher == "Bash")' ~/.claude/settings.json
jq '.hooks.beforeShellExecution' ~/.cursor/hooks.json
```

## What this does NOT do

- Does not mechanically block git operations — `/ship` and user rules still forbid unsafe git.
- Does not run the gate — the skill runs the gate explicitly (orchestration steps 11–12).
