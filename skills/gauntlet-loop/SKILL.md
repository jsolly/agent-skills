---
name: gauntlet-loop
description: >-
  Self-start on substantial planning or large implementations (multi-file
  feature, new subsystem, ambitious refactor) — do not wait for a slash.
  Also `/gauntlet-loop` or `$gauntlet-loop`. Goal, inspectable bar, decompose,
  builder ≠ critic, keep looping. NOT for small fixes, typos, single-file bugs,
  docs-only, `/ship`, `/verify-ui`, creating a new fleet skill
  (`solly-create-skill`), problem diagnosis to a fix plan (`investigate`),
  or exhaustive workspace inventory/upgrade (`optimize-workspace`) — those
  peers own their own Gauntlet charters.
---

# Gauntlet Loop

**Product:** the work (plan and/or implementation) reaches an inspectable bar under independent critic passes — or the user stops the run.

Public method: [Gauntlet Loop](https://somethingbig.ai/gauntlet-loop). Session law below is binding; do not re-derive a weaker "one draft then done" variant.

Isolation (topic branch, worktree, harness default) is harness-/repo-owned — lean on that and `block-edit-on-main`. Do not invent a worktree recipe here.

## Activate / abstain

**Self-start.** When planning substantial work or implementing a large change, load this skill and run under its charter **without** waiting for `/gauntlet-loop` or `$gauntlet-loop`. Those forms are optional explicit aliases.

**Fire** when any hold:

- Substantial planning (any harness plan/design step, or multi-step design before coding)
- Large implementation: multi-file feature, new subsystem/package, ambitious refactor, or similarly scoped work where "pretty good for AI" is the failure mode
- User says `/gauntlet-loop`, `$gauntlet-loop`, or asks to run a Gauntlet Loop

**Abstain** when any hold:

- Typo/lint, single-file bugfix with clear repro, docs-only, routine commit or `/ship` babysit
- Follow-up inside an already-chartered gauntlet wave
- Another skill already owns the turn **and** declares its own Gauntlet charter — defer to `solly-create-skill`, `investigate`, `optimize-workspace`, `setup-personal-machine`, or `setup-work-machine` (do not nest a second general loop)

If unsure whether the change is large: one focused ask, then fire or abstain.

## Product gate (every `done` / plan-ready claim)

All required; omit any → fail closed:

1. **Goal** — outcome destination. Not architecture, workstreams, or sprint plans. Reject empty/generic ("improve the app").
2. **Bar** — concrete critic-inspectable comparison (reference product/pages, tests, latency, security checks, named sibling artifacts, viewport/console criteria). Slogans ("perfect", "AAA", "production-ready", "amazing") are not a bar. If user gave none or only slogans: one focused ask **or** record an explicit **find-the-bar** mandate (same role Call of Duty screenshots played for Claude of Duty) — never invent a fake user-supplied bar.
3. **Decomposition** — lead split into the smallest independently judged pieces. User architecture ideas are optional context, not the goal.
4. **Critic win** — at least one fresh-context critic pass judged the **real** artifact (plan text, running product, pixels, tests — never a builder summary) against the bar; largest gap closed or explicitly accepted by the user. Builder self-grading does not count.
5. **Progress** — for multi-wave / long runs, a live HTML page, workbench doc, canvas, or equivalent exists and is updated as work evolves (stub OK at start). Prefer gitignored / scratch / outside the tracked tree; do not commit the progress surface unless the user asks. Short single-piece runs may keep progress in the receipt only.

## Charter (binding)

- Lead decomposes; builders produce real artifacts; **builder ≠ critic**.
- **Keep looping** until the bar is met or the user stops — no fixed round caps. A harness loop/timer is fine if available; it is not a substitute for independent critics.
- Optional smoothing pass after a multi-piece wave (consistency across parts) — useful, not the core.

### Independent critic (required means)

Same-turn self-critique in the builder's context does **not** count.

1. Spawn a separate agent/subagent (or equivalent clean context the harness provides).
2. Pass only: goal, bar, and paths/URLs to the **real** artifact (plan file, screenshots, test output, running origin). Blind A/B vs the bar when possible.
3. Withhold builder history, rationalizations, and "please confirm this is good" framing.
4. Critic returns: bar met, or the single largest remaining gap. Builder fixes; critic again.

### Critic scope by mode

- **Plan** — one independent critic on the **whole plan artifact**. Decompose for structure; do not per-section critic unless the lead marks a section as its own bar.
- **Implementation** — per independently judged piece.
- **Plan→implementation** — plan critic once, then per-piece on build. Same goal/bar/charter; do not drop the gauntlet at "plan written."

## Loop

1. **Goal** — pin outcome from invoke args, plan request, or one focused ask.
2. **Bar** — lock inspectable criteria or find-the-bar mandate.
3. **Progress stub** — for multi-wave runs, create or name the live progress surface (gitignored/scratch preferred); update it each wave. Short runs: receipt only.
4. **Decompose** — lead chooses the smallest independently judged pieces (plan sections and/or implementation slices).
5. **Build + criticize** — per Critic scope by mode: builder produces the artifact → fresh critic vs the bar → if bar wins, critic states the largest gap → builder fixes → repeat.
6. **Plan then build** — approved plan becomes context for implementation under the same charter.
7. **Stop** when the bar holds, the user accepts remaining gaps, or the user ends the run. Hand off integration to `/ship` when they ask to land on `main`; UI smoke to `/verify-ui` when user-observable UI changed.

## Don't

- Don't skip the bar or accept slogan bars.
- Don't let the builder grade its own work or critique a summary instead of the artifact.
- Don't freeze architecture / fixed round counts as the goal or session law.
- Don't run this for small fixes; don't swallow `/ship` or `/verify-ui`.
- Don't nest a second gauntlet on top of a peer skill that already owns one.
- Don't commit the progress surface unless asked; don't author tracked files on a `main` checkout.

## Receipt (plain text; claim status only when true)

- **Goal** — outcome
- **Bar** — inspectable criteria, or find-the-bar mandate
- **Mode** — plan | implementation | plan→implementation
- **Pieces** — what was decomposed
- **Progress** — path/URL of live progress surface, or `receipt-only`
- **Critic** — last independent pass result (win / largest remaining gap / user-accepted)
- **Status** — `bar met` | `stopped by user` | `plan ready (implementation continues)` | blocked (what)
