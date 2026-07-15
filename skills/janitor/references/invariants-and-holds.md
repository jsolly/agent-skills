# Envelopes, Invariants, and HOLD Rules

Read this file before any mutation. These boundaries are the standing authorization for `/janitor`;
route-specific playbooks may narrow them but never override them.

## Merge envelope (POLICY — the one block to edit)

Default posture is **changelog-driven adaptive upgrade**: a dependency bump is a real upgrade, not a
version-number swap. Read the changelog for the version range, decide whether the repo needs changes
to stay correct under the new version (breaking changes, deprecations, relevant new behavior), make
those changes, and merge once CI is green. The green gate is what validates the adaptation. **A
Dependabot *major* gets the deepest treatment, not a hold: the janitor does the full upgrade (see
`dependabot-upgrades.md`) — research the migration guide, adapt the repo to the new version's
canonical patterns — and then merges it when green, exactly like any other bump.** The only PRs that
wait for a human are the ones the janitor can't confidently make correct (the HOLD row).

| Class of PR (author already gated to Dependabot/self) | Action |
| --- | --- |
| **Any major bump from Dependabot** (integer before the first `.` increases, incl. `github_actions` action majors) | **PREP → merge when green.** Run **Major upgrades** in `dependabot-upgrades.md`: research the changelog + official migration guide, adapt config/code/styling to the new version's patterns, push to the PR branch, then arm auto-merge / merge once green. |
| Patch / minor with no breaking or behavior notes in its changelog | **Merge** when green |
| Non-major bump whose changelog flags breaking changes, deprecations, or behavior you rely on | **Read changelog → adapt the repo → merge** when green (see `dependabot-upgrades.md`) |
| `github_actions` pin bump | **Merge** when green — majors still get a Major-upgrades read (action majors change defaults/inputs) |
| Your own (authenticated user) PRs | **Fix failures → merge when green (full autonomy).** Recover intent from the PR itself (title, description, linked issue, the diff) and fix whatever the required checks flag — failing tests, lint, types, build — the same way you adapt a Dependabot bump: edit the real code/tests to be genuinely correct (never mask), push to the PR head, merge once green. WIP guard + HOLD-when-context-insufficient apply (see `pr-drain.md`). |
| A bump you **cannot confidently bring into compliance** — ambiguous breaking change, needs a product decision, or an adaptation you can't validate | **HOLD** + report the specific reason. Thoughtful includes knowing when to escalate. |

Two pre-wired alternate postures — change this section's default to adopt one:

- **Conservative (green-gated, hold majors):** merge only patch/minor + non-major action pins; hold
  every major for human review; never edit code. Use when you want the janitor purely mechanical.
- **Fix, never merge:** do all the changelog research and adaptation, but never merge nor arm
  auto-merge — a human retains the final merge on every PR.

## Issue envelope (POLICY — the issue arm's one block to edit)

Default posture is **implement → ship → merge when green + review-clean**: janitor builds the change
the issue asks for, runs it through `/ship` (which fans out the review-agent fleet and opens a PR that
closes the issue), and merges once CI is green **and** the review fleet raised no high-confidence
finding. The review fleet + green gate are what make an unattended feature merge safe — they are not
optional for the issue arm.

| Class of issue (author already gated to self/Dependabot) | Action |
| --- | --- |
| Clear, self-contained, and implementable from the issue text alone | **IMPLEMENT → /ship → merge** when green + review-clean |
| Implementable but the review fleet raises a high-confidence finding, or CI won't go green | **HOLD** — leave the PR open, comment the specific finding on the issue, report `IMPLEMENTED (held)` |
| Ambiguous, needs a product/design decision, or too large to land as one reviewable PR | **HOLD before writing code** — comment the specific open question on the issue, report `HELD` |
| A bug report you can safely reproduce + fix within the same envelope | treat as an implementable issue (fix + test + ship) |

