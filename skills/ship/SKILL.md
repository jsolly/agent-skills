---
name: ship
description: Use when the user asks to push changes, says `/ship`, asks to open/create/publish/file a PR or pull request, asks for "review and push" / "commit and push" / "ship it" / "push and fix CI until green", or otherwise indicates they're ready to integrate local work to `main`. Do NOT invoke for routine in-flight commits, or for inspecting/merging an already-open PR (`gh pr view`/`merge` — e.g. `/janitor`). PR publish is owned by this skill — never bare `gh pr create` outside it.
---

# Ship

Sole fleet path: review → local gate → integrate → babysit CI → merge/land → post-land prove → **terminal close** in one run. Zero agent followups on success.

**Not success:** PR created, LGTM, ready-to-push, or abandoned babysit. Mid-flight `PR open — auto-merge pending CI` is valid **only while still watching**.

## Profile (from `AGENTS.md` ## Ship — do not invent)

| Var | Values |
| --- | --- |
| `{SHIP_PROFILE}` | `vercel-static` · `aws-sam` · `heroku-git` · `gate-only` (+ `docs-config` when allowlist-only) |
| `{INTEGRATION_MODEL}` | **`pr-auto-merge`** default · `direct-push` only if declared or emergency bypass |
| `{CI_OWNER}` | **`local`** = full local gate before push · `github-handoff` = cheap local subset (still babysit remote CI) |

Caps (review-fix · local push-gate-fix · PR CI fix-red): **3** each → hard-stop (`Not merged` / `Not pushed` / `Stopped — not pushed`). Never weaken gates/tests. Details: `references/profiles.md`, `integrate.md`, `deploy-verify.md`.

## Marker asymmetry (forms not interchangeable)

| Action | Required form |
| --- | --- |
| Open/publish PR | `DOTAGENTS_SHIP=1 gh pr create …` (leading env) |
| Remote `git push` | `git push … # DOTAGENTS_SHIP=1` (trailing comment — **not** leading env) |

Also never: `--no-verify`; force-push / `--force-with-lease`; `reset --hard`; blanket `git add -A`/`.`; bare PR create; auto-merge on third-party/Dependabot or PRs this run did not open; undeclared deploy; verify off-`main`; bypass prod-migration / stack-teardown guards. See `references/fleet-guards.md`.

## Loop

1. Sync with `origin/main`; classify profile / integration / CI owner (`references/profiles.md`).
2. Review via Cursor Task subagents (`references/review-roster.md`) — or docs/config allowlist skip **only** if every path qualifies. Light → Critical/Important structural/security/infra ⇒ escalate **full** before push. All lens findings follow `references/output-contract.md`. Fix verified findings in-run or stop-and-ask.
3. Stage **named paths**; commit = original intent.
4. Re-run documented local gate before push (`local` full / `github-handoff` cheap — do not invent fuller battery).
5. Integrate (`references/integrate.md`): marked push → ship-owned PR → arm auto-merge when available → babysit → fix-red within cap → merge when green (manual squash if plan-gated).
6. Post-land prove (`references/deploy-verify.md`). HTTP: `x-release-id` ≥ merge SHA (ancestor), not READY/200 alone. `gate-only` / n/a = say so.
7. Close (`references/close.md`). Clean **this** linked worktree when preconditions hold.

## References

- `references/profiles.md` · `review-roster.md` · `output-contract.md` · `integrate.md` · `deploy-verify.md` · `fleet-guards.md` · `close.md`
- `scripts/verify-x-release-id.sh` — HTTP release-id ≥ merge SHA helper
