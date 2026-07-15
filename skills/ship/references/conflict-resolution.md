# Merge Conflict Resolution + Gate Reproduction

Detail for steps 2 (sync main) and 4 (smoke check) of the orchestration.

---

## Merge conflict resolution (step 2)

When `git merge origin/main` produces conflicts:

- **Pause and walk the user through resolution.** Show `git status` so they see the conflict set; resolve file-by-file with the conflict markers as the source of truth.
- **Stage each resolved file individually** (no `git add -A` — the deny rules also discourage this).
- **After resolving, run typecheck + tests** before completing the merge. Conflict resolution often introduces subtle issues (a hand-merged function signature that doesn't match what callers expect).

If the merge introduced regressions in test fixtures or signatures (common when upstream changed function signatures the topic branch's mocks rely on), fix them as part of the merge resolution, not as a follow-up commit.

Commit the merge with the default merge message — Conventional Commits doesn't apply to merge commits.

## Gate reproduction before push (step 4)

Local tests pass in a warm, cached dev environment; the skill runs the **full gate at step 11** (the `package.json` / pre-commit gate battery) and the **deploy at step 12**, both from your machine with real credentials. Catching regressions in step-4 smoke, before the review investment, is drastically cheaper than a step-11 gate failure or a bad deploy. Step-4 reproduction front-runs the gate so the gate-and-push sequence lands cleanly.

**Default:** run the repo's standard battery (the same `npm run check:*` / `lint:md` / `test` scripts the step-11 gate runs, plus its `prepush` script if `package.json` defines one). That is exactly the gate — reproducing it here means step 11 won't fail on it.

**When to run the full battery** (the complete `package.json` / pre-commit gate battery), especially for changes a quick smoke wouldn't catch:

- Test harness or runners (`tests/setup.ts`, `tests/run-vitest.ts`, `playwright.config.ts`, `vitest.config.ts`, any `tests/helpers/**`)
- CI-invoked `package.json` scripts (`test`, `test:ci`, `test:smoke`, `test:e2e`, `build`)
- Build/runtime config (`tsconfig*.json`, `astro.config.*`, `next.config.*`, `vite.config.*`, etc.)
- Container/service config (`supabase/config.toml`, `docker-compose*.yml`, `Dockerfile*`)
- Dependency changes that move packages between `dependencies` and `devDependencies`

**The deploy itself** (Vercel, linked Supabase, AWS Lambda publish) is run **explicitly by the skill at step 12**, after the push to `main`, from your machine with real creds — it is not a GitHub step and no hook runs it. Step-4 smoke can't fully reproduce a prod deploy, but it should reproduce everything the gate checks so the push-then-deploy sequence runs cleanly (see `references/deploy-rules.md`).

**If you skip the full battery on a change that touches any of the paths above and the gate then fails, that's on you.** Add it to the lessons list for the next run.
