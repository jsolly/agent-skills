---
description: Require tracked change-making work in a topic-branch worktree off main
alwaysApply: true
---

# Worktree Authoring (fleet standard)

**Change-making work happens in a git worktree, off `main`.** Any task or skill that edits files in a
repo authors in a worktree on a topic branch — never in the primary checkout sitting on the `main`
branch. Read-only work (analysis, research, answering a question) needs no worktree.

**Scope: tracked files.** Worktree-first governs changes that ride `/ship` to the remote. A
**gitignored** target is machine-local state, not authored change — editing `.env.local`, writing the
agent-memory corpus (`$AGENT_CONFIG_ROOT/memory/`, gitignored), or dropping a scratch file is fine on a
`main` checkout with no worktree.

This is a **prescription**, not a suggestion — and it is **enforced** by the `block-edit-on-main`
guard (`guards/block-edit-on-main.sh`, wired in all three tools per `host machine setup docs`
§5/§5b): it denies any Write/Edit/apply_patch/shell-redirect whose target lands on a `main` checkout,
fails open on topic branches/worktrees/non-repos, and exempts gitignored targets via
`git check-ignore` (the tracked-files scope above, mechanized). dotagents used to leave the
worktree-vs-branch choice entirely harness-owned; it now standardizes on worktree-first authoring.
What stays harness-owned is the *mechanism* (below), not *whether* you isolate.

## Why

- **The primary checkout holds other work.** It may carry background edits, another agent's
  in-flight branch, or an un-pushed state. Authoring there risks entangling unrelated changes and
  leaves a dirty tree that other tooling (and `/ship`) misreads. A worktree is a clean, disposable
  room.
- **`main` must stay pristine.** Fleet integration is **branch → PR → CI-gated auto-merge** (`/ship`).
  Editing directly on `main` skips the review gate and there's no topic branch for the PR.
- **Deploying from `main` gets blocked.** The fleet's Vercel projects attribute a from-`main` deploy
  to the GitHub commit author and reject it ("git author must be a team member"); a topic-branch
  deploy carries generic attribution and goes through. Authoring in a worktree topic branch is what
  makes `/ship`'s deploy clean. (See the `vercel-deploy-from-main` history.)

## Mechanism stays harness-owned

dotagents prescribes *that* you author in a worktree, not the low-level plumbing:

- **The agent/harness creates and locates the worktree.** *Creating* one is mandatory for
  change-making work; *where* it lives is the agent's choice (Claude Code's default is
  `.claude/worktrees/<name>/` inside the repo; `~/code/.worktrees/<repo>/<name>/` is a common
  fleet location from earlier tooling — both work). Don't hard-code a location in scripts or docs.
- **A manual `git worktree add` auto-provisions** via the committed `.git-hooks/post-checkout` in
  repos that ship one — you don't hand-run setup.
- **The child repo owns what its worktree needs** before test/deploy (`.worktreeinclude`,
  `worktree:provision` scripts, env, `npm ci`, DB seed). Read the repo's own `AGENTS.md`; dotagents
  doesn't ship those provisioning hooks.

## Lifecycle

- **Author** the change in the worktree; run the repo's checks there.
- **Integrate** via `/ship` — it pushes the topic branch, opens the PR, and gates on CI. Never
  `git push origin HEAD:main` from a worktree to integrate (break-glass only on branch-protected
  repos).
- **Clean up** only the worktree *this* task created, and only once its work is pushed and the tree
  is clean — never remove a worktree holding another task's dirty state. `/ship` handles this at the
  end of a task.

## For skills

A skill whose changes **integrate via `/ship`** (branch → PR → merge) states, near its top: *author
in a worktree off `main` (see `rules/worktree-authoring.md`)*. It does not re-explain the mechanism —
this rule is the single source. Carriers today: `refactor`, `seo`, `shared-infra-integration`,
`optimize-workspace` (and its `/memory-to-config` redirect), and `ship` (the integrator itself).

Two classes edit repo files but do **not** carry the pointer, because they isolate through their own
mechanism and don't integrate via `/ship`:

- **Existing-branch operators (partly)** — `janitor` is a hybrid. Its **PR arm** works on
  already-pushed PR branches (Dependabot/self PRs) and merges them directly, using a worktree for
  conflict resolution and major-upgrade prep on the PR branch — no `/ship`, no new work off `main`. Its **issue arm**, though, *does* author
  new work off `main` and integrate via `/ship` (implement in a worktree → `/ship` → merge the
  resulting PR); it references this rule inline where it authors, rather than carrying a single
  top-of-file pointer, because only that one arm authors. Don't "fix" it into a plain carrier or a
  plain existing-branch operator — it is both.
- **MCP / data-dump tasks** — the `ingest-private-data` skill writes to the personal-memory MCP store
  and delete gitignored input files; there's no `/ship`-integrated source change.

Pure-conversation skills (brainstorming, grilling, research, handoff summaries) make no edits and
carry no such line.
