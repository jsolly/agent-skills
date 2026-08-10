# Persistence and resume

Machine-local run state — **not** committed to the repo.

## Run root

```text
~/.config/dotagents/optimize-workspace/<run-id>/
```

`<run-id>` = UTC timestamp `YYYYMMDDTHHMMSSZ` (or resume an existing incomplete id). Create the directory before writing dashboard or originals.

## Layout

```text
<run-id>/
├── dashboard.html          # view-only; regenerate from state.json as needed
├── state.json              # durable machine-readable progress
├── originals/              # immutable copies taken before mutation
│   ├── skills/<name>/…     # full skill tree snapshot
│   └── capital/<path-safe> # files that will be edited
├── skills/<name>/
│   ├── contract.md         # frozen outcome contract
│   ├── benchmark/
│   │   ├── iteration/      # builders may see failures here
│   │   └── held-out/       # SEALED from builders until final eval
│   ├── candidates/         # v1, v2, … skill drafts
│   ├── trials/             # contestant outputs (anonymized copies for judges)
│   └── verdicts/           # blind judge results
└── capital/
    ├── candidates.md       # drafted diffs + evidence
    └── apply-log.md        # what landed, what blocked
```

## `state.json` (minimum)

Persist enough to resume after context reset, process failure, rate limit, or interrupted session:

- `runId`, `status` (`inventory` | `awaiting_selection` | `running` | `final_eval` | `complete` | `blocked`)
- `selected.skills[]`, `selected.capital[]`
- Per skill: phase, contract frozen?, benchmark frozen?, current candidate id, red/yellow/green, retire?, exact model ids used, last error
- Capital: candidate ids → `pending` | `applied` | `blocked` | `skipped`
- Paths to dashboard and originals

Update `state.json` after every meaningful phase transition. Prefer rewriting `dashboard.html` from state rather than hand-editing HTML as source of truth.

## Immutable originals

Before any mutation of a selected skill or capital target:

1. Copy the full skill directory to `originals/skills/<name>/` (including `references/` and `scripts/`).
2. Copy each capital target file to `originals/capital/` with a path-safe name (e.g. replace `/` with `__`).
3. Never overwrite an existing originals tree for the same run — if re-snapshot is needed, use a new run id.

Winning installs must remain reversible from `originals/`.

## Sealed held-out

- Builders, benchmark iterators, and the lead agent's skill-editing context must **not** read `skills/<name>/benchmark/held-out/` until the final sealed evaluation step.
- After final eval, held-out summaries may appear on the dashboard; raw tasks may stay in the run dir for audit but must not be folded into skill text.

## Resume protocol

On skill start:

1. List `~/.config/dotagents/optimize-workspace/*/state.json`.
2. If any have `status` not in `complete`, present them (id, status, selected counts, mtime).
3. One focused ask: **resume** `<id>` (Recommended when one incomplete run exists) vs **new run**.
4. Resume → load state, refresh dashboard, continue from the recorded phase; do not re-invent inventory unless `status` is still `inventory`.
5. New run → allocate a new `<run-id>`; leave prior runs untouched.

If resume is impossible (corrupt state, missing originals for an in-flight skill edit), say so, mark blocked, and offer a new run rather than guessing.