Pre-wired alternate postures (change the default above to adopt one):

- **Implement, never merge:** implement + `/ship` the PR, but never auto-merge a freshly-built
  feature — report `IMPLEMENTED (awaiting your merge)` and let a human land it. Dependency/self PRs
  still merge under the PR envelope.
- **Small-and-covered only:** auto-merge an implemented issue only when it's small, mechanical, and
  fully test-covered (copy/config/typo/well-specified fix); anything adding real product behavior
  implements → PR → awaits a human.

## Hard invariants (never cross, regardless of the envelope)

1. **Author gate is absolute.** Act on a PR **or issue** — merge/modify/implement/close — **only** if
   its `author.login` is your own login (from `gh api user --jq .login`) or a Dependabot bot
   (`app/dependabot`, `dependabot[bot]`, or `is_bot == true` with `dependabot` in the login). Every
   third-party / fork PR **or issue** is **read-only** — never merge, push to, approve, rebase, or
   implement/close it. This subsumes "no third parties in public repos": the gate excludes them
   everywhere.
2. **Green gate.** Never merge a PR whose required checks aren't all passing. "No red, no pending."
3. **Make the upgrade correct, not just green.** Adapting the repo's own code to a dependency's
   breaking changes, deprecations, or new APIs **is the job** — you may and should edit application
   code for that, grounded in the changelog (see `dependabot-upgrades.md`). What you may **not** do:
   fix a failure by masking it. If you can't confidently bring the repo into compliance with the new
   version, **HOLD** and report — don't merge an adaptation you can't validate.
4. **Never weaken the gate to force green.** Don't disable, skip, `continue-on-error`, or loosen a
   failing check; don't pin/downgrade around the problem; never `--no-verify` / `--admin` /
   force-merge. Green must mean the code genuinely passes under the new dependency. Editing app code
   to comply with the upgrade (invariant 3) is not weakening the gate; suppressing the check is.
5. **Push only to the PR's head branch, never to `main`.** No `git push origin HEAD:main`, no
   force-push to `main`, no `git reset --hard` on a shared branch.
6. **Drafts are untouchable.** Skip `isDraft == true`.
7. **Respect the shell guards.** `block-prod-db-migrations`, `block-stack-delete`, etc. still fire;
   don't route around them.
8. **No un-researched majors.** A major may merge, but only *through* **Major upgrades** in
   `dependabot-upgrades.md` — never as a bare version swap. If you can't complete the
   research/adaptation (or can't even parse the version range to know what to research), that's the
   HOLD row of the envelope, per invariant 3.
9. **Issues are implemented via `/ship`, never a shortcut around it.** An implemented issue reaches
   `main` only as a `/ship`-produced PR that ran the review-agent fleet and the green gate — never a
   direct push to `main`, never a merge that skips the review fleet. **No un-reviewed features:** a
   freshly-built feature merges only when the review fleet is clean *and* CI is green (Issue
   envelope); a high-confidence review finding is the HOLD row, not something to merge past.
10. **Implement only what the issue actually specifies.** Build the change the issue asks for, scoped
    to it — don't gold-plate, refactor adjacent code, or invent requirements the issue didn't state.
    If the issue is ambiguous or needs a product/design call, that's a HOLD-with-comment **before**
    writing code — guessing at intent and merging it is the failure mode this invariant prevents.

## Universal HOLD contract

Whenever correct action needs human judgment or cannot be validated confidently:

1. Stop before guessing. A partial adaptation is acceptable only when its completed work is valid.
2. Leave a `JANITOR HOLD:` comment stating the one specific open question.
3. If a PR exists, ensure auto-merge is disarmed:
   `gh pr merge <n> -R "$SLUG" --disable-auto`.
4. Report the item as `HELD` or `IMPLEMENTED (held)`.
5. On later passes, maintenance may continue, but the item must never be merged, armed, or approved
   until a human resolves the question.
