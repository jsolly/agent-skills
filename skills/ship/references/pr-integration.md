# PR + auto-merge integration (step 11–14 when `{INTEGRATION_MODEL}` is `pr-auto-merge`)

Use this path when the repo integrates via **branch → PR → CI-gated auto-merge** (fleet default, or declared in root `AGENTS.md` `## Ship`). Do **not** run `git push origin HEAD:main` first — branch protection may reject it (GH006) and wastes a failed push attempt.

**CI owner** (`references/ci-owner.md`) determines only the local gate depth in step 11:

- **`local`** — full local gate before the PR (fleet default).
- **`github-handoff`** — cheap local subset only (repos that declare slow GitHub CI ownership).

After the PR opens, **both owners stop — fire-and-forget** (user decision 2026-06-30). §12–13 run only when the user explicitly asks for in-session babysitting.

## 11. Run the gate, push branch, open PR

1. **Feature branch** — if on `main`, create one from fresh `origin/main` (e.g. `feat/<slug>` or `agent/<slug>`). Record branch name for step 14.
2. **Run the local gate** — scope depends on `{CI_OWNER}`:
   - **`local`:** full battery (e.g. `npm test && npm run check:ts && npm run check:biome`, or the repo's documented gate). The pre-commit hook already ran at commit; `/ship` must still run the gate explicitly here before push.
   - **`github-handoff`:** cheap local subset only (repo `AGENTS.md` — typically lint/types/static). Do **not** run unit/E2E or local DB tests as a merge gate; GitHub CI owns those.
3. **`git push -u origin HEAD`** — never `HEAD:main`, never `--no-verify`.
4. **Open PR** — `gh pr create` with title + body (Summary bullets + Test plan checklist). If a PR already exists for this branch, skip create and use `gh pr view`.
5. **Auto-merge (orchestrated PRs only)** — opt in explicitly on PRs **you** opened via `/ship`; never label or arm auto-merge on third-party PRs:
   - `gh pr edit --add-label ship-auto-merge`
   - `gh pr merge --auto --squash` (arms immediately; label-gated `auto-merge.yml` re-arms on sync)
   - Verify: `gh pr view --json autoMergeRequest,state,url`
   - If arming fails with `Auto merge is not allowed for this repository` — a **plan gate** on private Free repos, not an error — note `auto-merge: unavailable (plan-gated)` for step 14 and continue; the PR waits for the user or a `/janitor` pass. (`auto-merge.yml`'s check failing on such repos is expected noise, not a regression.)
6. **Cap push-fix at 3 cycles** — applies to the **local gate** before push only. Never enter a fix-red-PR loop after the PR is open (either owner).

After the PR is open (auto-merge armed, or noted plan-gated), **stop here — skip §12–13** (fire-and-forget, both CI owners). First, if this ship ran from a **linked worktree** (not the primary checkout), do the worktree cleanup now (orchestration **step 15**): `cd` to the primary checkout's `main` and `git worktree remove <path>`. Gate is "branch pushed + worktree clean" — **not** "merged" (merge happens out-of-session). Then stop. Step 14: **`PR opened — CI handoff`** (add `Worktree: removed <name>`).

## 12. Deploy or verify (after merge, or babysit if still open)

**Skipped by default** — under fire-and-forget the merge, deploy, and verification happen out-of-session. Run this section only when the user explicitly asks for in-session babysitting.

Branch on `{SHIP_PROFILE}` and whether the PR has merged:

### Before merge (PR open, CI running)

- Babysit required checks: `gh pr checks --watch` or poll until **`CI / ci`** (or the repo's documented required check) is green.
- If strict branch protection blocks merge ("out of date"): run `gh pr update-branch` (or click Update branch), then re-babysit CI.
- Do **not** run local `deploy:code` — nothing has landed on `main` yet.

### After merge (`main` updated`)

- **`vercel-static`:** wait for Vercel production deployment READY; HTTP 200 on production URL. Record `deploy: verified at <url>`.
- **`aws-sam` (Actions-deployed SAM repos):** babysit `.github/workflows/deploy.yml` when asked — code deploys via GitHub Actions after merge. Do **not** run local `deploy:code`.
- **`aws-sam` (break-glass local deploy):** GitHub-managed deploy on merge; local `npm run deploy:code` is **break-glass only** when AGENTS.md says so.
- **`gate-only` / `docs-config`:** `deploy: none`.

## 13. Confirm integration landed

**Skipped by default** (fire-and-forget) — integration is intentionally unconfirmed in-session. The subsections below apply only on an explicit babysit request.

### PR path (explicit babysit request)

- **Merged:** `git fetch origin main`; confirm shipped SHA is ancestor of `origin/main`. Record `CI: GitHub Actions (<check name>)`.
- **Still open / CI pending:** record `CI: pending (<check name>)` and say auto-merge will complete when green — do not claim "merged" yet.
- **CI failed:** fix forward on the same branch or report **`Not merged`**.

### Direct-push path

See orchestration step 13 — `CI: none (local gate)`.

## 14. Final summary (PR path)

Lead with outcome:

| Outcome | Opening line |
| --- | --- |
| PR opened (default, fire-and-forget) | **`PR opened — CI handoff`** — PR URL; auto-merge armed, or `unavailable (plan-gated)`; do not claim merged |
| Merged + deploy OK (explicit babysit request only) | **`PR merged to main`** — PR URL, merge SHA, `Ship profile`, `Review tier`, deploy outcome, `CI: GitHub Actions` |
| CI failed (explicit babysit request) | **`Not merged`** — which check failed |
| Stopped on findings | **`Stopped — not pushed`** |

Do **not** use **`Shipped to main`** when integration was via PR unless quoting the merge event explicitly as "PR merged to main".

## Break-glass direct push

`git push origin HEAD:main` bypasses required CI when branch protection has `enforce_admins: false`. Git prints a bypass warning. Use only in emergencies documented in repo `AGENTS.md`. After break-glass push on a **`local`** CI owner repo, babysit GitHub CI on `main`. On **`github-handoff`** repos, still do not babysit unless the user explicitly asks.
