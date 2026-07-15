---
name: janitor
description: Use when the user says `/janitor`, or wants to drain the open **issues and PRs** you or Dependabot created across all `~/code` repos. One idempotent pass — scan every child repo, keep only self- and Dependabot-authored items (never third-party), and for each either **merge the PR** or **implement the issue**. PRs: get them green (update-branch / rebase, conflict + lockfile resolution, flaky retry) and — for dependency bumps — read the changelog and adapt the repo to breaking changes before merging (majors get the full migration-guide upgrade), and for your own PRs fix the failing checks from the PR's stated intent and merge when green. Issues: implement the requested change in a worktree, `/ship` it (review fleet + CI) as a PR closing the issue, and merge when green + review-clean. Escalate only what it can't safely adapt or implement. A bare `/janitor` arms its own 5-minute loop (`/janitor once` for a single pass) and stops that loop itself once the backlog is drained. NOT for reviewing, implementing, or merging third-party / fork contributions.
---

# Janitor

A background maintainer for authorized open issues and PRs across every git repo under `~/code`.
One invocation is one idempotent pass: **PR → make correct, green, and merge; issue → implement,
`/ship`, and merge when green + review-clean.** GitHub labels, comments, linked PRs, and checks are
the durable state between passes. This skill is narrow standing authorization bounded by the author,
green, review-fleet, and HOLD gates.

## Invocation modes

- **Bare `/janitor`:** if already inside an active `/loop` iteration, run one pass and exit. Otherwise
  invoke the `loop` skill with `5m /janitor`; let its first iteration run the first pass and do not
  also run one inline.
- **`/janitor once`:** run one pass without arming a loop.
- **Drain termination:** stop the loop when zero actionable authorized items remain, including when
  every remaining item is HELD for a human. Keep looping while any item can advance next pass.
- Read `references/reporting-and-loop.md` for exact loop, launchd, drain, and reporting decisions.

## Required progressive loading

1. Before any mutation, read `references/invariants-and-holds.md`.
2. For every authorized PR, read `references/pr-drain.md`.
3. For every Dependabot PR, also read `references/dependabot-upgrades.md`.
4. For every authorized issue, read `references/issue-triage.md`.
5. Before concurrency decisions or ending the pass, read `references/reporting-and-loop.md`.
6. Read `references/gotchas.md` only when a pass hits a recurring GitHub-state, mergeability,
   lockfile, or lifecycle failure that the route playbook does not resolve.

Do not preload route-specific playbooks for item types the pass did not find.

## One-pass orchestration

1. Resolve `SELF` with `gh api user --jq .login`.
2. Scan only primary checkouts (`~/code/*/` whose `.git` is a directory). Resolve each canonical
   slug from that repo's own remote and deduplicate by slug; never construct an owner from a path.
3. Enumerate open PRs and issues per slug. Immediately exclude drafts and every author other than
   `SELF` or Dependabot. Third-party and fork items are read-only.
4. Route PRs through `references/pr-drain.md`:
   - Dependabot bumps also load `references/dependabot-upgrades.md`; every major must be researched,
     adapted, validated, labeled `janitor-prepped`, and only then armed or merged.
   - Self PRs recover intent from title, body, linked issue, and diff; fix genuine failures from that
     context, push only to the PR head, and merge only when required checks are green.
5. Route issues through `references/issue-triage.md`: check for linked/in-flight work, triage,
   claim with `janitor-implementing`, implement in a worktree, run the repo gate, and invoke `/ship`
   with `Closes #<n>`. A `/ship` stop is a HOLD, never a bypass invitation.
6. Parallelize independent deep work in separate worktrees; never overlap whole janitor passes.
7. Emit the terse pass report and make the loop stop/continue decision. Do not watch deploys.

## Hard stops

- Never mutate, approve, implement, close, or merge a third-party item.
- Never merge with red or pending required checks; never weaken, skip, or bypass a gate.
- Never merge or arm an unprepped Dependabot major.
- Never author issue work outside `/ship`, and never merge it without clean review + green CI.
- Never push to `main`, force-push, use `--admin`/`--no-verify`, or edit in a primary checkout.
- Never touch a draft or WIP/DO-NOT-MERGE self PR.
- When correctness needs judgment or cannot be validated, follow the universal `JANITOR HOLD:`
  contract and disarm auto-merge. Later passes may maintain held PRs but never land them.

## Reference index

- `references/invariants-and-holds.md` — PR/issue policy envelopes, hard invariants, universal HOLD.
- `references/pr-drain.md` — discovery, classification, self PRs, merge states/mechanics, deploy stance.
- `references/dependabot-upgrades.md` — changelog review, majors, migration tools, prep persistence.
- `references/issue-triage.md` — idempotency, claim, worktree implementation, `/ship`, escalation.
- `references/reporting-and-loop.md` — bounding, output contract, loop arming/termination, wiring.
- `references/gotchas.md` — recurring fleet, GitHub-state, mergeability, and lifecycle failures.
