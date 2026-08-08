---
name: ship
description: Use when the user asks to push changes, says `/ship`, asks to open/create/publish/file a PR or pull request, asks for "review and push" / "commit and push" / "ship it" / "push and fix CI until green", or otherwise indicates they're ready to integrate local work to `main`. Do NOT invoke for routine in-flight commits, or for inspecting/merging an already-open PR (`gh pr view`/`merge` — e.g. `/janitor`). PR publish is owned by this skill — never bare `gh pr create` outside it.
---

# Ship — review, gate, integrate to main

Sole fleet path that reviews, gates, integrates, babysits CI, and verifies deploy. Grind to a **terminal shipped/failed state** in one run. Zero agent-owned followups on success. Unbounded human decisions → stop-and-ask (or hard-fail at a cycle cap) — never ship with leftovers.

**Not success:** “PR created,” “LGTM,” “ready to push,” or ending mid-babysit as **`PR open — auto-merge pending CI`**. That in-progress line is valid only while still watching in-session.

## Fleet facts (do not invent)

Read repo root `AGENTS.md` `## Ship` (and linked rules). Classify once, then follow profile behavior:

| Variable | Fleet defaults / values |
| --- | --- |
| `{SHIP_PROFILE}` | `vercel-static` · `aws-sam` · `heroku-git` · `gate-only` (plus derived `docs-config` when allowlist-only) |
| `{INTEGRATION_MODEL}` | **`pr-auto-merge`** (default) · `direct-push` only if AGENTS.md declares it or user demands emergency bypass |
| `{CI_OWNER}` | **`local`** (full local gate before push) · `github-handoff` (cheap local subset only — still babysit remote CI) |

Details: `references/profiles.md`, `references/deploy-verify.md`, `references/integrate.md`.

## Loop (ends, not a rigid step script)

1. **Sync** working branch with `origin/main`; resolve conflicts; smoke (tests/types as applicable).
2. **Classify** profile / integration / CI owner; capture production URL + deploy/live-check deltas from AGENTS.md.
3. **Semantic review** at right-sized depth — or skip fan-out **only** when every changed path matches the docs/config allowlist (`references/profiles.md`). Any code/logic path forces review; no “looks trivial” skip. If light review surfaces Critical/Important structural, security, or infra findings → escalate to full-depth before push.
4. **Fix verified findings in-run** (Critical / Important / bounded Minors) or reject with reason; unbounded redesign / user-spec conflict → stop-and-ask. Cap review-fix at **3** cycles.
5. **Stage by name** (never `git add -A` / `git add .`); commit describing **original intent**, not review choreography.
6. **Re-run the documented local gate** explicitly before push (`local` = full; `github-handoff` = cheap subset only — do not invent a fuller battery). Cap local push-gate-fix at **3**. Never `--no-verify`, never weaken the gate.
7. **Integrate** — default PR path (`references/integrate.md`): marked push → ship-owned PR create → arm auto-merge when available (never on third-party/Dependabot) → babysit required checks → fix-red (cap **3**) → merge when green (manual squash if plan-gated). Direct-push only when authorized.
8. **Post-land prove** per profile (`references/deploy-verify.md`). HTTP apps: `x-release-id` ≥ merge SHA (ancestor), not READY/200 alone. Missing / `dev` / dirty / behind = fail.
9. **Close** with a contract terminal (`references/close.md`). Clean up **this** linked worktree when preconditions hold.

## Hard safety (non-negotiable)

Marker asymmetry is guard-required — **forms are not interchangeable**:

| Action | Required form |
| --- | --- |
| Open/publish PR | Leading env: `DOTAGENTS_SHIP=1 gh pr create …` (bare create is denied) |
| Remote `git push` (branch, fix-red, direct-push) | Trailing comment: `git push … # DOTAGENTS_SHIP=1` (do **not** use leading env for push) |

Also never: `--no-verify`; `git push --force` / `--force-with-lease`; `git reset --hard`; blanket staging; auto `deploy:infra` / admin-MFA stack deploys; improvising undeclared deploy commands; working around prod-DB-migration / stack-teardown guards; deploying a branch state not on `main`; arming auto-merge on PRs this run did not open.

Full guard model: `references/fleet-guards.md`.

## Terminal outcomes (lead line)

| Lead | When |
| --- | --- |
| **`PR merged to main`** | PR path; required CI green; merge landed; profile deploy/verify OK (or explicit n/a) |
| **`Shipped to main`** | Direct-push / break-glass only — never for the PR path |
| **`Merged/Pushed — deploy/verify failed`** | Landed on `main`, runtime/deploy/live proof failed |
| **`Not merged`** / **`Not pushed`** / **`Stopped — not pushed`** | Cap exhaustion, unresolved verified Critical/Important, or stop-and-ask |

Successful close includes: ship profile, review depth/disposition, integration model, CI owner, deploy/verify line, CI line, worktree line. See `references/close.md`.

## References

- `references/profiles.md` — classification, docs allowlist, review depth / escalation
- `references/integrate.md` — PR create/push markers, CI babysit, merge, cycle caps
- `references/deploy-verify.md` — per-profile post-land proof + release-id ancestry
- `references/fleet-guards.md` — ship markers + git discipline vs shell guards
- `references/close.md` — terminals, summary fields, worktree cleanup
- `scripts/verify-x-release-id.sh` — optional poll helper for HTTP release-id ≥ merge SHA
