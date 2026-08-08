# Close — terminals, summary, worktree

One closing message. Lead with outcome language that cannot be confused with a pre-push review verdict. Never end a successful run with “Ready to push.”

## Lead lines

| Lead | Meaning |
| --- | --- |
| **`PR merged to main`** | PR path; CI green; merged; deploy/verify OK or explicit n/a |
| **`Shipped to main`** | Direct-push / break-glass only |
| **`Merged/Pushed — deploy/verify failed`** | On `main`, runtime/deploy/live proof failed |
| **`Not merged`** | PR CI cap / merge blocked |
| **`Not pushed`** / **`Stopped — not pushed`** | Local gate cap, stop-and-ask, or unresolved verified blockers |
| **`PR open — auto-merge pending CI`** | In-progress only while still babysitting — **not** a successful close |

## Required summary fields (clean ship)

- Ship profile
- Review tier / depth used (`light` / `full` / `skipped`)
- Integration model
- CI owner
- Deploy/verify line (including live check when applicable, or explicit n/a)
- CI line
- Review disposition: `Review: <N> accepted/fixed, <M> rejected (<reason>)` (or clean / allowlist-skipped)
- Worktree line (below)

No punch-lists, deferred TODOs, or “you might also want…” on success.

## Worktree cleanup

Applies only when this ship ran from a **linked worktree** (path ≠ primary checkout — primary has a `.git` **directory**). Primary-checkout ships: `Worktree: n/a (primary checkout)`.

**When:** after merge lands (`pr-auto-merge`) or after push lands (`direct-push`).

**Preconditions (all):** integration succeeded; shipped SHA is ancestor of `origin/main`; worktree clean; no session stashes holding unpushed work.

**Default:** remove **only** this ship’s worktree (harness `/delete-worktree` or `git worktree remove` when clean — never `--force` unless user asks). Never sweep other sessions’ trees.

**Defer** when hard-stopped, dirty, SHA not on `origin/main` yet, deploy/verify failed with forward-fix continuing here, or user asked to keep — say `Worktree: kept (<reason>)`.
