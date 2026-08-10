# Local Worktree and Branch Cleanup

Read this file once per pass, after the GitHub PR/issue arms finish (or immediately when those
arms found nothing). This arm is **local hygiene only** — it never opens, merges, or closes
GitHub items, and it never keeps the loop alive by itself.

Goal: for every primary checkout under `~/code`, remove **stale** linked worktrees and local
branches. Stale means the head's remote PR is **merged or closed**, or the branch's remote
tracking ref is **gone** — and none of the keep-guards below apply.

## Scope

- **Scan primary checkouts only** (`~/code/*/` whose `.git` is a directory), same fleet discovery
  as `SKILL.md`. Resolve `$SLUG` from each repo's own remote; never invent an owner from a path.
- Discover linked worktrees via `git worktree list` from that primary. That covers harness paths
  (`~/.cursor/worktrees/…`), fleet shared paths (`~/code/.worktrees/…`), and per-repo
  `.worktrees/` — do not walk those directories as a second discovery pass.
- Act on **local** worktrees and **local** branches only. Never `git push --delete`, never delete
  a remote branch, never touch another machine's state.

## Keep-guards (skip — never delete)

Skip a worktree or local branch when any of these hold:

1. **Primary checkout** — the worktree whose `.git` is a directory. Never remove it.
2. **Protected branch names** — `main`, `master`, or the repo's default branch
   (`gh repo view "$SLUG" --json defaultBranchRef -q .defaultBranchRef.name`).
3. **Dirty worktree** — `git -C "$WT" status --porcelain` is non-empty, or the tree has a
   session stash you did not create this pass. Never `git worktree remove --force`.
4. **Open PR** — any open PR whose head ref is this branch:
   `gh pr list -R "$SLUG" --head "$BRANCH" --state open --json number -q 'length'`.
5. **Locked / in-use worktree** — `git worktree remove` refuses without `--force` (active IDE lock,
   etc.). Report `KEPT` with the reason; do not escalate to `--force`.
6. **Ambiguous head** — detached HEAD, or a worktree whose branch cannot be resolved. Leave it.

## Stale criteria (delete only when one matches, after keep-guards)

A candidate is stale when **either**:

- **PR terminal:** `gh pr list -R "$SLUG" --head "$BRANCH" --state all --json number,state,mergedAt`
  returns at least one PR with `state == "MERGED"` or `state == "CLOSED"`, and **no** open PR for
  that head (already covered by keep-guard 4).
- **Remote tracking gone:** `git branch -vv` marks the local branch's upstream as `[gone]` (run
  `git fetch --prune` on the primary first so gone-ness is current). No upstream configured is
  **not** gone — leave never-pushed / untracked locals alone unless a terminal PR matches above.

Merged-into-`origin/main` alone is **not** sufficient without one of those two signals.

## Per-repo algorithm

From each primary checkout:

1. `git fetch --prune` (network OK; do not modify tracked files in the primary working tree).
2. Record `DEFAULT` (default branch) and list linked worktrees:
   `git worktree list --porcelain`.
3. **Worktrees first.** For each non-primary worktree path `$WT`:
   - Resolve `$BRANCH` (`git -C "$WT" branch --show-current`); apply keep-guards.
   - If stale: remove the worktree **without** `--force`:
     `git worktree remove "$WT"`
     (from the primary). Then delete the local branch (Branch delete below). Report `CLEANED`.
   - If a keep-guard fired: report `KEPT` only when the user would otherwise wonder why a clearly
     abandoned-looking tree survived (dirty, open PR, locked); silent skip for protected/primary.
4. **Orphan local branches.** For each local branch not checked out in any worktree
   (`git branch --format='%(refname:short)'` minus worktree checkouts and `$DEFAULT` / `main` /
   `master`):
   - Apply keep-guards 2 and 4 (and the gone/PR stale criteria).
   - If stale: Branch delete. Report `PRUNED`.
5. `git worktree prune` — drop stale admin records for paths already removed out-of-band.
6. If a fleet parent dir is now empty (`~/code/.worktrees/<repo>/`, or a harness parent that this
   repo exclusively owned and is empty), `rmdir` the empty directory only — never `rm -rf` a tree
   that still has entries.

### Branch delete

After the worktree is gone (or when the branch had no worktree):

```bash
git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH"
```

Prefer `-d`. Use `-D` only when `-d` refuses **and** the stale criteria already matched (PR
merged/closed or upstream `[gone]`). Never `-D` a branch that failed a keep-guard.

## Ordering vs GitHub arms

- Run **after** PR drain + issue triage in the same pass so a branch still needed for an in-flight
  authorized item is not removed out from under that work.
- Local cleanup failures (a single locked worktree, a refused remove) are **not** HOLDs and do not
  fail the pass — report `KEPT` / `ERROR` for that row and continue the rest of the fleet.
- This arm does **not** affect loop drain: a pass with zero actionable authorized GitHub items is
  still drained even if local cleanup removed something (or found nothing).

## Don't

- Don't scan linked-worktree paths as additional repos (duplicates the GitHub arm and races cleanup).
- Don't `git worktree remove --force`, `rm -rf` a dirty tree, or reset another session's room.
- Don't delete remotes or close/reopen PRs from this arm.
- Don't treat "no upstream" as stale.
- Don't clean repos outside `~/code` primary checkouts.
