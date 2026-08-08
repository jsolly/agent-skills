---
name: start-feature
description: Use when the user says `/start-feature`, or asks to start a new feature room / spin up a worktree with the local app running — prepare a Gauntlet Loop–ready feature session (outcome goal, inspectable quality bar, loop charter, live progress stub) in isolated topic-branch worktree with agent root moved there, and when the repo has UI, documented local server + browser from that tree. NOT for verifying UI after a change (`/verify-ui`), integrating to main (`/ship`), or continuing work already inside a feature worktree.
---

# Start Feature

**Product:** a truthful **Gauntlet Loop–ready** feature session for a named goal — then **stop at prepare**.

Isolation (worktree, agent-root move, local server, browser) is means when UI applies. A worktree alone is not success. Do not implement, commit, run builder/critic rounds, `/verify-ui`, or `/ship` unless the user explicitly continues past prepare.

Public method: [Gauntlet Loop](https://somethingbig.ai/gauntlet-loop). Session law below is binding; do not re-derive a weaker variant.

## Product gate (every `ready` claim)

All five required; omit any → fail closed, no ready:

1. **Goal** — outcome destination from invoke arg or one focused ask. Not architecture, workstreams, or sprint plans. Reject empty/generic ("improve the app", `feat/feature`).
2. **Bar** — concrete critic-inspectable comparison (reference product/pages, tests, latency, security checks, viewport/console criteria). Slogans ("perfect", "AAA", "production-ready", "amazing", "fast") are not a bar. If user gave none or only slogans: one focused ask **or** record an explicit **find-the-bar** mandate (same role Call of Duty screenshots played for Claude of Duty) — never invent a fake user-supplied bar.
3. **Loop charter** — durable note in the isolation (and summarized in the receipt) binding later work to:
   - Lead decomposes into smallest independently judged pieces (lead chooses pieces; user architecture ideas are optional context, not the goal).
   - **Builder ≠ critic** — fresh critic context; no planned self-grading; critics judge real artifacts (pixels/tests/running product), blind A/B when possible — never builder summaries.
   - **Keep looping** until bar met or user stops — no fixed round caps.
   - Optional smoothing after major waves available; not the core.
4. **Live progress stub** — HTML page, workbench doc, or equivalent exists and is named in the receipt (stub OK; format is means).
5. **Isolation truth** — topic branch + linked worktree (or harness-equivalent); agent working root **is** that isolation; when UI applies, documented origin serves **this** tree and browser reached the local route.

## Fleet means (not inventable)

### Git / worktree

- Must be a git repo; abort otherwise.
- Create from the **primary checkout** (`.git` is a directory). If currently in a linked worktree, resolve common base / primary — **never nest** worktrees.
- Branch: `feat/<kebab-slug>` or the repo's documented prefix. Reject empty/generic slugs.
- Fetch default base (`origin/main` or repo default); add linked worktree on new local branch with `--no-track`.
- Path is harness-owned (harness default under the repo, or e.g. `~/code/.worktrees/<repo>/<slug>/`). If path or branch exists → **stop and report**; never clobber, delete, reset, or reuse another task's dirty room.
- Provision only what the target `AGENTS.md` / `.worktreeinclude` / `worktree:provision` / `worktree:init` documents (e.g. `npm ci`). Do not invent infra.

### Agent root

- Before further file work, relocate workspace root to the new isolation. Cursor: `move_agent_to_root` with the worktree absolute path. Other harnesses: equivalent "open this folder as workspace" / cwd switch. A tree the session is not sitting in is not ready.

**Local UI (from worktree `AGENTS.md` → Local UI verification)**

- Take documented dev command, origin, default route. Do not invent a framework `dev` command.
- If section says browser smoke **N/A** (no user-facing UI): skip server/browser; still require the Gauntlet quartet (goal/bar/charter/progress) + isolation + root move; status `ready (no UI)` with that reason.
- When UI exists: serve from **this** feature tree. Reuse a healthy server only if it already serves this tree on the documented origin; never treat a primary-checkout server as sufficient; don't open a duplicate on a second port when one is healthy for this tree. Wait until the origin answers HTTP.
- Open harness-native embedded browser (else harness-available browser) to documented local origin + route (`/` only if none documented). Confirm load. No auth unless user asked signed-in start; no production URLs/creds (`/verify-ui` owns credentials).

### Writes

- No tracked writes on `main` / primary checkout after a feature room was requested. Progress stub + charter note belong in the isolation.

## Boundary

Prepare and stop. Charter binds later loop execution; running the first decomposition wave, builder/critic round, `/loop` until bar, feature implementation, commits, `/verify-ui`, or `/ship` is out of scope for this skill alone.

## Receipt (plain text; claim status only when true)

- **Goal** — outcome (not architecture list)
- **Bar** — inspectable criteria, or explicit find-the-bar mandate
- **Charter** — path to durable note (or inline summary of the four laws)
- **Progress** — path/URL of live progress stub
- **Repo** — absolute primary-checkout base used for worktree create
- **Branch** — topic branch
- **Worktree** — absolute isolation path
- **Agent root** — confirms session root is the worktree
- **Dev server** — command + origin, or `skipped (no UI)` + reason
- **Browser** — opened local route, or `skipped (no UI)`
- **Status** — `ready` | `ready (no UI)` | failure (what blocked; never dress partial as ready)

## Don't

- Don't claim ready for scaffolding without the product gate.
- Don't accept slogan bars; don't freeze architecture / fixed rounds as goal or session law.
- Don't plan builder self-grading or critique of summaries.
- Don't author on `main`/primary; don't clobber foreign rooms; don't skip root move.
- Don't invent UI stacks on no-UI repos; don't reuse wrong-tree servers.
- Don't implement, smoke beyond "server up + browser opened," commit, or ship under start.
