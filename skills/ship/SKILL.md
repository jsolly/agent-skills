---
name: ship
description: Use when the user asks to push changes, says `/ship`, asks for "review and push" / "commit and push" / "ship it" / "push and fix CI until green", or otherwise indicates they're ready to integrate local work to `main`. Do NOT invoke for routine in-flight commits — only when the user signals end-of-task integration.
---

# Git Review, Fix, and Integrate to Main

This is the sole semantic review gate before code reaches the remote. **Default integration:** branch → PR → CI-gated auto-merge (`{INTEGRATION_MODEL}` = `pr-auto-merge`). **Legacy/break-glass:** direct `git push origin HEAD:main` when AGENTS.md declares `Integration: direct-push` or for emergency admin bypass.

Review depth and deploy behavior are **right-sized by ship profile** (step 3): static Vercel SPAs get a light agent fleet; AWS SAM repos lean on GitHub deploy workflows (`.github/workflows/deploy.yml`) instead of local `deploy:code`. **CI owner** (`local` vs `github-handoff`) controls only how much of the battery runs locally before the PR — see `references/ci-owner.md`. After the PR opens, every PR ship is **fire-and-forget** (user decision 2026-06-30): success is the gate passing locally (full gate or cheap subset per owner) and the PR opened with auto-merge armed — or noted `unavailable (plan-gated)` on private Free repos, where the PR waits for the user or a `/janitor` pass. Do not watch CI, fix red checks, or babysit merge/deploy in-session unless the user explicitly asks. **The skill runs the gate explicitly** before push; the pre-commit hook already ran at commit time, but `/ship` must not rely on that alone.

The expected starting state is local uncommitted/unpushed changes on whatever branch or checkout the harness opened — integrate via `/ship` from there. Per `rules/worktree-authoring.md`, change-making work should have been authored in a worktree off `main`; `/ship` is the integrator that lifecycle points to (push branch → PR → CI-gate → cleanup). If the session used **`/worktree`**, record `WORKTREE_ID`, `WORKTREE_PATH`, and `REPO_ROOT` for step 15 (cleanup after successful integration).

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
11. **Run the gate, then integrate** — run the repo gate explicitly; then **`pr-auto-merge`:** push branch + open PR + verify auto-merge (→ `references/pr-integration.md`); **`direct-push`:** `git push origin HEAD:main`. Never `--no-verify`. → see `references/orchestration.md`
12. **Deploy or verify** — PR paths: skip (fire-and-forget; merge and deploy happen out-of-session) unless the user explicitly asks to babysit. Direct-push: post-push Vercel verify, or confirm the GitHub Deploy workflow for SAM repos. Never auto-run `deploy:infra`. → see `references/deploy-rules.md`, `references/pr-integration.md`, `references/ci-owner.md`
13. **Confirm integration landed** — PR paths: skip (handoff at step 11); direct-push: push is the CI. → see `references/orchestration.md` step 13
14. **Final user summary** — lead with **`PR opened — CI handoff`** (PR path; note auto-merge armed or `unavailable (plan-gated)`) or **`Shipped to main`** (direct-push). → see `references/orchestration.md` step 14
15. **Clean up worktree** — ran from a linked worktree (any: `/worktree`, `.claude/worktrees/`, or manual `git worktree add`)? Remove it + `cd` back to the primary checkout's `main` (default). PR paths: at PR creation (gate = pushed + clean, not merged) — fold into step 11. Direct-push: after the push lands. Only the worktree *this* ship ran from; never sweep others'. → see `references/orchestration.md` step 15

## Safety rules (non-negotiable)

- **Never push directly to `main` except break-glass** — default path pushes a feature branch and opens a PR. Direct `HEAD:main` only when `{INTEGRATION_MODEL}` is `direct-push` or user explicitly requests emergency bypass.
- **Never push a branch without running the local gate first** — the pre-commit hook already ran at commit, but `/ship` re-runs the gate explicitly before push.
- **Never `--no-verify`** on commit or push — orchestrator discipline + pre-commit hook backstop; there is no `block-git` shell guard. See `references/safety-rules.md`.
- **Never `git push --force` / `--force-with-lease` / `git reset --hard`** — skill discipline; not blocked by shell guards.
- **Never `git add -A` or `git add .`** — stage by name to avoid sweeping in untracked secrets, large binaries, or probe artifacts.
- **Never weaken the gate** — do not disable checks or make unrelated changes to force a green push.
- **Review outputs are advisory** — verify each surviving Critical/Important finding against the real code path before fixing.

## Cycle bounds

The review fix loop (step 9) is capped at 3 cycles total. On the 4th, surface the failure to the user and stop.

The push-fix loop (step 11) is capped at 3 cycles. On the 4th rejection, stop and report.

## Token economics

This skill is the only semantic review gate — match depth to profile, not one size for every repo.

- **`vercel-static` / frontend-only:** default to **light fleet** (5 always-run agents + extension-gated specialists). Full file bodies still required for `code-quality-reviewer`.
- **`aws-sam` / infra-DB-auth/provider changes:** **full fleet** mandatory — all 10 always-run agents + extension-gated + `confidence-scorer`.
- **Trivial `docs-config` diff:** skip fan-out (existing trivial path).
- **Escalation:** if a light review surfaces structural/security/infra concerns, re-run with full fleet before push.
- Do not rerun the full fleet just to confirm a clean review. Push-fix cycles should not re-fan-out unless the failure is ambiguous or security-sensitive.

## Reference files

- `references/orchestration.md` — full step-by-step body, ship profiles, integration model, D.1, D.2, D.3, E.1, E.2 wiring.
- `references/ci-owner.md` — `local` vs `github-handoff`: local gate depth + the fire-and-forget handoff (fleet default vs slow-ci-app).
- `references/pr-integration.md` — PR + auto-merge path (steps 11–14 when `pr-auto-merge`).
- `references/agent-fleet.md` — light vs full fleet tables, gating rules, model behavior.
- `references/output-contract.md` — canonical reviewer output schema (every agent inlines this).
- `references/dispatch-prompt.md` — the prompt template each agent receives via Task.
- `references/deploy-rules.md` — AWS GitHub-managed deploy, Vercel Git verification, live checks.
- `references/conflict-resolution.md` — merge conflict resolution + gate reproduction guidance.
- `references/safety-rules.md` — git safety model + remaining shell guards (prod DB, stack delete, CLAUDE.md write).
