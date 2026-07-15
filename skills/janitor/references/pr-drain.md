# PR Drain Playbook

Read this file for every authorized, non-draft PR. Read `dependabot-upgrades.md` as well for
dependency PRs, and read `invariants-and-holds.md` before any mutation.

## Authorized PR algorithm

Fleet discovery, identity resolution, slug deduplication, and author filtering run once in
`SKILL.md` before this item-level playbook loads. Given one authorized, non-draft PR:

1. **Classify — and route Dependabot majors to upgrade prep.** Parse the bump from the title
   (`from <A> to <B>`; integer before the first `.` increases ⇒ major). Read ecosystem from labels
   (`github_actions` vs `javascript`/`python`) and runtime-vs-dev from the title prefix (`deps-dev`
   ⇒ dev). **A Dependabot major merges only through Major upgrades (invariant 8); where it is in
   that pipeline is tracked by the `janitor-prepped` label** (labels come from the discovery JSON):
   - **no label** → first check whether the PR head already carries non-Dependabot (janitor)
     commits — if so a prior pass prepped but failed to label: (re)apply the label and fall through
     to the branches below. Otherwise run `dependabot-upgrades.md` → Major upgrades (research, adapt,
     push, label, arm) — parallelize across subagents when several majors are pending (see
     `reporting-and-loop.md` → Bounding);
   - **label present** → first check for a `JANITOR HOLD:` comment (discovery JSON has no comments —
     fetch them: `gh pr view <n> -R "$SLUG" --comments`, or the issue-comments API). If present,
     report HELD with that comment's open question; maintenance only, never merge/arm. Otherwise:
     - **BEHIND/DIRTY/red** → maintenance only (mergeStateStatus playbook), keeping the prep green;
     - **checks green** → **merge** (Merge mechanics);
     - **checks pending** → arm auto-merge if not armed (plan-gated repos: leave it; the next pass
       merges when green), report `PREPPED (CI pending)`, move on.
   For everything else classification only sets **how hard to look at the changelog** (a dev-tool
   patch needs a glance; a runtime bump needs a real read) and selects the envelope row.

2. **Bring each survivor into compliance, then act on `mergeStateStatus`.** If the bump has any
   breaking/behavior risk, run `dependabot-upgrades.md` first — adapt the repo, push to the PR
   branch, let CI re-run — then merge/arm once green, or park with a reason.

3. **Your own PRs — fix from context, then merge (full autonomy).** A `$SELF`-authored PR is yours
   to bring green and land unattended. **The PR is your spec:** its title, description, linked issue,
   and the diff itself state what the change is *supposed* to do — read them before touching a line.
   Then fix whatever the required checks flag (failing tests, lint, types, build) exactly as you'd
   adapt a Dependabot bump: edit the real code/tests to make them genuinely correct (invariants 3+4 —
   never mask a failure, never weaken the gate), push to the PR head branch, let CI re-run, and merge
   once green (Merge mechanics). Work in a worktree on the PR branch, never the primary checkout.
   **WIP guard:** skip a PR whose title says it isn't ready (`wip`/`draft`/`DO NOT MERGE`) or that
   carries a `JANITOR HOLD:` comment — those stay untouched. **HOLD escape (the one thing that still
   waits for a human):** if the PR doesn't give you enough to fix a failure *confidently*, or the
   correct fix is a behavior/semantics call only the human should make, stop at a partial fix and
   HOLD with the specific open question — never push a blind guess to land your own branch. Authoring
   new work still starts in `/ship`; this step is the janitor *finishing* an already-open self PR
   (distinct from the issue arm, which *builds* new work from an issue through `/ship`).

4. **Report** using `reporting-and-loop.md` and exit. Do **not** watch deploys.

## mergeStateStatus playbook

**Holds first:** a PR carrying a `JANITOR HOLD:` comment (a partial major adaptation awaiting a
human call) gets *maintenance* outcomes only — update-branch, phantom-DIRTY refresh, conflict
resolution, flake re-run — never merge/arm/approve, until a human resolves the question. And a
Dependabot major without the `janitor-prepped` label is never merged, armed, or approved from
**any** state below — it routes through `dependabot-upgrades.md` first.

- **CLEAN** — mergeable, checks green → **merge** (see Merge mechanics).
- **BEHIND** — head is behind base → update the branch, then let the next state re-evaluate:
  `gh pr update-branch <n> -R "$SLUG"` (rebase/merge base in). If that can't (conflict), treat
  as DIRTY.
- **UNSTABLE** — mergeable but a non-required check is failing/pending → if the failing check is a
  known flake (Docker Hub pull rate-limit at the Reset-database/Start-Supabase steps, the
  registration-approval E2E, a GoTrue 502 in db:doctor), re-run it: `gh run rerun --failed <run-id>`.
  If it's a required check that genuinely fails, it's red → red-check handling.
