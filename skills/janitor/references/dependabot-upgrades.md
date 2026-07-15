# Dependabot Upgrade Playbook

Read this file for every Dependabot PR. The depth scales with risk, but every bump gets evidence-based
changelog review; every major gets the full migration path.

## Changelog-driven upgrades (the core competency)

Never bump blindly. When a dependency changes version, decide — from evidence, not assumption —
whether the repo needs to change to stay correct, then make exactly those changes.

1. **Get the changelog for the exact range** (`from A to B`). In order of preference:
   `gh release list -R <upstream-owner/repo>` + `gh release view <tag>` for each intervening major;
   the package's `CHANGELOG.md` (`gh api repos/<owner>/<repo>/contents/CHANGELOG.md`); the npm/PyPI
   page; the diff of migration guides. Read the **breaking changes**, **deprecations**, and **new
   defaults/behavior** for every version between A and B, not just B.
2. **Find where the repo touches the changed surface.** Grep the repo for the imported symbols, the
   renamed/removed APIs, changed config keys, and any option whose default flipped. "We don't call
   the removed function" is a conclusion you reach by grepping, not by hoping.
3. **Decide and adapt.** For each relevant change: migrate the call sites, update config, adopt the
   new required option, or delete now-dead workarounds. Match the surrounding code's style. Keep the
   diff scoped to what the upgrade requires — an upgrade PR is not a refactor. (For a **major**,
   "what the upgrade requires" is wider — see Major upgrades below.)
4. **Validate locally before trusting CI.** Run the repo's own checks (`npm run check:ts`, lint, the
   affected tests) in the worktree. CI is the gate, but don't push adaptations you haven't run.
5. **When to HOLD instead of adapt:** the changelog describes a breaking change whose correct
   resolution needs a product/judgment call; the new behavior changes output/semantics in a way only
   a human should sign off on; or you cannot verify your adaptation is right. Report the specific
   changelog entry and why it's held — that *is* the thoughtful outcome, not a failure. Follow
   `invariants-and-holds.md`'s universal HOLD contract.

For a green patch/minor with a changelog that shows nothing breaking and nothing you depend on,
steps 2–4 collapse to a quick grep-confirm — merge it. The depth scales with the risk from
classification in `pr-drain.md`.

## Major upgrades: research the migration, modernize the repo

A Dependabot major is not a version swap with extra caution — it's a **real migration the janitor
performs end-to-end**, research through merge. The deliverable is a merged upgrade: bump +
adaptation together on the PR branch, validated by the green gate, landed with no human in the
loop. It may span passes: one pass researches, adapts, pushes, labels, and arms auto-merge; if CI
is still running, a later pass merges once green — no pass sits waiting on PR CI. The prep always
rides the Dependabot PR branch (no superseding PRs); if you can't push there, HOLD with the reason.

1. **Search the internet for the migration path — don't rely on the packaged changelog alone.**
   Majors ship dedicated docs that a `CHANGELOG.md` skim misses: use WebSearch/WebFetch to find the
   **official upgrade/migration guide** (`"<package> v<B> upgrade guide"`, `"migrating to <package>
   <B>"`), the release announcement blog post, and the GitHub release notes for every major between
   A and B. Prefer the project's own docs over third-party summaries. If the ecosystem ships an
   **official codemod / upgrade tool** (`npx @tailwindcss/upgrade`, `npx @next/codemod`,
   `npx @eslint/migrate-config`, `sv migrate`, …), run it in the worktree — it encodes the
   maintainers' own migration knowledge — then review its diff like any other change.
2. **Adopt the new version's canonical patterns, not just minimal compat.** The goal is a repo that
   looks like it was *written for* the new major, not one dragging legacy shims through it. If the
   major establishes a new idiomatic shape for surfaces this repo uses — e.g. Tailwind v4's
   CSS-first `@theme` config replacing `tailwind.config.js`, ESLint 9's flat config, a new plugin
   registration API — migrate to it and delete the legacy form, per `rules/code-style.md` ("delete
   the old shape", "write directly against the current API"). Where the guide highlights new
   features/patterns that supersede workarounds or hand-rolled code the repo carries, adopt them.
   **Bound:** modernize the surfaces the upgrade touches; don't turn the PR into a repo-wide
   refactor of things the dependency never sees.
3. **Do the work in a worktree on the PR branch, push to the PR head.** Check out the Dependabot
   branch in a worktree (never the primary checkout), apply the migration, run the repo's own gate
   (`npm run check:ts`, lint, affected tests — and a build for config-level changes like Tailwind's,
   where "compiles" is the only cheap proof the styling pipeline still works), then push to the PR
   head branch. Dependabot stops rebasing a branch once you push to it — that's fine; the PR is now
   the janitor's to keep green.
4. **Mark it, arm it, merge it.** Persist the prep on GitHub so later passes don't redo it:
   `gh label create janitor-prepped -R "$SLUG" --force` (idempotent), then
   `gh pr edit <n> -R "$SLUG" --add-label janitor-prepped`. Then arm auto-merge
   (`pr-drain.md` → Merge mechanics) so CI is the final gate — or merge immediately if checks are
   already green. Don't sit waiting on PR CI: on plan-gated repos where `--auto` errors, report
   `PREPPED (CI pending)` and let the next pass merge once green. In the pass report, summarize what
   the migration changed. If the correct adaptation needs a product/judgment call, or you can't
   validate it (e.g. a visual overhaul with no test coverage), stop at a partial adaptation + HOLD
   with the specific open question — same escalation contract as changelog step 5. **Still label
   it** (the prep work is real state), leave a PR comment prefixed `JANITOR HOLD:` stating the open
   question — that comment is what keeps later passes reporting HELD instead of merging — and make
   sure auto-merge is **disarmed**: never arm a held PR, and if a hold is placed after arming (e.g.
   red-check handling escalates on a later pass), run
   `gh pr merge <n> -R "$SLUG" --disable-auto` first — the comment advises the janitor, not GitHub.

Cost note: one major prep is a real unit of work (research + codemod + gate run). When several
majors are pending, run their preps in **parallel subagents** rather than serially or deferred —
see `reporting-and-loop.md` → Bounding and idempotency.
