# Skill Upgrade Gauntlet

Read for each selected skill before mutating it. Adapted from [Skills Upgrade](https://somethingbig.ai/skills-upgrade) for this fleet (Cursor / Claude Code / Codex). Treat every selected skill as its own independent experiment.

Creation-side peer: `/solly-create-skill` (Gauntlet Loop for **new** skills). This ref upgrades or retires **existing** ones.

## Standing principle

A skill should primarily contain what the model could not reasonably know on its own. Beyond that, builders may investigate and try whatever they believe will produce the strongest general result — evaluations decide.

## Preflight

1. Confirm immutable copy exists at `originals/skills/<name>/` (`references/persistence.md`).
2. Author only under the canonical skill dir in the active `dotagents` checkout (`skills/<name>/`). Never write bodies into `~/.{cursor,claude,codex}/skills/` or `~/.cursor/skills-cursor/`.
3. If on `main` in that checkout, use a topic branch / worktree before edits (`block-edit-on-main`).

## 1. Outcome contract (freeze before edits)

Have **fresh, independent** agents inspect the complete original skill and its resources, examples, and available evidence of real use (sessions, friction). Produce an implementation-neutral outcome contract covering:

- What the user cares about
- What a successful result looks like
- Which qualities matter most
- Constraints that must be respected
- What must never happen
- When the skill should / should not be useful

**Distinguish ends from means.** Do not carry an old procedure, prompting technique, tool sequence, or implementation choice into the contract merely because it appears in the original. Preserve a method only when the method itself is genuinely part of the user’s requirement. Strip distinctive wording/examples/procedural clues that would reveal which skill version produced an output.

Have a **separate** independent agent compare the proposed contract against the original skill and flag omissions, distortions, or preferences mislabeled as requirements. Resolve those issues, then **freeze** `skills/<name>/contract.md` and display it on the dashboard.

## 2. Benchmark (freeze before edits)

Give an independent benchmark designer the frozen contract and a **neutral** description of intended capabilities and boundaries — **not** the original skill’s implementation instructions.

Create a diverse suite of realistic tasks covering ordinary use, difficult situations, edge cases, variations, and whether the skill activates appropriately.

For each task, create an **evaluation packet**: user request/inputs; relevant contract slices; objective facts/invariants; relative importance of qualities when needed; disqualifying failures. Where no single ideal answer exists, specify what success means rather than inventing a rigid gold answer.

Split into:

- **Iteration set** — builders may learn from failures here
- **Sealed held-out set** — under `benchmark/held-out/`; builders must never see tasks, packets, expected results, or judge verdicts before final evaluation

Before editing begins, a fresh agent audits the benchmark for coverage, realism, solvability, leakage, redundancy, leading criteria, and accidental bias toward the original skill. Fix weaknesses, freeze the benchmark and acceptance standard, and show coverage on the dashboard **without** exposing sealed tasks.

## 3. Contestant conditions

On equivalent tasks, evaluate at least:

| Condition | When |
| --- | --- |
| Strongest available model + **original** skill | Always |
| Strongest available model + **no skill** | Always |
| Strongest available model + **candidate** skill | Always (once a candidate exists) |
| Weaker / prior model + original skill | Only when that model is actually available |

Verify and log the **exact** model id for every run on the dashboard. Never silently substitute, claim an unavailable model was tested, or route two labeled conditions through the same underlying model while claiming they differ. Skip unavailable rows and label them honestly.

Every sample: **fresh, independent** agent run with only the information needed for that task and condition. No shared conversations, reasoning, artifacts, or memories across contestants. No contestant may see another’s output.

## 4. Blind judges

Every judgment: fresh independent agent, separate from contestants, skill builders, benchmark designers, contract extractors, lead agent, and other judges.

Give each judge only:

- The task
- The task’s implementation-neutral evaluation packet
- Anonymized outputs/behavior/artifacts in **randomized** order

Judges must **not** see skill files, know which model/skill produced an output, know what changes are being tested, see builder reasoning or previous verdicts, or know which result the lead hopes will win.

Each judge: choose the better result, state confidence, explain concretely why it is better under the outcome contract, and name requirements either side violated or handled especially well. Judge real deliverables, behavior, tool use, and artifacts — not lead-agent summaries.

Use the strongest appropriate independent judge models actually available.

## 5. Build / iterate

Upgrade the skill for the strongest available model. When a candidate loses, use blind feedback to understand why, try a better approach, and compare again.

- Keep builders blind to held-out tests
- Replace tests once iteration has contaminated them
- Do not leak benchmark answers into a skill, tune to individual examples, cherry-pick generations, relax the standard, or optimize for a particular judge’s quirks
- Write candidates under `skills/<name>/candidates/vN/` and promote into the working skill tree only when testing that version

**Green** means a decisive, repeatable improvement — not a narrow win, lucky sample, greater verbosity, or generic stylistic preference. The final result must:

- Clearly outperform the original stack where compared
- Improve on the original skill when both use the strongest available model
- Add real value beyond strongest-available working without the skill
- Satisfy the outcome contract
- Survive fresh unseen (held-out) testing
- Introduce no important regressions

### Green — retire

If the strongest available model repeatedly performs best **without** a skill, do not manufacture a revised skill to paint green. Treat retirement/disabling as a valid successful upgrade: label **Green — retire**, preserve evidence, leave originals intact, and remove or unlink the live skill only at install time (update manifests / installer as appropriate; never silently drop from `public-manifest.txt` without recording the decision on the dashboard).

## 6. Install and final sealed eval

When the skill is honestly green (upgrade or retire):

1. **Upgrade path:** install the winning version into the canonical `skills/<name>/` (from the winning candidate). Preserve `originals/skills/<name>/`.
2. **Retire path:** do not install a fake revision; record retirement; unlink/remove per fleet wiring norms after documenting evidence.
3. Run one **final clean evaluation** with fresh agent runs on the sealed held-out set (upgrade path only). Update dashboard with held-out results.
4. Refresh per-tool symlinks via `bash setup/install-local-agent-runtime.sh` only if links need refresh (add/remove/rename). Spot-check `readlink` for the skill.

Continue until every selected skill is honestly green, Green — retire, or conclusively blocked with a recorded external reason.

## Dashboard updates (per skill)

Keep current throughout: contract, benchmark coverage, state, exact models, trials, blind results, judge explanations, regressions, iteration history, current changes, held-out performance, and why red/yellow/green. Evidence must be inspectable without exposing sealed tests before they are used.

## Hard don'ts (gauntlet)

- Edit before contract + benchmark are frozen
- Let builders see held-out material before final eval
- Fake green; fake models; share contestant context
- Write into live tool skill dirs or Cursor built-ins
- Claim `done` for a skill without held-out (upgrade) or retirement evidence (retire)
