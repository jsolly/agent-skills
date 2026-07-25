---
name: ship
description: Use when the user asks to push changes, says `/ship`, asks to open/create/publish/file a PR or pull request, asks for "review and push" / "commit and push" / "ship it" / "push and fix CI until green", or otherwise indicates they're ready to integrate local work to `main`. Do NOT invoke for routine in-flight commits, or for inspecting/merging an already-open PR (`gh pr view`/`merge` — e.g. `/janitor`). PR publish is owned by this skill — never bare `gh pr create` outside it.
---

# Git Review, Fix, and Integrate to Main

This is the sole semantic review gate before code reaches the remote. **Default integration:** branch → PR → CI-gated auto-merge (`{INTEGRATION_MODEL}` = `pr-auto-merge`). **Legacy/break-glass:** direct `git push origin HEAD:main` when AGENTS.md declares `Integration: direct-push` or for emergency admin bypass.

Review depth and deploy behavior are **right-sized by ship profile** (step 3): static Vercel SPAs get a light agent fleet; AWS SAM repos lean on GitHub deploy workflows (`.github/workflows/deploy.yml`) instead of local `deploy:code`. **CI owner** (`local` vs `github-handoff`) controls only how much of the battery runs locally before the PR — see `references/ci-owner.md`. **There is no fire-and-forget canon.** Success means the gate passes locally, the branch lands on the remote, CI is babysat to green (fix forward on red), and the PR merges. Where auto-merge can't arm (plan-gated private Free repos), merge manually once green. **The skill runs the gate explicitly** before push; the pre-commit hook already ran at commit time, but `/ship` must not rely on that alone.

## PR CI babysit (required on every PR ship)

After the PR is open, **do not stop at "PR created."** For **every** `{CI_OWNER}` (`local` and `github-handoff`):

