---
name: fyi
description: Use when the user says `/fyi`, or asks for a session handoff / context snippet to paste to another agent — a copy/paste summary of what was done this session and what's still outstanding, so a fresh agent can safely continue work on the same files.
---

# Session Handoff (FYI)

Produce ONE copy/paste-ready handoff snippet that brings a fresh agent up to speed on the current
session — what was done, the current state, and what's left — so it can safely pick up work on the
same files without re-deriving the context.

The deliverable is the snippet, not a report to the user. The audience is the *next agent*.

## Output contract

Return exactly one fenced ` ```text ` block. No preamble, no postscript, no second option unless the
user asks.

- No "Here's the handoff…" framing before or after the block.
- Write it addressed to the receiving agent (second person / imperative), not narrated to the user.
- Be concrete: real file paths, real commands, real commit SHAs, real branch names. "Various files"
  or "some changes" is a useless handoff — name them.
- Keep it dense — the facts the next agent needs to act, not a story. Drop any section that's
  genuinely empty rather than padding it.

If the session has no substantive state to hand off — no file changes, no commits, no decisions made —
say so in one plain sentence instead of emitting an empty or invented block. Don't manufacture a handoff.

## What the snippet must contain

Cover these in order; omit a heading only if it truly doesn't apply — but **Files touched** and
**Outstanding** are never dropped when any work happened (a deliberately empty "Outstanding" that says
"nothing left" is itself information; a *silently* omitted one reads as "all done"):

1. **Goal** — what this session set out to do, in 1–2 sentences.
2. **Repo / branch / state** — repo path, current branch, clean vs dirty, and HEAD vs `origin`.
   The next agent needs to know where it's standing before it touches anything.
3. **Files touched** — every file created / modified / deleted this session, each with a one-line
   note on what changed. This is the load-bearing section for "work around the same files" — be
   exhaustive here even when terse elsewhere.
4. **What was done** — the substantive changes and their outcomes: what landed, what shipped, what
   was verified (tests/gate), with relevant commit SHAs.
5. **Outstanding** — what's left: unfinished work, known issues, blockers, and decisions still open.
   Be explicit about what is *not* done — silent omission is how the next agent repeats finished work
   or assumes broken things are fine.
6. **Gotchas / context** — non-obvious decisions, constraints, dead ends already ruled out, or traps
   the next agent would otherwise rediscover the hard way.

## Gathering the facts

Ground the snippet in the real session state, not memory:

- Run `git status`, `git diff --stat`, and `git log --oneline origin/main..HEAD` to anchor "files
  touched" and "what landed" in fact. (Worktree sessions branch off `origin/main` with `--no-track`,
  so there's no upstream — use `@{u}..HEAD` only when an upstream is actually set.)
- If invoked with an argument, treat it as a focus hint (a subsystem, path, or file set) and scope
  the snippet to that; otherwise cover the whole session.
- Prefer what you can verify (commits, diffs, gate/test results) over what you remember. If something
  was attempted but not verified, say so — never imply completion you didn't confirm (the fleet's
  fail-loud standard: "done" is wrong if anything was skipped silently).

## Don't

- Don't include secrets, tokens, or full file dumps — paths plus concise descriptions only.
- Don't editorialize for the user or wrap the block in commentary — the block is the whole output.
- Don't emit multiple blocks or alternatives unless the user asks for them.
