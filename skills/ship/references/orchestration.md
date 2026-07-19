# Orchestration — Full Step-by-Step

This is the operational body of `/ship`. The skill's `SKILL.md` is the dispatcher; this file holds the deep guidance for each step.

---

## 1. Inspect changes

- Run `git status`, `git diff`, and `git diff --cached` to see all local changes.
- After fetch (step 2), `git diff --name-only origin/main...HEAD` is useful as committed-branch inventory only; step 6 defines the full review file set by unioning committed, staged, unstaged, and untracked paths.

## 2. Sync main into the working branch

The review and tests below are only meaningful against the *merged* state — local feature work on a stale base is the most common source of regressions this skill needs to catch.

- `git fetch origin main`.
- Compare: `git rev-list --left-right --count HEAD...origin/main`. If the right-side count is 0, skip this step — the working branch already contains everything on `main`.
- Otherwise the working branch is behind `main`. Decide strategy:
  - **Default: merge.** `git merge origin/main`. Preserves the current commits and produces an explicit merge commit; conflict resolution happens once across the whole tree.
  - **Rebase** is appropriate only for small (1–2 commit) topic branches that haven't been pushed anywhere. Rewrites history and replays conflicts per commit. Don't default to it.
- **Before merging**: if there are uncommitted modifications, commit them as a topic commit first so the merge isn't fighting an unstaged diff. Use a Conventional Commits message that describes the work-in-progress (e.g., `feat(<scope>): <intent>` with a short body noting "WIP — staged before merging origin/main").
- **Conflicts**: see `references/conflict-resolution.md`.
- **After merging**: run typecheck + tests (step 4) before continuing. If the merge introduced regressions in test fixtures or signatures (common when upstream changed function signatures the topic branch's mocks rely on), fix them as part of the merge resolution, not as a follow-up commit.
- Commit the merge with the default merge message — Conventional Commits doesn't apply to merge commits.

This step is the gate that makes the rest of the skill meaningful. Skip it only if the working branch is already up to date with `main`.

## 3. Load project guidelines + classify ship profile (D.1)

**Guidelines**:

- Read the project `AGENTS.md` (root of repo) and any linked guideline files it references (e.g., `.agents/rules/code-style.md`, `.agents/rules/testing.md`, etc.).
- Read any `AGENTS.md` in directories containing modified files.
- Read the active host brief / repo `AGENTS.md` for cross-project conventions (cloud: repo `AGENTS.md` + User Rules; laptop may also use host entrypoints).
- These guidelines are the standard the review is measured against.

**Repo declaration contract.** A child repo's `AGENTS.md` declares only persistent inputs the skill
cannot infer:

- `Ship profile: vercel-static | aws-sam | gate-only`
- `Integration: pr-auto-merge`
- `CI owner: local | github-handoff`
- Production URL and genuinely repo-specific deploy/live-check deltas

`docs-config` is derived from the current trivial diff, never declared as a persistent repo profile.
`direct-push` is legacy/break-glass, not a routine declaration for a new repo; it requires an
existing documented exception or an explicit emergency request from the user. Do not copy this
skill's gate, review, PR, polling, or profile procedure into every repo.

**Ship profile (`{SHIP_PROFILE}`)** — classify before review and deploy. Record for steps 6, 8, 12, and 14.

| Profile | Detect (in order) | Review tier (default) | Step 12 |
| --- | --- | --- | --- |
| **`vercel-static`** | Root `AGENTS.md` declares `ship profile: vercel-static`, **or** infer: `vercel.json` and/or Vercel Git-linked project; static Astro/Svelte/Next export; no `aws/`, no DB migration tooling | **light** | **Verify** production deploy — do **not** run manual `vercel deploy --prod` when Git integration owns production deploys on push to `main`. See `references/deploy-rules.md` → Vercel Git integration. |
| **`aws-sam`** | `AGENTS.md` declares `aws-sam`, **or** `aws/template.yaml` + fleet SAM pattern (GitHub `deploy.yml` and/or `deploy:code`) | **full** | Confirm GitHub Actions deploy (my-org fleet) or break-glass `deploy:code` (STA); surface `deploy:infra` for human when infra paths changed |
| **`gate-only`** | Pre-commit gate wired, no deploy entry (e.g. `dotagents`) | full or light by diff size | `deploy: none` |
| **`docs-config`** | Markdown/config-only diff, no runtime code | **skipped** (trivial fan-out) | Usually none |

**Detection order:**

1. Explicit declaration in repo root `AGENTS.md` (e.g. `Ship profile: vercel-static` or a `## Ship` section).
2. Otherwise infer from filesystem and scripts: presence of `aws/`, `supabase/`, `prisma/`, `npm run deploy:code`, `vercel.json`, static build output (`dist/`), etc.
3. When ambiguous, prefer the **more conservative** profile (full review + AWS deploy rules).

**Reference:** `example-learn` — Astro static build to `dist/`, Vercel Git connected, production at `https://example-learn.com`, no AWS → `vercel-static`.

**Integration model (`{INTEGRATION_MODEL}`)** — classify in step 3 alongside ship profile. Record for steps 11–14.

| Model | Detect (in order) | Step 11 |
| --- | --- | --- |
| **`pr-auto-merge`** (fleet default) | Default unless AGENTS.md declares `Integration: direct-push`; or `## Ship` mentions PR + auto-merge / CI-gated merge; or `.github/workflows/auto-merge.yml` exists | Push branch → `gh pr create` → verify auto-merge → see `references/pr-integration.md` |
| **`direct-push`** | Explicit `Integration: direct-push` in AGENTS.md | `git push origin HEAD:main` (current behavior) |

**CI owner (`{CI_OWNER}`)** — classify in step 3 with ship profile and integration model. Full detail: `references/ci-owner.md`.

| Owner | Detect | Agent responsibility |
| --- | --- | --- |
| **`local`** (fleet default) | Default unless `CI owner: github-handoff` in `## Ship` | Full local gate before push; open PR + arm auto-merge; **stop** — fire-and-forget (no CI watch, no fix-red-PR loop) |
| **`github-handoff`** | `CI owner: github-handoff` in `## Ship` (example-app only today) | Cheap local subset only; open PR + arm auto-merge; **stop** — fire-and-forget (no CI watch, no fix-red-PR loop) |

**Review tier override** — escalate to **full** fleet when the diff touches any of: `aws/`, `infra/`, IaC paths, migrations, IAM/secrets handling, auth/provider clients, or cross-cutting lib refactors — even on a `vercel-static` repo.

**Capture post-push deploy/verify rules** into `{POST_PUSH_DEPLOYS}` for step 12:

- **`vercel-static`:** production URL / custom domain, Vercel project name, optional smoke string (page title). No AWS Lambda live checks.
- **`aws-sam`:** GitHub `deploy.yml` (my-org fleet) or break-glass `deploy:code` (STA), infra trigger paths, optional live Lambda check. Distinguish **code deploy** (Actions / break-glass `deploy:code`) from **infra deploy** (`npm run deploy:infra` — human MFA, never auto-run).
- If none documented, set `{POST_PUSH_DEPLOYS}` to `none` and follow profile defaults in `references/deploy-rules.md`.

**Plan/spec lookup (D.1)**:

Locate the plan or spec the user was implementing, in this order. Plans live wherever the active harness stores them — there is no enforced repo path.

1. Most recently modified `*.md` under any harness-native plans directory within `<repo-root>`, within the current session window. Check, in order: `.cursor/plans/`, `.claude/plans/`, `.codex/plans/`, `.gemini/plans/`. Resolve `<repo-root>` via `git rev-parse --show-toplevel` from the working directory.
2. Any plan or spec path referenced explicitly in recent messages (e.g., the user pastes a path).
3. The conversation's first user message describing intent.
4. If none of the above produces content, set `{PLAN_OR_SPEC}` to the literal: `No explicit plan or spec — review against the diff and project guidelines only.`

Disambiguation: if multiple plans were modified within ~60 seconds of each other, pause and ask the user which to inject.

The located plan text becomes `{PLAN_OR_SPEC}` in the dispatch prompt at step 6 — every agent will receive it under an `## Intended outcome` heading, with instruction to flag material divergence as Critical regardless of their lens.

## 4. Smoke check — tests, types, and gate reproduction

Before investing in agent review, verify the code works:

- Run the project's test command (e.g., `npm test`, `pytest`, `go test ./...`).
- Run the type checker if applicable (e.g., `tsc --noEmit`, `mypy`, `pyright`).
- If either fails, fix the failures first before proceeding to agent review.

**Reproduce the gate locally when the change could affect it.** See `references/conflict-resolution.md` for the gate-reproduction guidance and the path-list that triggers it.

## 5. Architectural sanity check (D.2)

Before launching parallel agents, do a brief manual review of the diff for structural concerns that sub-agents aren't equipped to catch:

- **Wrong layer**: Is business logic leaking into handlers/controllers, or infrastructure concerns creeping into domain code?
- **Coupling**: Does this change introduce tight coupling between modules that were previously independent?
- **API surface**: Are new exports, endpoints, or public interfaces justified, or is this growing surface area unnecessarily?
- **Consistency**: Does the approach match how similar problems are solved elsewhere in the codebase?
- **Code-judo**: Is there a reframing that deletes branches, helpers, or layers instead of adding them?
- **File size**: Does any touched file cross or approach 1000 lines because of this diff?
- **Spaghetti growth**: New ad-hoc conditionals or feature checks bolted onto shared paths?
- **Canonical home**: Bespoke helpers where an existing utility should own this logic?

Capture the orchestrator's notes — these become `{ARCHITECTURAL_NOTES}` in the dispatch prompt at step 6 (D.2). Each agent will receive your notes and is instructed not to re-flag what's already noted, only to corroborate or deepen the analysis.

If no concerns surfaced, set `{ARCHITECTURAL_NOTES}` to:

> No architectural concerns noted by the orchestrator. The change appears to fit existing patterns and respect module boundaries.

Don't leave it blank — agents read absent context as "not provided" and may compensate with extra paranoia.

## 6. Review with parallel agents

This skill is the sole semantic gate before `main` — **right-size review depth** using `{SHIP_PROFILE}` and diff shape (see step 3).

| Review tier | When |
| --- | --- |
| **skipped** | Trivial `docs-config` diff — single-file typo, comment-only, one-value config tweak with no logic |
| **light** | Default for `vercel-static` / frontend-only when diff is non-trivial and not infra-heavy |
| **full** | Default for `aws-sam`; mandatory when diff touches infra/DB/auth/providers or review-tier override applies |

Fleet composition for **light** vs **full** is in `references/agent-fleet.md`. For fan-out, **gather full pending-change context first** (the diff alone hides file-size boundaries and cross-hunk structure). The review scope is the union of committed branch changes, staged changes, unstaged changes, and untracked files:

1. `CHANGED_FILES`: combine `git diff --name-only origin/main...HEAD`, `git diff --cached --name-only`, `git diff --name-only`, and untracked paths from `git status --short` / `git ls-files --others --exclude-standard`; de-dupe while preserving paths.
2. `DIFF`: combine `git diff origin/main...HEAD`, `git diff --cached`, and `git diff`; for untracked files, include a short `Untracked file: <path> (full content below)` marker.
3. For each path in `CHANGED_FILES`, read the **full current file** from disk with the file-read tool. Build `{FILE_CONTENTS}` as labeled sections:

   ```markdown
   ### path/to/file.ts (1234 lines)
   <full file body>
   ```

   - Deleted paths: `(deleted in this diff)`
   - Binary or unreadable: `(binary — skipped)`
   - Do not truncate — `code-quality-reviewer` needs accurate line counts for the 1k-line rule.

Then launch parallel agents simultaneously per the selected **review tier**. Fleet composition is documented in `references/agent-fleet.md`.

Each agent receives the dispatch prompt template from `references/dispatch-prompt.md` with these placeholders filled in:

| Placeholder | Source |
| --- | --- |
| `{SHIP_PROFILE}` | Classified in step 3 |
| `{REVIEW_TIER}` | `light` / `full` / `skipped` |
| `{PLAN_OR_SPEC}` | Located in step 3 (D.1) |
| `{ARCHITECTURAL_NOTES}` | Notes from step 5 (D.2) |
| `{GUIDELINES}` | Guidelines content from step 3 |
| `{CHANGED_FILES}` | Union of committed branch, staged, unstaged, and untracked paths |
| `{FILE_CONTENTS}` | Full bodies gathered above |
| `{DIFF}` | Combined committed branch, staged, and unstaged diffs, plus untracked markers |

Expect **5–7** Task calls for **light** tier, **11–12** for **full**, plus `confidence-scorer` in step 7.

Each agent returns findings in the canonical contract format (see `references/output-contract.md`): Critical/Important/Minor + verdict line + ≤10 findings.

## 7. Adjudicate findings with `confidence-scorer`

Collect every finding from step 6 (including architectural concerns from step 5). For each Critical or Important finding, invoke `confidence-scorer` in a fresh sub-agent call with only:

- The finding text and asserted severity.
- The relevant file excerpt.
- The diff hunk.

Do NOT include the originating agent name or its reasoning — independence is the design.

The scorer returns one of:

- **Confirm Critical** — keep as Critical.
- **Confirm Important** — keep as Important.
- **Downgrade to Important** — move from Critical to Important bucket.
- **Downgrade to Minor** — drop from the report.
- **False positive** — drop from the report.

Drop all Minor findings from the report before scoring (the scorer doesn't see them at all). Also drop findings catchable by tooling (Biome, tsc, test suite) even if they're confirmed — the step-11 gate will surface those.

Run scorer calls in parallel where possible — one Task call per finding, never batched (batching lets earlier scores anchor later ones). After scoring, dedupe surviving findings by `(file, line, issue)` — agents with adjacent lenses naturally produce overlapping findings.

### Review discipline (post-scoring)

Treat review output as advisory. Never blindly apply a finding just because it survived scoring.

For each surviving Critical or Important finding, the orchestrator must verify each surviving finding before presenting or fixing:

1. Read the real code path and adjacent code — not just the diff hunk or the agent's excerpt.
2. When the finding depends on external behavior (library API, framework contract, upstream type), inspect dependency docs, source, or types before accepting or rejecting it.
3. Reject unrealistic edge cases, speculative risks, broad rewrites, and fixes that over-complicate the codebase.
4. Prefer small fixes at the right ownership boundary; no refactor unless it clearly improves the bug class.

Record rejected findings with a brief reason — they feed the step-14 review disposition.

## 8. Present verdict + findings (E.1, E.2)

**Pre-push review verdict** — use at step 8 only, before commit/push. Do **not** reuse this wording in the final summary after a successful ship (see step 14).

**Verdict line first** (E.1):

```text
**Review verdict: <Ready to push / Needs attention / Needs work>**
Ship profile: <vercel-static|aws-sam|gate-only|docs-config> · Review tier: <light|full|skipped>
<one-sentence reasoning>
```

Verdict thresholds:

- Any post-scoring Critical surviving → **Needs work**
- Any post-scoring Important surviving → **Needs attention**
- Otherwise → **Ready to push**

If the verdict is **Needs work** or **Needs attention**, stop after presenting findings — do not commit or push until issues are fixed (step 9) and the verdict is **Ready to push**.

**TL;DR paragraph** (E.2):

A 2–3 sentence summary: *"3 critical issues across `auth/handlers.ts:42` and `db/migrate.sql:18`; 2 important suggestions; tests pass; ready for fix-and-retry."* This is the headline — the user reads this first.

**Findings list** — group by severity (Critical / Important / Minor), retaining the per-finding 4-field shape. When merging across agents, surface structural/maintainability findings from `code-quality-reviewer` before tactical nits — same priority order that agent uses internally:

- **File:line**
- **What**
- **Why it matters**
- **Fix**

Surface architectural notes from step 5 alongside the agent findings.

## 9. Fix issues + re-smoke (D.3)

- Fix all **verified Critical** issues and reasonable **verified Important** issues. Explain each fix.
- Skip suggestions that are debatable or require refactoring beyond scope — note why in the review disposition.
- **Sibling-instance sweep:** when an accepted finding reveals a bug class or repeated pattern, inspect the current changed scope for sibling instances before fixing. Fix the scoped bug class at once when practical; stop at touched surfaces, owner boundaries, and clear follow-up territory.
- **Re-run smoke checks (step 4) after any review-triggered fix** before committing. Fixes themselves can break things — especially refactor-style fixes that touch multiple call sites. No commit without green smoke.
- **Re-review after review-triggered code changes:** if any review-triggered fix changed code, rerun focused smoke checks and rerun step 6 + 7 until no accepted/actionable Critical or reasonable Important findings remain. **Scope the re-review to the fix:** re-run only the agents whose lens covers the changed lines (e.g. `bug-scanner` for a logic fix, `security-scanner` for an auth fix) — do a full re-fan-out only when the fix was structural, security-sensitive, or touched many call sites. Do not rerun the full fleet solely to get a cleaner "clean" line once verified findings are resolved.
- Do not invoke nested review helpers, panels, or sub-reviewers from inside reviewer agents — the orchestrator owns the review loop.

**Loop bound**: 3 cycles total (matches the existing fix-loop bound). On the 4th, surface the failure to the user and stop. Don't push with unresolved Critical findings.

## 10. Stage and commit

- Stage changes by name (avoid `git add -A` if secrets or binaries may be present).
- Commit with a Conventional Commits message: `type(scope): summary` (under ~72 chars).
- The message should describe the **original intent**, not the review fixes.
- Examples: `feat(prefs): add timezone fetch and mismatch banner`, `fix(api): validate timezone before update`

## 11. Run the gate, then integrate

**The skill runs the gate explicitly here** — do not rely on shell guards or assume hooks will catch bad git commands. The pre-commit hook already ran at commit time; `/ship` must still re-run the gate before push (a `git commit -n` bypass or a dirty partial-stage can leave the tree ungated).

1. Run the repo's local quality battery — **`{CI_OWNER}` = `local`:** full gate (e.g. `npm test && npm run check:ts && npm run check:biome`, or the repo's documented gate). **`{CI_OWNER}` = `github-handoff`:** only the cheap local subset documented in repo `AGENTS.md` (lint/types/static — not unit/E2E; those run in GitHub CI).
2. Any failure in what you ran: fix and re-run. Never push with a failing local gate.

### `{INTEGRATION_MODEL}` = `pr-auto-merge` (default)

Follow **`references/pr-integration.md`** §11:

- Ensure on a feature branch (create from `origin/main` if on `main`).
- `git push -u origin HEAD` — never `HEAD:main`.
- `gh pr create` (or use existing PR for branch).
- `gh pr edit --add-label ship-auto-merge` then `gh pr merge --auto --squash` (orchestrated PRs only).
- Verify auto-merge armed (`gh pr view --json autoMergeRequest`).

When **`{CI_OWNER}` = `github-handoff`**, **stop after this subsection** — steps 12–13 are skipped. Step 14: **`PR opened — GitHub CI handoff`**.

Cap push-fix at 3 cycles (local gate only — not post-PR CI fixes when `github-handoff`).

### `{INTEGRATION_MODEL}` = `direct-push`

The destination is always `main`. The current branch name doesn't matter — the goal is to advance `main` to the current HEAD.

- `git push origin HEAD:main`. Never `--no-verify`.
- If the remote rejects the push as non-fast-forward, re-run step 2 against fresh `origin/main`, re-run the gate, push again.
- If the **local gate** rejects before push, read the output, fix, re-run the gate, push again. Cap at 3 cycles.

## 12. Deploy or verify (branch on `{SHIP_PROFILE}` and `{INTEGRATION_MODEL}`)

Step 12 is **profile-specific**. Read `references/deploy-rules.md` first. When `{INTEGRATION_MODEL}` is `pr-auto-merge`, **skip step 12 entirely** (fire-and-forget — merge, deploy, and verification happen out-of-session) unless the user explicitly asks to babysit; see `references/pr-integration.md` §12. The profile subsections below apply to `direct-push` ships and explicit babysit requests.

### `vercel-static`

Production deploys are usually triggered by **merge to `main`** — step 12 is **verification**, not invocation.

1. Confirm integration landed on `main` (merged PR or direct push).
2. Wait for / confirm production deployment reached **READY** (Vercel dashboard, Vercel MCP/API, or `vercel inspect` — do not run `vercel deploy --prod` unless the repo documents it as the deploy entry or Git integration is absent).
3. HTTP **200** on production URL / custom domain (e.g. `curl -sf -o /dev/null -w '%{http_code}' https://example-learn.com`).
4. Optional smoke: page title or key UI string matches expected app.
5. Record `deploy: auto (Vercel Git)` or `deploy: verified at <url>`.
6. Do **not** run AWS Lambda live checks for this profile.

Manual `npx vercel --prod` is **fallback only** when `{POST_PUSH_DEPLOYS}` or AGENTS.md documents it as the deploy entry.

### `aws-sam`

my-org SAM fleet (shared-infra, todoist-backlog-scheduler, misc-notifications, personal-memory) and example-app deploy code via **GitHub Actions** (`.github/workflows/deploy.yml`) after merge — do **not** run local `deploy:code` on PR ships. Local `deploy:code` is **break-glass only** where AGENTS.md still documents it (example-app).

1. Confirm the GitHub Deploy workflow (or break-glass local entry) after push/merge lands when babysitting.
2. Watch for success signal (workflow green, Lambda updated).
3. **Infra deploy** (`npm run deploy:infra`) — **never auto-run**; surface for human when infra paths changed.
4. Post-deploy live verification when diff affects external providers (Lambda invoke, etc.) — see `deploy-rules.md`.
5. Record `deploy: Actions succeeded` / `deploy:code succeeded` (break-glass) / `deploy: failed (fixed and re-run)`.

### `gate-only` / `docs-config`

Record `deploy: none`. Proceed to step 13.

### Record for step 14

Note deploy/verify outcome. If verification/deploy could not be brought to green, the final summary must lead with that, not `PR merged to main` / `Shipped to main`.

## 13. Confirm integration landed

### `{INTEGRATION_MODEL}` = `pr-auto-merge`

When **`{CI_OWNER}` = `github-handoff`:** skip — integration confirmation is not the agent's job; handoff completed at step 11.

When **`{CI_OWNER}` = `local`:** follow `references/pr-integration.md` §13:

- Fetch `origin/main`; when merged, confirm shipped SHA is reachable from `origin/main`.
- Record `CI: GitHub Actions (<required check>)` when checks ran on PR/`main`.
- If PR still open: record pending state — do not claim merged.

### `{INTEGRATION_MODEL}` = `direct-push`

There is no cloud CI to watch unless the repo added GitHub Actions. The pre-commit hook gated each commit, and step 11 re-ran the gate before push — a push that lands is a gate that passed. Record `CI: none (local gate)` for the step-14 summary.

Do not weaken any check to force a green push.

## 14. Final user summary (E.3)

After steps 10–13 complete, send **one closing message** to the user. This is separate from the step-8 review verdict — the user should never finish the skill wondering whether the push happened.

**Lead with outcome, not review status:**

| Outcome | Opening line |
| --- | --- |
| PR merged + deploy OK | **`PR merged to main`** — PR URL, SHA, `Ship profile`, `Review tier`, deploy outcome, `CI: GitHub Actions` |
| PR open, auto-merge queued | **`PR open — auto-merge pending CI`** — PR URL, check status |
| PR open, GitHub CI handoff | **`PR opened — GitHub CI handoff`** — PR URL, auto-merge armed or not; CI runs in GitHub (~12 min on example-app) |
| PR CI failed | **`Not merged`** — which check failed |
| Full success (direct-push, Vercel verified) | **`Shipped to main`** — SHA, `Ship profile: vercel-static`, `Review tier: light`, `deploy: verified at https://…`, `CI: none (local gate)` |
| Full success (direct-push, AWS deploy) | **`Shipped to main`** — SHA, `Ship profile: aws-sam`, `Review tier: full`, `deploy:code succeeded`, `CI: none (local gate)` |
| Direct-push OK, gate-only | **`Shipped to main`** — `deploy: none`, `CI: none (local gate)` |
| Push OK, deploy/verify failed | **`Merged/Pushed — deploy/verify failed`** — runtime stale; what failed |
| Gate failed or push rejected | **`Not pushed`** / **`Not merged`** — which check failed |
| Stopped on findings | **`Stopped — not pushed`** — reference step-8 verdict |

Include in every successful summary: **`Ship profile`**, **`Review tier: light|full|skipped`**, **`Integration model`**, **`CI owner`**, deploy/verify outcome (or "handoff" when `github-handoff`), CI line.

Then: TL;DR of the change, gate checks run (tests / lint / the pre-commit gate battery), deploy outcome, `CI: none (local gate)`, worktree cleanup outcome (step 15), and unresolved Important findings if you pushed despite them (should be rare).

**Review disposition** — one compact line after the outcome summary:

```text
Review: <N> accepted/fixed, <M> rejected (<brief reason>), <K> Important deferred
```

Examples: `Review: 2 accepted/fixed, 1 rejected (speculative race — no concurrent caller)`, `Review: 0 findings — clean`.

**Do not** end a successful run with **"Ready to push"** or **"Review verdict: Ready to push"** — that language belongs to the step-8 review verdict only and reads as if nothing landed on the remote.

## 15. Clean up worktree (sessions that used `/worktree`)

Many tasks land via **`/worktree`** + **`/ship`**: the worktree is a disposable checkout; once the commit is on `origin/main`, keeping it around confuses “what’s done” vs “what’s still local.” **Default: remove the worktree after a successful ship** — don’t leave cleanup as an optional footnote the user has to remember.

### Detect

Step 15 applies when the ship ran from a **linked worktree** — `WORKTREE_PATH` ≠ the repo's primary checkout. This covers both harness-created worktrees (`~/.cursor/worktrees/`, `.claude/worktrees/`) and manual `git worktree add` checkouts (e.g. `~/code/.worktrees/<repo>/<name>/`); `git worktree list` shows them all, and the primary checkout is the one whose path holds a `.git` **directory** rather than a `.git` file. Ships from the **primary checkout** skip this step entirely.

**Trigger timing depends on the integration path:**

- **PR paths (both CI owners)** — cleanup runs **at PR creation** (end of step 11), gated on "branch pushed + worktree clean," **not** merge. Every PR ship is fire-and-forget (user decision 2026-06-30): merge happens out-of-session and no one forward-fixes red CI in-session, so deferring to merge orphans the worktree permanently. Use the PR-path override below instead of the merge-gated preconditions.
- **`direct-push`** — cleanup runs after the push lands (the push *is* the integration; the merge-gated preconditions below pass immediately).

### Preconditions (all must pass before removal)

1. **Integration succeeded** — step 11 completed without rejection; for PR path, merge landed on `origin/main` (or user explicitly chose break-glass bypass).
2. **Commit is on remote `main`** — `git fetch origin main`, then confirm the shipped SHA is reachable from `origin/main` (`git merge-base --is-ancestor <sha> origin/main`).
3. **Worktree is clean** — from `WORKTREE_PATH`, `git status --short` is empty (no uncommitted or unstaged changes).
4. **No session-local stashes** holding unpushed work tied to this task (if the agent created a stash during conflict resolution, pop/apply or drop only after confirming its contents are on `main`).

### PR-path override (cleanup at PR creation)

For PR ships (both CI owners), replace preconditions 1–2 with the **pushed-not-merged** gate — run cleanup at the end of step 11, right after the PR is open and auto-merge is armed (or noted plan-gated):

1. **PR opened + branch pushed** — `git push -u origin HEAD` succeeded and `gh pr create` returned a URL (auto-merge armed is expected but not required; an un-armable PR still has its commits safe on `origin`).
2. **Worktree is clean** — from `WORKTREE_PATH`, `git status --short` is empty. This stays load-bearing: a worktree sitting at a pushed SHA can still hold an *unrelated* uncommitted change — never remove a dirty worktree.
3. **No session-local stashes** (same as precondition 4 above).

Do **not** wait for `git merge-base --is-ancestor <sha> origin/main` — it will be false in-session and is the wrong gate here. The branch ref persists on `origin` independent of the local worktree; if a background agent needs to forward-fix red CI, it re-checks-out the branch into a fresh worktree. Leave the **local branch ref** in place (the open PR points at `origin/<branch>`; deleting the local branch is harmless but unnecessary — do not delete it while the PR is open).

To clean up: `cd` to the primary checkout (its `main`), then `git worktree remove <WORKTREE_PATH>` (never `--force` on a dirty tree). Then emit the step-14 handoff summary with `Worktree: removed <name>`.

**Do not** sweep *other* sessions' orphaned worktrees during a ship — only remove the one this ship ran from. A pile of pre-existing orphans is a separate, user-initiated sweep (each may hold uncommitted background work).

### Defer cleanup when

- Verdict was **`Not pushed`** or **`Stopped — not pushed`**
- Push landed but deploy/verify failed and a forward-fix will happen **in the same worktree**
- Working tree is dirty (uncommitted changes — applies to **both** CI owners)
- **`direct-push`** and the pushed SHA is **not** on `origin/main` yet (does **not** apply to PR ships — see override above; there, "pushed" is the gate, not "merged")
- User explicitly asked to keep the worktree

When deferring, say **`Worktree: kept (<reason>)`** and remind the user they can run **`/delete-worktree`** later.

### How to clean up (preferred order)

1. **One-line confirmation to the user:** changes are on `main` at `<sha>`; the worktree is safe to remove.
2. **Run `/delete-worktree`** for this session’s `WORKTREE_ID` (harness command — it owns the remove/prune script). Do this **in the same turn** as the step-14 summary when preconditions pass — don’t only suggest it.
3. If `/delete-worktree` is unavailable, equivalent manual steps from `WORKTREE_PATH`:
   - `git worktree remove <WORKTREE_PATH>` (only when clean; never `--force` unless the user explicitly requests it)
   - Delete the worktree-only branch if one was created and is fully merged: `git branch -d <branch>`
   - Prune empty parent dir under `~/.cursor/worktrees/<WORKTREE_ID>/` if nothing else uses that id
4. Clear the chat’s `workspace → REPO_ROOT → WORKTREE_PATH` mapping after successful removal.

### Step-14 summary line

Always include one of:

```text
Worktree: removed <WORKTREE_ID> (<WORKTREE_PATH>)
Worktree: kept (<reason>)
Worktree: n/a (primary checkout)
```

Examples: `Worktree: removed api-tier-reorg-512e358e`, `Worktree: kept (dirty tree — uncommitted test fixes)`, `Worktree: n/a (primary checkout)`.
