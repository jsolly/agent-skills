# CI owner (`{CI_OWNER}`)

Classify in orchestration **step 3** alongside `{SHIP_PROFILE}` and `{INTEGRATION_MODEL}`. Record in the step-8 verdict and step-14 summary.

Two models — **most fleet repos are `local`**; **example-app is the only `github-handoff` repo today**.

## `local` (fleet default)

**Who owns CI:** the agent runs the full battery locally before the push; after the PR opens, nobody in-session.

- Run the **full local gate** before push (pre-commit hook battery and/or repo `AGENTS.md` commands — tests, lint, build, typecheck). The pre-commit hook already ran at commit; `/ship` re-runs the gate explicitly.
- On **`pr-auto-merge`:** open the PR, arm auto-merge, then **stop — fire-and-forget** (user decision 2026-06-30): do not watch CI, poll checks, re-push to fix red checks, or babysit merge/post-merge deploy — assume a background agent or a later `/janitor` pass lands failing PRs. Where auto-merge can't arm (plan-gated on private Free repos, e.g. `dotagents` — `gh pr merge --auto` fails with `enablePullRequestAutoMerge`; expected, not an error), still stop: note `auto-merge: unavailable (plan-gated)` and the PR waits for the user or a `/janitor` pass. Worktree cleanup fires at PR creation (orchestration step 15), same as `github-handoff`.
- On **`direct-push`:** the push that lands **is** the CI (`CI: none (local gate)`).

**Detect:** default when `## Ship` omits `CI owner:` or declares `CI owner: local`.

**Fleet examples:** `dotagents`, `example-learn`, `my-org-website`, `checkboxes`.

## `github-handoff`

**Who owns CI:** GitHub Actions after the PR is opened — not the agent session.

- Local gate subset is **cheap only** (lint, types, static checks — whatever the repo documents). Unit tests, E2E, DB-backed tests, and full build run in GitHub CI only.
- CI is **slow** (example-app ~12 minutes) — waiting in-session is wasteful.
- After step 11 (branch pushed, PR opened, `ship-auto-merge` label + auto-merge armed): **stop**. Fire-and-forget.
- **Do not:** `gh pr checks --watch`, poll CI, re-push to fix red checks, babysit merge, or babysit post-merge deploy — unless the user explicitly asks in this session.
- **Worktree cleanup fires at PR creation, not merge.** If the ship ran from a linked worktree (not the primary checkout), `cd` back to the primary checkout's `main` and remove the worktree as soon as the PR is open + branch pushed — see orchestration **step 15**. Rationale: the branch is safe on `origin` the moment the PR exists, and no PR ship forward-fixes red CI in-session (fire-and-forget), so there is nothing to keep the worktree around for. Waiting for merge would orphan the worktree forever, since merge happens out-of-session.
- Step 14: **`PR opened — GitHub CI handoff`** — PR URL, auto-merge armed or not. Do not claim merged. Add `Worktree: removed <name>` when cleanup ran.

**Detect:** `CI owner: github-handoff` in root `AGENTS.md` `## Ship`.

**Fleet example:** example-app only (as of fleet migration).

## Interaction with `{INTEGRATION_MODEL}`

| Integration | `local` | `github-handoff` |
| --- | --- | --- |
| `pr-auto-merge` | Full gate locally → PR → **hand off** | Cheap local subset → PR → **hand off** |
| `direct-push` | Gate locally → push → deploy verify | Rare; still run cheap local subset; do not babysit `main` CI unless user asks |

## Repo declaration (copy into `## Ship`)

**Most repos:**

```markdown
**CI owner: local.** Agent runs the full local gate before push; after the PR opens, stop — do not watch or fix PR CI in-session.
```

**GitHub CI handoff (example-app pattern):**

```markdown
**CI owner: github-handoff.** GitHub Actions owns the full test battery (~12 min). Local gate subset is lint/types/static only. After `/ship` opens the PR and arms auto-merge, stop — do not watch or fix CI to force merge.
```
