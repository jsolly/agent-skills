# CI owner (`{CI_OWNER}`)

Classify in orchestration **step 3** alongside `{SHIP_PROFILE}` and `{INTEGRATION_MODEL}`. Record in the step-8 verdict and step-14 summary.

Two models — **most fleet repos are `local`**; **example-app is the only `github-handoff` repo today**.

**There is no fire-and-forget canon.** After the PR opens, `/ship` always watches CI and fixes red checks (cap 3), then merges when green. `{CI_OWNER}` controls only **how much of the battery runs locally before push** — not whether to babysit or merge.

## `local` (fleet default)

**Who owns the pre-push battery:** the agent on the laptop (full gate).

- Run the **full local gate** before push (pre-commit hook battery and/or repo `AGENTS.md` commands — tests, lint, build, typecheck). The pre-commit hook already ran at commit; `/ship` re-runs the gate explicitly.
- On **`pr-auto-merge`:** open the PR, arm auto-merge (or note plan-gated), then **babysit** GitHub **`CI / ci`** until green — fix forward on the branch if checks fail (cap 3 cycles), merge when green (auto-merge, or `gh pr merge --squash` when plan-gated), then verify post-merge deploy when applicable. Worktree cleanup waits until merge (orchestration step 15).
- On **`direct-push`:** the push that lands **is** the CI (`CI: none (local gate)`).

**Detect:** default when `## Ship` omits `CI owner:` or declares `CI owner: local`.

**Fleet examples:** `dotagents`, `example-learn`, `my-org-website`, `checkboxes`, `awesome-django-blog`.

## `github-handoff`

**Who owns the heavy tests:** GitHub Actions (local gate is cheap only).

- Local gate subset is **cheap only** (lint, types, static checks — whatever the repo documents). Unit tests, E2E, DB-backed tests, and full build run in GitHub CI only.
- CI is **slow** (example-app ~12 minutes) — still babysit: watch with `gh pr checks --watch`, fix red checks, merge when green (same as `local`). Budget session time accordingly.
- Worktree cleanup waits until merge (orchestration step 15), same as `local`.

**Detect:** `CI owner: github-handoff` in root `AGENTS.md` `## Ship`.

**Fleet example:** example-app only (as of fleet migration).

## Interaction with `{INTEGRATION_MODEL}`

| Integration | `local` | `github-handoff` |
| --- | --- | --- |
| `pr-auto-merge` | Full gate → PR → babysit CI → merge → deploy verify | Cheap local subset → PR → babysit CI → merge → deploy verify |
| `direct-push` | Gate → push → deploy verify | Rare; cheap subset then push; babysit `main` CI if Actions run |

## Repo declaration (copy into `## Ship`)

**Most repos:**

```markdown
**CI owner: local.** Agent runs the full local gate before push; `/ship` babysits GitHub CI on the PR until merge (watch failures and fix forward).
```

**GitHub owns the heavy battery (example-app pattern):**

```markdown
**CI owner: github-handoff.** GitHub Actions owns the full test battery (~12 min). Local gate subset is lint/types/static only. After `/ship` opens the PR, still babysit CI until merge (watch failures and fix forward).
```
