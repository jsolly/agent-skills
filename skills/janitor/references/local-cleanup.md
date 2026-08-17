# Local Worktree and Branch Cleanup

Read this file once per pass, after the GitHub PR/issue arms finish (or immediately when those
arms found nothing). This arm is **local hygiene only** — it never opens, merges, or closes
GitHub items, and it never keeps the loop alive by itself.

**Idle-machine assumption.** `/janitor` runs only when no other agents are working. Uncommitted
files, leftover topic branches, and extra worktrees are abandoned unless they back an **open
PR** (the HELD Dependabot TS7 worktree case, plus any other still-open head). Unique commits
with no open PR are **deleted, not merged** — janitor never pushes leftover work to `main`
(that would be `/ship`). "Restore" means put the primary checkout back on a clean, fast-forwarded
`$DEFAULT`. Leftover loopback fleet-cwd dev servers are always abandoned — a leftover
`npm run dev` is not a keep-guard, even on an open-PR tree.

Goal: leftover loopback fleet-cwd dev servers are gone, and for every primary checkout under
`~/code`, extra worktrees/local branches are gone except the keep-guards below, and each
primary is on a clean `$DEFAULT` unless that primary *is* the checkout for an open PR.

## Scope

- **Scan primary checkouts only** (`~/code/*/` whose `.git` is a directory), same fleet discovery
  as `SKILL.md`. Resolve `$SLUG` from each repo's own remote; never invent an owner from a path.
- Discover linked worktrees via `git worktree list` from that primary. That covers harness paths
  (`~/.cursor/worktrees/…`), fleet shared paths (`~/code/.worktrees/…`), and per-repo
  `.worktrees/` — do not walk those directories as a second discovery pass.
- Act on **local** worktrees and **local** branches only. Never `git push --delete`, never delete
  a remote branch, never touch another machine's state.
- Stop leftover **loopback** listeners only via `scripts/stop-stale-dev-servers.mts` (once per
  pass, before the per-repo loop). Do not `pkill`, do not kill by port, do not scan per repo.

## Stop stale dev servers

Run **once per pass**, before the per-repo loop — a listener whose cwd is a leftover worktree
can make `git worktree remove` refuse. Do not re-run per primary.

```bash
node <path-to-this-skill>/scripts/stop-stale-dev-servers.mts
```

The script is the scanner and the kill. It SIGTERM then SIGKILL any TCP listener that is
**all** of: loopback-reachable (`127.0.0.1` / `::1` / `0.0.0.0` / `*` / `[::]`), cwd under
`~/code` or `~/.cursor/worktrees`, and command matching the allowlist (`vite` / `next` /
`astro` / `wrangler … dev` / `sam local` / `npm|pnpm|yarn|bun run dev`, including
`node_modules` binaries). It never kills databases, container engines, Cursor, sshd, generic
`node server.js`, or anything whose cwd is outside those roots. `lsof` missing is an `ERROR`
row for the arm, not a reason to invent `pkill -f`.

Map stdout NDJSON `STOPPED` → report `STOPPED` (pid, address, cwd, short command). Map
`ERROR` → `ERROR` and continue the rest of local cleanup. Empty stdout means nothing matched.
`--dry-run` / `--fixture` are test-only — do not pass them in a pass.

This arm does **not** affect drain math and does **not** belong in Local outstanding
(servers are not keep-guarded leftovers). Keep-guards spare worktrees and branches, not
listeners — an open-PR tree's leftover `vite` still stops.

## Keep-guards

These are the only locals that survive a pass. Dirty / no-upstream / unique-commits-off-default
are not on this list.

1. **Primary checkout directory** — the worktree whose `.git` is a directory. Never
   `git worktree remove` it. Restoring it onto `$DEFAULT` (algorithm step 3) is required, not a skip.
2. **Protected branch names** — `main`, `master`, or the repo's default branch
   (`gh repo view "$SLUG" --json defaultBranchRef -q .defaultBranchRef.name`). Never delete the
   ref. An extra linked worktree that happens to be on `$DEFAULT` is still removable.
3. **Open PR** — any open PR whose head ref is this branch:
   `gh pr list -R "$SLUG" --head "$BRANCH" --state open --json number -q 'length'`.
   Keep the worktree **and** the local branch, including uncommitted dirt — this is the in-flight
   / HELD set (Dependabot majors waiting on upstream, PREPPED CI, issue PRs). Do **not**
   `reset --hard` or `clean` these trees.
4. **Locked / in-use worktree** — `git worktree remove` refuses without `--force` (active IDE lock,
   etc.). Report `KEPT` with the reason; do not escalate to `--force`.
5. **Ambiguous head** — detached HEAD, or a worktree whose branch cannot be resolved. Leave it.

## Discard leftover dirt

Allowed **only** on leftover linked worktrees and on a primary being restored off a leftover
branch (no open PR). Never on an open-PR worktree, never as a push to `main`, never with `-x`
(do not delete gitignored files such as `.env` / `node_modules`):

```bash
git -C "$DIR" reset --hard HEAD
git -C "$DIR" clean -fd
```

This is the one janitor exception to ship's `reset --hard` ban — scoped to abandoned local trees,
not shared/PR branches. If `clean`/`reset` fails, report `ERROR` and skip that tree; do not
`worktree remove --force`.

## Per-repo algorithm

From each primary checkout:

1. `git fetch --prune` (network OK).
2. Record `DEFAULT` (default branch) and list linked worktrees:
   `git worktree list --porcelain`.
