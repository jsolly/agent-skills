# Issue Triage and Implementation

Read this file for every authorized open issue. The issue arm builds new work; it is distinct from
finishing an already-open self-authored PR.

An authorized open issue is a request to *build something*, then land it. This arm turns the issue
into a merged PR — but only when it can do so safely; the escapes are as important as the builds.

## Idempotency first — never double-implement

A pass may run while a prior pass's implementation is still in flight. Before touching an issue,
check whether it's already being handled:

- **A PR already links/closes it** (`gh pr list -R "$SLUG" --search "<issue-url> in:body"`, or a
  `Closes #<n>` in an open PR body) → the issue is in the PR arm now; route the *PR* through
  `pr-drain.md` and leave the issue alone.
- **The issue carries a `janitor-implementing` label** but no linked PR → a prior pass **claimed** it
  and is either still building it in another worktree or died mid-build. Read its `JANITOR HOLD:`
  comment if present (report HELD). Otherwise treat it as **in flight — skip it this pass** rather
  than starting a second worktree for the same issue (a fresh pass has no pointer to the prior
  worktree, so there's nothing to "resume"; the next pass either finds the PR it eventually opened,
  or — if the prior attempt truly died leaving no PR — re-implements fresh). This label is what
  prevents two passes from both authoring the same issue.
- **Neither** → it's fresh; triage it (next).

## Triage — implement, or HOLD-before-code

Only implement an issue that is **clear, self-contained, and buildable from its text alone**. HOLD
(comment the specific open question on the issue, apply no code) when the issue is ambiguous, needs
a product/design decision, depends on work not yet done, or is too large to land as *one* reviewable
PR. Guessing at intent and merging it is exactly what invariant 10 forbids — a precise "what did you
mean by X?" comment is the thoughtful outcome, not a failure. A large-but-clear issue that decomposes
into independent PRs: implement the first self-contained slice, comment the decomposition on the
issue, leave it open.

## Claim before authoring

Apply the `janitor-implementing` label *first*:

```bash
gh label create janitor-implementing -R "$SLUG" --force
gh issue edit <n> -R "$SLUG" --add-label janitor-implementing
```

The claim covers the whole author → build → ship window. Labeling only after `/ship` (once a PR
already exists) leaves the exact window where two passes could each start a worktree for the issue.

## Implement → ship → merge

For an issue that has passed triage and been claimed:

1. **Author in a worktree off `main`** (never the primary checkout —
   `rules/worktree-authoring.md`). One issue per worktree/branch. Parallelize across subagents when
   several issues are actionable (see `reporting-and-loop.md` → Bounding), each in its own worktree.
2. **Build the change the issue specifies**, scoped to it (invariant 10). Match the repo's
   conventions — read its `AGENTS.md`, the neighbouring code, the shared utilities — before adding
   anything. For a bug report, reproduce first, then fix + add the regression test.
3. **Run the repo's own gate** in the worktree (`npm run check:ts`, lint, affected tests — read the
   repo's `AGENTS.md`/`package.json`) before trusting CI. Don't ship what you haven't run.
4. **`/ship` it.** Invoke the `ship` skill from the worktree — it runs the review-agent fleet,
   **fixes verified findings or stops without pushing** (never opens a PR carrying an unaddressed
   high-confidence finding), runs the gate, and opens the PR. Put **`Closes #<n>`** in the PR body
   so the merge closes the issue. (The issue is already labelled `janitor-implementing` from the
   claim step.) `/ship` is fire-and-forget for CI, so the PR now lives in the **PR arm** — a later
   pass (or the rest of this one) merges it via the mergeStateStatus playbook once green.
5. **The merge gate is the review fleet + green, together** (invariant 9). Because `/ship`
   fixes-or-stops, the HOLD trigger is **`/ship` stopping without a PR** (a finding it couldn't safely
   fix within its fix-loop): leave no dangling branch, comment the blocking finding on the issue,
   report `IMPLEMENTED (held)`. When `/ship` *does* open the PR, merge it once CI is green — that PR,
   by construction, carries no unaddressed high-confidence finding. Never route around a `/ship`
   stop to "finish" the issue.

## Escalation contract

Whenever you stop short — ambiguous issue, review finding, un-greenable CI, a judgment call — follow
`invariants-and-holds.md`'s universal HOLD contract. The `JANITOR HOLD:` comment makes later passes
report HELD instead of retrying blindly.