- **BLOCKED** — a branch-protection requirement isn't met. Inspect
  `gh pr checks <n> -R "$SLUG"`:
  - checks still **pending** → arm auto-merge (below) and move on; the next pass confirms. (Never
    for an unlabeled major or a held PR — see the preamble above.)
  - required **review** missing on a **Dependabot** PR that's green → you may approve it
    (`gh pr review <n> -R "$SLUG" --approve`, it's an authorized bot bump that passed CI), then
    merge (majors: only once prepped/labeled — approval is arming where `auto-merge.yml` runs).
    You **cannot** approve your **own** PR — a self PR needing review stays HOLD.
  - checks **failing** → red-check handling.
- **DIRTY** — merge conflict. Burst merges can wedge GitHub's async mergeability cache stale-DIRTY
  even when the merge is actually clean (`update-branch` and a REST re-fetch both read the same bad
  cache); distinguish phantom from real:

  ```bash
  git merge-tree --write-tree origin/main refs/pull/<n>/head   # exit 0 ⇒ phantom (GitHub is stale)
  ```

  - **Phantom** (exit 0): push a client-side `commit-tree` merge to the PR head branch to force a
    fresh mergeability compute (no checkout — a dirty primary tree is untouched; triggers CI, not a
    gate bypass):

    ```bash
    git fetch origin main
    git fetch origin "refs/pull/<n>/head:refs/tmp/pr<n>"
    tree=$(git merge-tree --write-tree "refs/tmp/pr<n>" origin/main)   # verified exit 0 above
    commit=$(git commit-tree "$tree" -p "refs/tmp/pr<n>" \
      -p "$(git rev-parse origin/main)" -m "Merge branch 'main' into <head-branch>")
    git push origin "$commit:refs/heads/<head-branch>"
    ```

  - **Real** conflict: resolve it. For a lockfile-only conflict (`package-lock.json`,
    `pnpm-lock.yaml`), regenerate rather than hand-merge — check out the PR branch in a **worktree**,
    `git merge origin/main`, `npm install` (or `npm ci` + `npm install <pkg>@<new>`) to rebuild the
    lock, then run the repo's `npm run check:ts` / lint and push to the head branch. Never resolve in
    the primary checkout, never push to `main`. A conflict in source code usually means the upgrade
    touched an API the repo uses — resolve it via `dependabot-upgrades.md` (understand the new
    shape, then merge base in correctly), not a blind conflict-marker pick.
- **UNKNOWN** — GitHub hasn't computed mergeability yet → skip this pass, re-check next tick.

**Red-check handling:** flaky → re-run once; lockfile/dependency drift → regenerate the lock; a
genuine build/test failure caused by the upgrade → `dependabot-upgrades.md`: this is the repo telling
you the new version needs code changes, so read the changelog and adapt. On a **self PR** the same
discipline applies with the PR description as the spec instead of a changelog → **fix from context**
(algorithm step 3). HOLD only when you can't confidently make it correct (per invariant 3, the
changelog HOLD rule, and the step-3 HOLD escape).

## Merge mechanics

- **Prefer arming GitHub auto-merge** so CI is the final gate before the merge (and thus before the
  deploy): `gh pr merge <n> -R "$SLUG" --squash --auto --delete-branch`. If the PR already has
  `autoMergeRequest != null`, it's armed — skip.
- **Fallback for plan-gated repos:** GitHub auto-merge is unavailable on private Free repos — `--auto`
  errors. When it does, and the PR is **CLEAN with all required
  checks green**, merge immediately: `gh pr merge <n> -R "$SLUG" --squash --delete-branch`. If
  it's not yet green, leave it — the next pass handles it once CI finishes.
- **Squash** is the fleet default (matches the repos' `auto-merge.yml`); if a repo disallows squash,
  fall back to its allowed method rather than failing.
- **Delete the branch on merge** (fleet default: `delete_branch_on_merge`).

## Deploy awareness — fire and forget

Merging to `main` **auto-deploys to prod** on most fleet repos (Vercel git-integration on frontend
apps; GitHub Actions / `deploy:code` on SAM repos; custom handoff workflows on others). That's
expected and acceptable **because the green gate means CI passed** — the
same protection any merge relies on. An **implemented-issue** PR deploys on merge exactly like any
other — its extra safety is that `/ship`'s review fleet ran before the merge (invariant 9). After
merging, **do not** babysit or fix the deploy in this pass — fire-and-forget. A failed post-merge deploy is a separate concern surfaced by the fleet's own
alerting, not this loop.
