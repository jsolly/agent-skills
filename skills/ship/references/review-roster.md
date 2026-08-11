# Review roster — Cursor Task subagents

Bind every fleet review agent under `agents/` as a Cursor **Task** subagent (`subagent_type` = agent `name`). Do not invent parallel lenses or skip named agents when their gate matches. Shared finding shape / severity / verdict: `output-contract.md` (all lens agents cite it; `confidence-scorer` uses its own adjudication block).

## Depth → who runs

| Depth | Dispatch |
| --- | --- |
| **`skipped`** | Docs/config allowlist only (`profiles.md`) — no Task fan-out |
| **`light`** | Core four + path-gated additives whose gates match |
| **`full`** | Everything in light **plus** `code-quality-reviewer`, and force-include risk lenses below even if path heuristics are fuzzy |

Default depth comes from `profiles.md` (profile table + risk escalate). After a light pass, if any **Critical/Important** finding is structural, security, or infra → escalate to **full** and re-dispatch missing agents **before** push (counts as one review-fix cycle when code changes).

### Core (always on `light` and `full`)

| Agent | Role |
| --- | --- |
| `bug-scanner` | Logic errors, broken contracts, races, edge cases |
| `secrets-scanner` | Hardcoded credentials / `.env` leaks (redact in findings) |
| `security-scanner` | Injection, XSS, auth bypass, crypto misuse |
| `guidelines-auditor` | Project `AGENTS.md` + linked guideline files |

### Path-gated (add when the pending change set matches; empty-scope verdict OK)

| Agent | Gate (orchestrator) |
| --- | --- |
| `a11y-reviewer` | `**/*.{tsx,jsx,vue,astro,html}` (markup-bearing) |
| `test-reviewer` | Test files / obvious test paths changed |
| `error-handling-reviewer` | Async, catch, retry, or handler error-path edits |
| `dependency-scanner` | Manifest/lockfile adds or version bumps |
| `db-migration-reviewer` | `.sql`, Prisma/Alembic/Supabase/`migrations/**`/`db/**` schema |
| `infra-reviewer` | CDK/Terraform/SAM/CFN/K8s/Pulumi IaC |

Touching migration or IaC paths **forces `full`** depth (see `profiles.md`), which still runs these lenses.

### Full-only

| Agent | Role |
| --- | --- |
| `code-quality-reviewer` | Maintainability / code-judo / 1k-line / spaghetti — not on light |

### Adjudicator (not a lens)

| Agent | When |
| --- | --- |
| `confidence-scorer` | After lenses return: one Task invocation **per** remaining Critical/Important finding (drop Minor first). Blind to which agent raised it. Keep Confirm\*; drop Downgrade-to-Minor / False positive |

## Orchestrator disposition (after scoring)

- Verified Critical/Important → fix in-run (same branch) or explicitly reject with reason — never a user punch-list on success.
- Unbounded redesign / conflicts with stated user intent → **stop-and-ask** (`Stopped — not pushed`).
- Cap review-fix at **3**; next failure → hard-stop.
- Report depth used (`light` / `full` / `skipped`) and disposition in the close receipt (`close.md`).

## Cursor Task means

- Launch matching agents in parallel when independent.
- Pass: diff, changed paths, and (when the agent asks) guidelines / file excerpts.
- Read-only reviewers — orchestrator applies fixes, not the Task agents.
