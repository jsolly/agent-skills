# Persistence and resume

Run state is machine-local and uncommitted:

```text
~/.config/dotagents/optimize-workspace/<UTC-run-id>/
├── dashboard.html
├── state.json
├── originals/
│   ├── skills/<name>/...
│   └── capital/<path-safe-name>
├── skills/<name>/
│   ├── contract.md
│   ├── contract-audit.md
│   ├── benchmark/{iteration,held-out}/
│   ├── candidates/vN/
│   ├── trials/
│   └── verdicts/
└── capital/{candidates.md,apply-log.md}
```

Use UTC `YYYYMMDDTHHMMSSZ`. Never overwrite an existing run’s originals.

## Durable state

Persist at each meaningful transition:

- run id and status: inventory, awaiting selection, running, final eval,
  complete, or blocked;
- selected skills/capital and paths to dashboard/originals;
- per skill: phase, frozen contract/benchmark, candidate, verdict/retire,
  harness-reported model IDs, trials, and last error;
- per capital id: pending, applied, blocked, or skipped.

Regenerate the dashboard from state rather than treating HTML as truth.

## Originals

Before mutation, copy the full selected skill tree and every selected capital
target. Existing originals are immutable; allocate a new run if a fresh
snapshot is necessary. An installed result must remain reversible from them.

## Sealed benchmark

Keep each skill’s `benchmark/held-out/` invisible to builders and iteration
contexts until final evaluation. After use, summaries may appear on the
dashboard; raw packets remain audit evidence and never become skill content.

## Resume

1. List run states whose status is not complete.
2. Present id, status, selected counts, and modification time.
3. Ask once: resume the relevant run or create a new one.
4. Resume from persisted phase/selection and refresh the dashboard.
5. If state is corrupt or an in-flight target lacks originals, mark blocked and
   offer a new run; do not reconstruct decisions or snapshots by guesswork.
