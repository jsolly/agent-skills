---
name: investigate
description: >-
  Use when the user says `/investigate`, or asks to investigate / diagnose /
  root-cause a concrete problem and propose a fix plan. Runs a Gauntlet Loop in
  plan mode: gather evidence, pin a supported root cause, then finish by
  creating a reviewable plan (implementation todos or evidence-acquisition
  todos). NOT for external deep-research prompts (`research`), broad ideation
  (`brainstorming-thermonuclear`), attacking an already-formed plan
  (`grill-me-thermonuclear`), edge-case debt census (`find-edgecase-slop`),
  implementing the fix, or `/ship`.
---

# Investigate

**Outcome:** an evidence-grounded diagnosis of the given problem, finished as a
reviewable plan — never an uncritiqued edit and never a root-cause guess.

Load and run `/gauntlet-loop` in **plan** mode for the whole turn. That skill
owns goal, inspectable bar, decomposition, builder≠critic, and keep-looping.
Do not restate or weaken its charter here.

## Plan posture

Enter/stay in plan (read-only) mode first. Stay there through evidence,
diagnosis, and `CreatePlan`. Leave only if the user later asks to implement
outside this skill.

## Diagnosis steps (under the Gauntlet charter)

1. **Pin the problem** — restate the symptom in one or two sentences from the
   invoke args; one focused ask if the failure mode is empty/generic.
2. **Evidence** — inspect the real repo/runtime: relevant code, tests, logs,
   git history, configs. Label each claim as observation or hypothesis. Do not
   invent facts you did not check.
3. **Root cause** — converge on the best-supported cause; explicitly reject
   weaker alternatives with evidence. If reproduction is blocked or evidence is
   insufficient, stop inventing a fix and prepare an evidence-acquisition plan
   instead.
4. **CreatePlan** — mandatory finish for every non-stopped run after the
   Gauntlet plan bar holds (or the user accepts the remaining gap); do **not**
   use `TodoWrite` (or equivalent) as the finish artifact.

### CreatePlan constraints

#### Supported diagnosis

- Title/overview name the problem and the root cause in plain language.
- Plan body includes: symptom, evidence (paths/commands/excerpts), root cause,
  rejected alternatives, proposed fix strategy, risks, and verification.
- `todos`: actionable implementation/verification slices; exhaustive for the
  proposed fix; no bucket todos.

#### Insufficient evidence / blocked reproduction

- Do not invent a fix.
- Plan body states what is known, what is blocked, and why.
- `todos`: one actionable item per diagnostic gap (repro step, log capture,
  failing test, env check, etc.).

Pause for user review/confirm of that plan (CreatePlan confirm UI). Make **no**
implementation edits during `/investigate`.

## Don't

- Skip plan mode or the `/gauntlet-loop` charter this skill loads
- Claim a root cause without supporting evidence
- Implement, commit, PR, or `/ship` under this skill
- Route to `research` / brainstorm / grill / edgecase-slop when the ask is
  diagnose-this-problem → plan a fix
- Finish with chat-only diagnosis and no `CreatePlan`

## Receipt

- **Problem** — symptom restated
- **Evidence** — key paths/commands checked
- **Root cause** — supported cause, or `blocked` + why
- **Confidence** — high / medium / low (and what would raise it)
- **Gauntlet** — last independent critic result from `/gauntlet-loop`
- **Plan** — CreatePlan title or URI
- **Status** — `plan ready` | `evidence plan ready` | `stopped by user` | blocked
