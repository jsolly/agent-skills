# Gotchas

These are recurring failure modes already encoded in the playbooks. Load this diagnostic index only
when the owning route playbook does not resolve a recurring failure; it is not alternate policy.

## Fleet discovery

- **Never construct `my-org/<directory-name>`.** Resolve each checkout with
  `gh repo view --json nameWithOwner -q .nameWithOwner`, then deduplicate by that canonical slug.
  `slow-ci-app` is owned by `other-org`; GitHub transfer redirects can hide a bad assumption
  until another command stops following it.
- **Scan primary checkouts only.** A primary checkout has a `.git` directory. Linked worktrees have
  a `.git` file and live under paths such as `~/code/.worktrees/`; scanning both duplicates items.
- **`gh issue list --json` already excludes PRs.** Do not build a second overlap filter that risks
  dropping real issues.

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
- **Plan-gated private repos cannot arm auto-merge.** A failed `--auto` is expected there. Merge only
  when CLEAN and required checks are green; otherwise leave it for the next pass.
- **You cannot approve your own PR.** A self-authored PR blocked on required review is a HOLD, even
  when its checks are green. Dependabot PRs may be approved only within the authorized envelope.
- **Known flakes get one rerun, not a policy rewrite.** Docker Hub rate limits, registration-approval
  E2E flakes, and GoTrue 502s are rerunnable. A genuine required-check failure must be fixed from the
  changelog or PR intent.

## Pass lifecycle

- **Never double-arm the loop.** An active `/loop` iteration runs one pass and exits; only an
  unwrapped bare `/janitor` invokes `5m /janitor`.
- **A long pass is expected.** Parallel deep work instead of imposing a cap. `/loop` is sequential,
  so the next tick waits rather than overlapping.
- **Merge is fire-and-forget for deploy.** Production deploys commonly start after merge, but this
  pass neither watches nor repairs them. Fleet alerting owns post-merge failures.