1. **Watch** required checks: `gh pr checks --watch` (or poll) until **`CI / ci`** (or the repo's documented required check) completes.
2. **On failure:** read the failing job logs, fix forward on the same branch, commit, push, and re-watch. Cap at 3 fix-red-PR cycles; on the 4th, report **`Not merged`** with which check failed.
3. **On green:** let auto-merge land, or if plan-gated run `gh pr merge --squash`.
4. **Then** run step 12 deploy/verify and step 13 confirm.

## Numbered orchestration

The orchestration is documented in `references/orchestration.md` — read it before each step. Summary:

1. **Inspect changes** — `git status`, `git diff`. → see `references/orchestration.md`
2. **Sync main into the working branch** — fetch, compare, merge or rebase, resolve conflicts. → see `references/orchestration.md` and `references/conflict-resolution.md`
3. **Load guidelines + classify profile, integration, and CI owner** — read AGENTS.md; infer `{SHIP_PROFILE}`, `{INTEGRATION_MODEL}`, and `{CI_OWNER}`; locate plan/spec (D.1). → see `references/orchestration.md` and `references/ci-owner.md`
4. **Smoke check** — tests, type checker, reproduce the gate locally if the change could affect it. → see `references/orchestration.md` and `references/conflict-resolution.md`
5. **Architectural sanity check** — orchestrator notes structural concerns; these get injected into agent prompts via D.2. → see `references/orchestration.md`
6. **Review with parallel agents** — read full changed-file bodies; fan out **light** or **full** fleet per profile and diff (see `references/agent-fleet.md`). Skip fan-out only for trivial `docs-config` diffs.
7. **Adjudicate findings with `confidence-scorer`** — drop Minor, score Critical/Important, verify surviving findings against real code paths. → see `references/orchestration.md`
8. **Present verdict + findings** — verdict-line first, TL;DR paragraph, then per-severity findings. Include `Ship profile`, `Review tier`, `Integration model`, and `CI owner`. → see `references/orchestration.md`
9. **Fix issues + re-smoke** — fix verified Critical and reasonable Important findings; re-run smoke and scoped re-review; loop up to 3 cycles. → see `references/orchestration.md`
10. **Stage and commit** — stage by name (no `git add -A`); Conventional Commits message describing original intent. → see `references/orchestration.md`
11. **Run the gate, then integrate** — run the repo gate explicitly; then **`pr-auto-merge`:** push branch + open PR (→ `references/pr-integration.md`); **`direct-push`:** `git push origin HEAD:main`. Never `--no-verify`. → see `references/orchestration.md`
12. **Babysit PR CI, then deploy/verify** — watch CI, fix red checks (cap 3), merge when green, then post-merge Vercel/Actions/Heroku verify. Never auto-run `deploy:infra`. → see `references/deploy-rules.md`, `references/pr-integration.md`, `references/ci-owner.md`
13. **Confirm integration landed** — PR path: merged SHA + CI status; direct-push: push is the CI. → see `references/orchestration.md` step 13
14. **Final user summary** — lead with **`PR merged to main`**, **`PR open — auto-merge pending CI`**, or **`Shipped to main`** (direct-push). → see `references/orchestration.md` step 14
15. **Clean up worktree** — ran from a linked worktree? Remove it + `cd` back to the primary checkout's `main` (default). **`pr-auto-merge`:** after merge lands. **`direct-push`:** after the push lands. Only the worktree *this* ship ran from; never sweep others'. → see `references/orchestration.md` step 15

## Safety rules (non-negotiable)

- **Never push directly to `main` except break-glass** — default path pushes a feature branch and opens a PR. Direct `HEAD:main` only when `{INTEGRATION_MODEL}` is `direct-push` or user explicitly requests emergency bypass.
- **Never push a branch without running the local gate first** — the pre-commit hook already ran at commit, but `/ship` re-runs the gate explicitly before push.
- **Never bare `gh pr create`** — always prefix with `DOTAGENTS_SHIP=1` (see `references/pr-integration.md`). The `block-pr-create-outside-ship` guard denies creates without that allow.
- **Never `--no-verify`** on commit or push — orchestrator discipline + pre-commit hook backstop; there is no `block-git` shell guard. See `references/safety-rules.md`.
- **Never `git push --force` / `--force-with-lease` / `git reset --hard`** — skill discipline; not blocked by shell guards.
- **Never `git add -A` or `git add .`** — stage by name to avoid sweeping in untracked secrets, large binaries, or probe artifacts.
- **Never weaken the gate** — do not disable checks or make unrelated changes to force a green push.
- **Review outputs are advisory** — verify each surviving Critical/Important finding against the real code path before fixing.

## Cycle bounds

The review fix loop (step 9) is capped at 3 cycles total. On the 4th, surface the failure to the user and stop.

The push-fix loop (step 11, local gate before push) is capped at 3 cycles. On the 4th rejection, stop and report.

The **fix-red-PR loop** (step 12, after the PR is open) is capped at 3 cycles: watch → fail → fix → push → re-watch. On the 4th failure, report **`Not merged`** — do not abandon the PR silently.

## Token economics

This skill is the only semantic review gate — match depth to profile, not one size for every repo.

- **`vercel-static` / frontend-only:** default to **light fleet** (5 always-run agents + extension-gated specialists). Full file bodies still required for `code-quality-reviewer`.
- **`aws-sam` / infra-DB-auth/provider changes:** **full fleet** mandatory — all 10 always-run agents + extension-gated + `confidence-scorer`.
- **Trivial `docs-config` diff:** skip fan-out (existing trivial path).
- **Escalation:** if a light review surfaces structural/security/infra concerns, re-run with full fleet before push.
- Do not rerun the full fleet just to confirm a clean review. Push-fix cycles should not re-fan-out unless the failure is ambiguous or security-sensitive.

## Reference files

- `references/orchestration.md` — full step-by-step body, ship profiles, integration model, D.1, D.2, D.3, E.1, E.2 wiring.
- `references/ci-owner.md` — `local` vs `github-handoff`: local gate depth only (babysit is always required on PR ships).
- `references/pr-integration.md` — PR path (steps 11–14): watch CI, fix-red loop, merge, deploy verify.
- `references/agent-fleet.md` — light vs full fleet tables, gating rules, model behavior.
- `references/output-contract.md` — canonical reviewer output schema (every agent inlines this).
- `references/dispatch-prompt.md` — the prompt template each agent receives via Task.
- `references/deploy-rules.md` — AWS GitHub-managed deploy, Vercel Git verification, live checks.
- `references/conflict-resolution.md` — merge conflict resolution + gate reproduction guidance.
- `references/safety-rules.md` — git safety model + remaining shell guards (prod DB, stack delete, CLAUDE.md write).