3. **Restore the primary onto `$DEFAULT`.** Let `$CUR` be
   `git -C "$PRIMARY" branch --show-current`.
   - If `$CUR` is empty (detached) → keep-guard 5, skip restore.
   - If `$CUR` has an **open PR** → leave the primary on that branch (including dirt). Report
     `KEPT` (`open PR #<n>`).
   - Otherwise:
     1. Discard leftover dirt in the primary (recipe above).
     2. If `$CUR` ≠ `$DEFAULT`, `git -C "$PRIMARY" switch "$DEFAULT"`. If switch fails because
        another worktree already has `$DEFAULT`, report `ERROR` and skip the rest of this
        primary's restore — do not `--force`.
     3. `git -C "$PRIMARY" merge --ff-only "origin/$DEFAULT"`.
     4. If `$CUR` was a leftover topic branch, delete it (Branch delete below).
     5. Report `RESTORED` (include discarded dirt / deleted branch when that happened).
4. **Linked worktrees.** For each non-primary worktree path `$WT`:
   - Resolve `$BRANCH` (`git -C "$WT" branch --show-current`); apply keep-guards.
   - If keep-guard 3/4/5 fired: report `KEPT` (open PR / locked / detached). Silent skip for a
     worktree that is literally the primary (already handled).
   - Otherwise: discard leftover dirt, then remove **without** `--force`:
     `git worktree remove "$WT"`
     (from the primary). Then delete the local branch (Branch delete below). Report `CLEANED`
     (include the stale signal — e.g. `no open PR`, `already on main`, `PR #N merged`,
     `upstream gone`, `unique commits abandoned`).
5. **Orphan local branches.** For each local branch not checked out in any worktree
   (`git branch --format='%(refname:short)'` minus worktree checkouts and `$DEFAULT` / `main` /
   `master`):
   - If keep-guard 2 or 3 fires, skip.
   - Otherwise: Branch delete. Report `PRUNED` (include why — e.g. `no open PR`, `already on
     main`, `unique commits abandoned`).
6. `git worktree prune` — drop stale admin records for paths already removed out-of-band.
7. If a fleet parent dir is now empty (`~/code/.worktrees/<repo>/`, or a harness parent that this
   repo exclusively owned and is empty), `rmdir` the empty directory only — never `rm -rf` a tree
   that still has entries.
8. **Inventory outstanding locals (required every pass).** After the mutations above, **enumerate
   every** leftover linked worktree and non-default local branch across the same primary-checkout
   set — not only the ones this pass touched, and never as a prose summary. A successful idle pass
   should only list open-PR (and rare locked/detached) survivors. Emit via the report contract in
   `reporting-and-loop.md` → Local outstanding. Classification rules:

   - **Worktree rows (`WT`):** every non-primary entry still in `git worktree list` after cleanup.
     Include path, checked-out branch (or `detached`), and one short reason.
   - **Branch rows (`BRANCH`):** every local branch that is not `$DEFAULT` / `main` / `master`,
     **except** branches already covered by a `WT` row's checked-out branch (no duplicate). If the
     **primary** is still on a non-default branch, include that as a `BRANCH` row with reason
     `open PR #<n>` or `primary checkout` (switch refused / detached).
   - **Reason (pick the first that matches):** `open PR #<n>` · `locked` · `detached` ·
     `primary checkout` (restore refused). Do **not** leave `dirty` / `no upstream` /
     `upstream gone` as keep reasons — those are supposed to have been discarded or pruned. If a
     remove refused, append `(tip on $DEFAULT)` when already-integrated.
   - Empty fleet ⇒ report `Local outstanding: none` (still required — do not omit the section).

### Branch delete

After the worktree is gone (or when the branch had no worktree), and keep-guards 2 and 3 did not
fire:

```bash
git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH"
```

Prefer `-d`. Use `-D` when `-d` refuses because the branch still has unique commits — under the
idle-machine assumption those commits are abandoned (no open PR). Never `-D` a branch that failed
a keep-guard. Never delete `$DEFAULT` / `main` / `master`.

## Ordering vs GitHub arms

- Run **after** PR drain + issue triage in the same pass so a branch still needed for an in-flight
  authorized item (open PR) is not removed out from under that work.
- Local cleanup failures (a single locked worktree, a refused switch, a kill `ERROR`) are
  **not** HOLDs and do not fail the pass — report `KEPT` / `ERROR` for that row and continue
  the rest of the fleet.
- This arm does **not** affect loop drain: a pass with zero actionable authorized GitHub items is
  still drained even if local cleanup removed something, stopped a server, or found nothing.

## Don't

- Don't scan linked-worktree paths as additional repos (duplicates the GitHub arm and races cleanup).
- Don't `git worktree remove --force` or `git clean -fdx`.
- Don't `reset --hard` / `clean` a worktree or primary whose branch has an open PR.
- Don't delete remotes or close/reopen PRs from this arm.
- Don't merge leftover unique commits onto `main` (no push to `$DEFAULT`).
- Don't clean repos outside `~/code` primary checkouts.
- Don't `pkill -f`, kill by port number, or kill anything the script did not report as
  `STOPPED` / `WOULD_STOP`. Don't stop databases, container engines, Cursor, or sshd.
- Don't run the stopper per repo — once per pass, before worktree remove.
- Don't keep the loop alive because a server was stopped (or because a kill `ERROR`d).
