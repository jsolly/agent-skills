# Orphan Smells — category catalog

Walk every row during Phase 2. Skipped category = missing work.

## Dominant lesson

**Name-grep finds the obvious module and misses the support layer** — generically named caches, backfills, retention windows, columns on kept tables. Two techniques beat grep:

1. **Git archaeology before any grep** (renames hide UI/support).
2. **"Who is the only reader, and does it survive?"** — write-only caches, windows sized for a dead consumer, columns only the removed path selected still "work," so no tool flags them.

Static tools over-approximate (miss dynamic refs); coverage under-approximates. Agreement is highest-confidence. Output = candidates, not verdicts.

## Categories

| # | Category | Signal / tool |
| --- | --- | --- |
| 1 | Unreferenced files/exports (TS/JS) | Knip after first deletion; `tsc` worklist (stub entry → errors enumerate refs) |
| 2 | Unreferenced Python | Vulture / deadcode; mind `getattr` |
| 3 | Unused deps | Knip/depcheck; deptry DEP002; prune + lockfile same commit |
| 4 | Orphaned tests/fixtures | Grep `tests/` for imports of each deleted module; split mixed tests |
| 5 | Stale flags | Flag-ref finder; delete flag **and** collapse every `if (flag)` to surviving branch |
| 6 | Dead DB residue | Columns on **kept** tables; enums/sequences not cascade-dropped; historical typed rows (optional human-gated DELETE); retention/LOOKBACK tunables sized for dead consumer |
| 7 | Backup/DR (additive) | Replacement tables missing from backup grants / `BACKUP_TABLES` — audit replacement, not just removal |
| 8 | Observability outside src/ | Alarms/filters/dashboards/SNS in IaC; for each: does the keyed log field still have a live emitter? Else orphan. Stale descriptions count |
| 9 | Abandoned IaC / cron / queues | First establish whether dedicated infra existed; template edit vs prod apply (human-gated) |
| 10 | Orphan routes/endpoints | Grep route + caller set; remove handler + test |
| 11 | Unreachable UI/assets | Knip + asset filename grep; renames hide panels |
| 12 | Dead CSS | PurgeCSS (+ safelist dynamic classes); Coverage for confirmation |
| 13 | Hand-authored type remnants | Regenerate generated types; grep hand-authored unions/aliases |
| 14 | Dead function parameters | knip/Vulture miss dead options — read call sites the removal touched |
| 15 | Dangling docs/comments | Grep user-facing nouns across md/astro/comments/IaC prose |
| 16 | Unused env/secrets | Grep `.env*`, config, IaC, code; retiring live SSM/secret values is HUMAN-GATED; deleting `.env.example` + dead reads is code |
| 17 | Convention drift on replacement | e.g. text+CHECK where repo mandates enums — cheap before push |

## Git techniques (do first)

- `git log --oneline --all -S'<token>'` — introducing/removal commits by occurrence count
- `git log -G'<regex>'` — edits/moves `-S` misses
- `git log --follow -- <one-file>` — renames for a single file; for directory rename chains use pathspec `'*<token>*'` or pickaxe
- Read introducing PR merge diff (`git show <sha>`) as inverse manifest, including generically named support files

## Deploy-gate gotcha (fleet)

Prose-only edits to IaC (e.g. `aws/template.yaml` comments) can trip "refuse infra-only deploy" and strand mixed deploys. Check the repo's deploy gates before pushing.
