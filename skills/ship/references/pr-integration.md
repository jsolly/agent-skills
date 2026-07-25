# PR + auto-merge integration (step 11–14 when `{INTEGRATION_MODEL}` is `pr-auto-merge`)

Use this path when the repo integrates via **branch → PR → CI-gated auto-merge** (fleet default, or declared in root `AGENTS.md` `## Ship`). Do **not** run `git push origin HEAD:main` first — branch protection may reject it (GH006) and wastes a failed push attempt.

**There is no fire-and-forget canon.** After the PR opens, always continue to §12 (watch CI → fix red → merge).

**CI owner** (`references/ci-owner.md`) determines only the local gate depth in step 11:

- **`local`** — full local gate before the PR (fleet default).
- **`github-handoff`** — cheap local subset only (example-app only today). Still babysit GitHub CI after the PR opens.

## 11. Run the gate, push branch, open PR

1. **Feature branch** — if on `main`, create one from fresh `origin/main` (e.g. `feat/<slug>` or `agent/<slug>`). Record branch name for step 14.
2. **Run the local gate** — scope depends on `{CI_OWNER}`:
   - **`local`:** full battery (e.g. `npm test && npm run check:ts && npm run check:biome`, or the repo's documented gate). The pre-commit hook already ran at commit; `/ship` must still run the gate explicitly here before push.
   - **`github-handoff`:** cheap local subset only (repo `AGENTS.md` — typically lint/types/static). Do **not** run unit/E2E or local DB tests as a merge gate; GitHub CI owns those.
3. **`git push -u origin HEAD`** — never `HEAD:main`, never `--no-verify`.
4. **Open PR** — `DOTAGENTS_SHIP=1 gh pr create` with title + body (Summary bullets + Test plan checklist). The `DOTAGENTS_SHIP=1` prefix is required: `block-pr-create-outside-ship` denies bare `gh pr create` so agents cannot skip this skill. If a PR already exists for this branch, skip create and use `gh pr view` (no allow prefix needed).
5. **Auto-merge (orchestrated PRs only)** — opt in explicitly on PRs **you** opened via `/ship`; never label or arm auto-merge on third-party PRs:
   - `gh pr edit --add-label ship-auto-merge`
   - `gh pr merge --auto --squash` (arms immediately; label-gated `auto-merge.yml` re-arms on sync)
   - Verify: `gh pr view --json autoMergeRequest,state,url`
   - If arming fails with `Auto merge is not allowed for this repository` — a **plan gate** on private Free repos (e.g. `dotagents`), not an error — note `auto-merge: unavailable (plan-gated)` for step 14. Continue to §12: babysit CI, then merge manually with `gh pr merge --squash` once green. (`auto-merge.yml`'s check failing on such repos is expected noise, not a regression.)
6. **Cap push-fix at 3 cycles** — applies to the **local gate** before push only. The post-PR fix-red loop is separate (§12, also capped at 3).

Continue to §12–13 (babysit CI → merge → deploy/verify). Worktree cleanup waits until merge (orchestration step 15).

## 12. Babysit CI, then deploy or verify

**Required for every PR ship** (both CI owners).

Branch on `{SHIP_PROFILE}` and whether the PR has merged:

### Before merge (PR open, CI running)

**Watch and fix — never stop at "PR created":**

1. **Watch** required checks: `gh pr checks --watch` or poll until **`CI / ci`** (or the repo's documented required check) completes.
2. **On failure:** fetch the failing job log (`gh run view <id> --log-failed` or the checks URL), diagnose, fix forward on the same branch, commit, `git push`, and return to step 1. Cap at **3** fix-red-PR cycles; on the 4th, report **`Not merged`** with which check failed.
3. **Out of date / blocked merge:** run `gh pr update-branch` (or equivalent), then re-watch CI.
4. **On green:** if auto-merge is armed, wait for it to land. If auto-merge is **unavailable (plan-gated)**, merge yourself: `gh pr merge --squash`.
5. Do **not** run local `deploy:code` while the PR is still open.

### After merge (`main` updated`)

- **`vercel-static`:** wait for Vercel production deployment READY; HTTP 200 on production URL. Record `deploy: verified at <url>`.
- **`aws-sam` (my-org fleet):** babysit `.github/workflows/deploy.yml` — code deploys via GitHub Actions after merge. Do **not** run local `deploy:code`.
- **`aws-sam` (example-app):** GitHub-managed deploy on merge; local `npm run deploy:code` is **break-glass only** when AGENTS.md says so. Babysit `deploy.yml` with `gh run watch`.
- **`heroku-git`:** Heroku GitHub auto-deploy from `main` — verify with `npx heroku releases` (and/or `npx heroku ps`) once the release appears. Record `deploy: heroku release <vN>`.
- **`gate-only` / `docs-config`:** `deploy: none`.

## 13. Confirm integration landed

### PR path

- **Merged:** `git fetch origin main`; confirm shipped SHA is ancestor of `origin/main`. Record `CI: GitHub Actions (<check name>)`.
- **Still open / CI pending:** record `CI: pending (<check name>)` — do not claim "merged" yet; keep watching unless fix-red cap exhausted.
- **CI failed (cap exhausted):** report **`Not merged`**.

### Direct-push path

See orchestration step 13 — `CI: none (local gate)`.

## 14. Final summary (PR path)

Lead with outcome:

| Outcome | Opening line |
| --- | --- |
| Merged + deploy OK | **`PR merged to main`** — PR URL, merge SHA, `Ship profile`, `Review tier`, `CI owner`, deploy outcome, `CI: GitHub Actions` |
| PR open, auto-merge queued | **`PR open — auto-merge pending CI`** — PR URL, check status |
| CI failed | **`Not merged`** — which check failed |
| Stopped on findings | **`Stopped — not pushed`** |

Do **not** use **`Shipped to main`** when integration was via PR unless quoting the merge event explicitly as "PR merged to main".

## Break-glass direct push

`git push origin HEAD:main` bypasses required CI when branch protection has `enforce_admins: false`. Git prints a bypass warning. Use only in emergencies documented in repo `AGENTS.md`. After break-glass push, babysit GitHub CI on `main` when Actions run.
