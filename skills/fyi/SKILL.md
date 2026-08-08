---
name: fyi
description: Use when the user says `/fyi`, or asks for a session handoff / context snippet to paste to another agent — a copy/paste summary of what was done this session and what's still outstanding, so a fresh agent can safely continue work on the same files.
---

# Session Handoff (FYI)

Audience: the **next agent**. Deliverable is the paste snippet — not a user-facing status report.

## Output

**Has substantive state** → entire response is exactly one fenced `text` block. No preamble, postscript, or alternate versions unless asked.

**No substantive state** (no file changes, commits, or decisions in *this* workspace) → one plain sentence saying so. **No** empty or invented fenced block.

Write imperative / second-person to the receiving agent. Concrete paths, commands, SHAs, branches — never "various files."

## Anchor before you claim anything

Hand off **this** session's active workspace only:

1. Prefer **cwd / the repo you are already in** for this chat. Do not switch to, or invent, a different project from memory, another worktree, or an unrelated checkout.
2. In that repo, run `git status`, `git diff --stat`, and `git log --oneline origin/main..HEAD` (use `@{u}..HEAD` only when upstream is set; worktrees often have none).
3. **Files touched**, branch, HEAD, and dirty/staged state must come from that verification — not recalled paths. If verification shows a clean empty session, use the empty-state one-liner; do not manufacture a handoff from a different tree.
4. Label unverified attempts; never imply completion you did not confirm.

Optional focus argument scopes the snippet; otherwise cover the whole session in that same workspace.

## Section order (when applicable)

Omit a heading only if it truly does not apply — but never silently drop **Files touched** or **Outstanding** when work occurred (Outstanding may say "nothing left"):

1. **Goal** — 1–2 sentences.
2. **Repo / branch / state** — verified path, branch, clean/dirty (staged vs unstaged if relevant), HEAD vs `origin`.
3. **Files touched** — every create/modify/delete this session + one-line note each (from git, exhaustive even when terse elsewhere).
4. **What was done** — outcomes, verifies, relevant SHAs.
5. **Outstanding** — unfinished, blockers, open decisions.
6. **Gotchas / context** — non-obvious constraints, dead ends, traps.

## Don't

- Don't wrap the block in commentary or emit multiple snippets unless asked.
- Don't include secrets, tokens, or full file dumps — paths + concise descriptions only.
- Don't substitute another project's state when the active repo does not corroborate it.
