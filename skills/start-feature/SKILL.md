---
name: start-feature
description: Use when the user says `/start-feature`, or asks to start a new feature room / spin up a worktree with the local app running — create a topic-branch worktree, move the agent into it, start the repo's documented dev server from that worktree, and open an embedded browser at the local URL. NOT for verifying UI after a change (`/verify-ui`), integrating to main (`/ship`), or continuing work already inside a feature worktree.
---

# Start Feature

Open a disposable **ready room** for feature work: a clean topic-branch worktree, the agent
working inside it, the documented local app server running from that tree, and an embedded browser
pointed at the local URL. Stop once the room is ready — do not start implementing unless the user
explicitly continues.

This skill is the bootstrap that `rules/worktree-authoring.md` assumes: change-making work happens
off `main` in a worktree. Integration later is `/ship`; browser smoke after edits is `/verify-ui`.

## Output contract

End with a short ready-room receipt (plain text, no preamble fluff):

- **Repo** — absolute path of the primary checkout used as the worktree base
- **Branch** — new topic branch name
- **Worktree** — absolute path of the linked worktree
- **Dev server** — command used + local origin (e.g. `http://127.0.0.1:3000`)
- **Browser** — opened route (default: the repo's documented local route, else `/`)
- **Status** — `ready` only when the worktree exists, the agent root is that worktree, the server
  answers HTTP on the local origin, and the browser navigated there

If any step cannot complete (no git repo, no Local UI verification guidance and no inventable
dev command, server never becomes ready), say what failed and stop — do not pretend the room is up.

## Procedure

1. **Resolve the repo.** From the current workspace, `git rev-parse --show-toplevel`. Prefer the
   **primary checkout** (`.git` is a directory) as the worktree base. If already inside a linked
   worktree, resolve the common git dir / primary and create the new worktree from there — do not
   nest worktrees. Abort if this is not a git repo.

2. **Name the branch.** From the invocation argument or a single focused ask, derive a kebab-case
   slug and branch `feat/<slug>` (or the repo's documented branch prefix if `AGENTS.md` names one).
   Reject empty / purely generic names like `feat/feature`.

3. **Create the worktree.** Fetch `origin/main` (or the repo's default base). Add a linked worktree
   on a new local branch off that tip with `--no-track`. Location is harness-owned
   (`rules/worktree-authoring.md`) — common choices are the harness default under the repo or
   `~/code/.worktrees/<repo>/<slug>/`; pick one consistent with the host and do not hard-code a
   single path in scripts. If the path or branch already exists, stop and report rather than
   clobbering.

4. **Provision when the repo says so.** Read the target repo's `AGENTS.md` (and any
   `.worktreeinclude` / `worktree:provision` / `worktree:init` docs). Run only the repo-documented
   install/provision steps needed before `dev` (e.g. `npm ci`). Do not invent infra setup.

5. **Move the agent into the worktree.** Relocate the session workspace root to the new worktree
   path before any further file work (Cursor: `move_agent_to_root`; other harnesses: the equivalent
   "open this folder as the workspace" / cwd switch). New terminals and edits must land in the
   worktree, not the primary checkout.

6. **Read Local UI verification.** From the worktree's `AGENTS.md` **Local UI verification**
   section, take the documented dev command, local URL/port, and default route. If that section
   says browser smoke is N/A (no user-facing UI), create the worktree + move root, skip server and
   browser, and report `ready (no UI)` with the reason. Do not invent a framework-specific `dev`
   command when the repo documents none and has no UI.

7. **Serve from the worktree.** Check existing terminals first; reuse a healthy server only if it
   is already serving **this worktree** on the documented origin. Otherwise start the documented
   command with cwd = the worktree, wait until the local origin returns HTTP, and do not open a
   duplicate server on a second port when one is already healthy for this tree.

8. **Open the embedded browser.** Navigate the harness-native embedded browser (not an external
   OS browser window unless the harness has no embedded one) to the documented local origin +
   route. Confirm the page loaded; do not authenticate unless the user asked to start a signed-in
   session — credentials stay in `/verify-ui` territory.

9. **Receipt.** Emit the output contract and stop. Leave the server running. Do not implement the
   feature, do not commit, and do not `/ship`.

## Don't

- Don't author on `main` or in the primary checkout when this skill was asked to start a feature.
- Don't remove or reuse another task's dirty worktree.
- Don't start implementing, refactoring, or smoke-testing beyond "server up + browser opened."
- Don't use production URLs or production credentials.
- Don't skip the agent-root move — a worktree the session is not sitting in is not a ready room.
