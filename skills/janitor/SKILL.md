---
name: janitor
description: >-
  Use when the user says `/janitor` or `/janitor once`, or wants an unattended
  drain of self-/Dependabot-authored issues and PRs across `~/code` plus stale
  local worktree/branch cleanup. Bare `/janitor` self-arms a recurring loop
  until the backlog drains; `once` is a single pass. NOT for third-party/fork
  contributions, post-merge production deploys, or substituting `/ship`'s
  review/publish flow.
---

# Janitor

Unattended maintainer for authorized open issues/PRs across every git repo under
`~/code`, plus local worktree/branch hygiene in those checkouts. One invocation
is one idempotent pass: **PR → correct + green + merge; issue → implement +
`/ship` + merge when green + review-clean; local → remove stale linked
worktrees/branches.** Durable cross-pass state lives on GitHub (labels,
`JANITOR HOLD:` comments, linked PRs, checks); local cleanup re-derives each
pass. Narrow standing authorization: author gate, green gate, review-fleet,
HOLD, and local keep-guards.

## Invocation modes

- **Bare `/janitor`:** if already inside an active `/loop` iteration, run one
  pass and exit. Otherwise invoke the `loop` skill with `5m /janitor`; let its
  first iteration run the first pass (do not also run one inline).
- **`/janitor once`:** one pass, arm nothing.
- **Drain termination:** stop the loop when zero actionable authorized items
  remain (including when every leftover is HELD). Keep looping while any item
  can advance next pass — including a merge completed this pass (needs a
  reconciliation tick). Local cleanup / leftover inventory alone never keeps
  the loop alive.
- **Schedule footer + Local outstanding:** every pass report includes leftover
  linked worktrees and non-default local branches (or `none`), plus last/next
  local times, cadence, and bound — see `references/reporting-and-loop.md`.

## Required progressive loading

1. Before any mutation, read `references/invariants-and-holds.md`.
2. For every authorized PR, read `references/pr-drain.md`.
3. For every Dependabot PR, also read `references/dependabot-upgrades.md`.
4. For every authorized issue, read `references/issue-triage.md`.
5. Once per pass (after the GitHub arms, or immediately when they found
   nothing), read `references/local-cleanup.md`.
6. Before concurrency decisions or ending the pass, read
   `references/reporting-and-loop.md`.
7. Read `references/gotchas.md` only when a route playbook does not resolve a
   recurring GitHub-state, mergeability, lockfile, local-cleanup, or lifecycle
   failure.

Do not preload route playbooks for item types the pass did not find. Always
load `local-cleanup.md` once — it runs even on an empty GitHub backlog.

## One-pass orchestration

1. Resolve `SELF` with `gh api user --jq .login`.
2. Scan only primary checkouts (`~/code/*/` whose `.git` is a directory).
   Resolve each canonical slug from that repo's own remote; deduplicate by
   slug; never construct an owner from a path.
3. Enumerate open PRs and issues per slug. Immediately exclude drafts and every
   author other than `SELF` or Dependabot. Third-party and fork items are
   read-only.
4. Route PRs through `references/pr-drain.md`:
   - Dependabot bumps also load `references/dependabot-upgrades.md`; every
     major must be researched, adapted, validated, labeled `janitor-prepped`,
     and only then armed or merged.
   - Self PRs recover intent from title, body, linked issue, and diff; fix
     genuine failures from that context; push only to the PR head; merge only
     when required checks are green.
5. Route issues through `references/issue-triage.md`: check for linked/in-flight
   work, triage, **claim `janitor-implementing` before any code** (including the
   first slice of a decomposable issue), implement in a worktree, run the repo
   gate, invoke `/ship` with `Closes #<n>`. A `/ship` stop is a HOLD — never a
   bypass invitation (ship owns CI babysit / merge on that path; cite
   `skills/ship/references/integrate.md`).
6. Parallelize independent deep work in separate worktrees; never overlap whole
   janitor passes.
7. After the GitHub arms settle, run local hygiene through
   `references/local-cleanup.md` on the same primary set. Finish with the
   required outstanding inventory.
8. Emit the pass report (action rows, **fully enumerated Local outstanding**
   with per-item keep-guard reasons — never a summary placeholder — then
   schedule footer) and make the loop stop/continue decision. Post-merge
   **production deploys** are out of scope (fleet alerting owns those); green
   required PR checks before merge still apply.

## Hard stops (janitor-unique)

- Never mutate, approve, implement, close, or merge a third-party / fork item.
- Never merge with red or pending required checks; never weaken or silence a
  gate to fake green.
- Never merge or arm an unprepped Dependabot major.
- Never author issue work outside `/ship`, and never merge it without clean
  review + green CI.
- Never push to `main`, force-push shared branches, or edit in a primary
  checkout. Gate-integrity / `--no-verify` / force-merge hard-stops: cite
  `skills/ship/references/fleet-guards.md` (do not restate).
- Never touch a draft or WIP/DO-NOT-MERGE self PR.
- Never `git worktree remove --force`, delete a dirty worktree, delete a
  branch with an open PR, delete the default/protected branch, remove a
  primary checkout, or delete a **remote** branch as part of local cleanup.
- When correctness needs judgment or cannot be validated, follow the universal
  `JANITOR HOLD:` contract and disarm auto-merge. Later passes may maintain
  held PRs but never land them.

## Reference index

- `references/invariants-and-holds.md` — envelopes, hard invariants, universal HOLD.
- `references/pr-drain.md` — classification, self PRs, mergeStateStatus (incl.
  phantom-DIRTY `merge-tree` refresh), Dependabot/self merge mechanics.
- `references/dependabot-upgrades.md` — exact-range evidence, majors, stacked
  bumps, prep persistence.
- `references/issue-triage.md` — idempotency, claim, worktree implementation,
  `/ship`, escalation.
- `references/local-cleanup.md` — stale signals + keep-guards; outstanding inventory.
- `references/reporting-and-loop.md` — bounding, report contract, loop arm/stop.
- `references/gotchas.md` — recurring fleet / mergeability / lifecycle failures.
