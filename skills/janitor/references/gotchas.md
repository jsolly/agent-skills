# Gotchas

These are recurring failure modes already encoded in the playbooks. Load this diagnostic index only
when the owning route playbook does not resolve a recurring failure; it is not alternate policy.

## Fleet discovery

- **Never construct `my-org/<directory-name>`.** Resolve each checkout with
  `gh repo view --json nameWithOwner -q .nameWithOwner`, then deduplicate by that canonical slug.
  `example-app` is owned by `example-project`; GitHub transfer redirects can hide a bad assumption
  until another command stops following it.
- **Scan primary checkouts only.** A primary checkout has a `.git` directory. Linked worktrees have
  a `.git` file and live under paths such as `~/code/.worktrees/` or `~/.cursor/worktrees/`;
  scanning both duplicates GitHub items. Local cleanup discovers those linked trees via
  `git worktree list` from the primary — do not walk `.worktrees/` directories as extra repos.
- **`gh issue list --json` already excludes PRs.** Do not build a second overlap filter that risks
  dropping real issues.

## Local cleanup

- **Fetch `--prune` before trusting remote state.** Without a prune fetch, deleted remote heads still
  look live; always refresh before deciding a leftover is gone.
- **Open PR is the keep set.** A worktree/branch whose head has an open PR is in-flight or HELD
  (Dependabot TS7, PREPPED CI, issue PRs) — leave it, including dirt. No open PR ⇒ abandoned under
  the idle-machine assumption: discard dirt, remove the worktree, delete the branch (`-D` if it
  still has unique commits). Do not `/ship` or merge those commits onto `main`.
- **Restore primaries onto `$DEFAULT`.** A leftover primary sitting on `chore/…` with no open PR
  is discarded and switched back to a fast-forwarded default. If `git switch` fails because
  another worktree already has `$DEFAULT`, report `ERROR` — do not `--force`.
- **`git worktree remove` without `--force`, or skip.** Discard dirt first (`reset --hard` +
  `git clean -fd`, never `-fdx`), then remove. A locked refusal is a `KEPT` row, not a reason to
  escalate. Never reset/clean an open-PR tree.
- **Delete the worktree before the branch.** Removing the branch first fails while a worktree still
  has it checked out; reverse order leaves an orphaned directory with a broken `.git` file.
- **Stop leftover listeners with the skill script, before worktree remove.** `lsof` COMMAND is
  truncated; the listener is usually the child (`node …/vite.js`), not `npm run dev`. Do not
  `pkill -f` or kill by port. A kill `ERROR` is a report row, not a reason to escalate. Run
  `scripts/stop-stale-dev-servers.mts` once per pass, not per repo.

## Durable GitHub state

- **Step-2 PR JSON has no comments.** A `janitor-prepped` PR still needs a separate comment fetch to
  detect `JANITOR HOLD:` before any arm, approval, or merge decision.
- **A HOLD comment does not stop GitHub.** It guides later janitor passes, but an already-armed PR can
  still merge. Always disable auto-merge when placing a hold.
- **Prep can succeed before labeling fails.** If an unlabeled Dependabot major's head contains
  non-Dependabot commits, treat it as prior prep, restore `janitor-prepped`, and continue from the
  persisted branch state instead of redoing the migration.
- **Claim issues before authoring.** `janitor-implementing` closes the race between triage and PR
  creation. A later pass cannot resume an unknown worktree; it skips the claim until a linked PR or
  HOLD appears, avoiding duplicate implementation.

## Mergeability and CI

- **DIRTY can be phantom.** GitHub's async mergeability cache may remain stale after burst merges,
  and both update-branch and REST can repeat the same false DIRTY result. Use `git merge-tree` to
  distinguish phantom from real before resolving conflicts.
- **Regenerate lockfiles; never hand-merge them.** Stacked Dependabot PRs naturally churn lockfiles.
  Merge the base in from a worktree, regenerate with the repo's package manager, run its checks, and
  push only to the PR head.
- **Plan-gated `--auto` failure is expected** on private Free repos (same class ship documents in
  `skills/ship/references/integrate.md`). For janitor-owned Dependabot/self PR merges: merge only
  when CLEAN + required checks green; otherwise leave for the next pass.
- **You cannot approve your own PR.** A self-authored PR blocked on required review is a HOLD, even
  when its checks are green. Dependabot PRs may be approved only within the authorized envelope.
- **Known flakes get one rerun, not a policy rewrite.** Docker Hub rate limits, registration-approval
  E2E flakes, and GoTrue 502s are rerunnable. A genuine required-check failure must be fixed from the
  changelog or PR intent.
- **Gate-integrity flags** (`--no-verify`, force-merge, etc.): cite
  `skills/ship/references/fleet-guards.md` — do not invent a second copy here.

## Pass lifecycle

- **Never double-arm the loop.** An active `/loop` iteration runs one pass and exits; only an
  unwrapped bare `/janitor` invokes `5m /janitor`.
- **A long pass is expected.** Parallel deep work instead of imposing a cap. `/loop` is sequential,
  so the next tick waits rather than overlapping.
- **Post-merge deploy is out of scope for this pass.** Production deploys commonly start after
  merge; this pass neither watches nor repairs them (fleet alerting owns those). That is not a ban
  on watching **PR CI** before merge — required checks must still be green.
