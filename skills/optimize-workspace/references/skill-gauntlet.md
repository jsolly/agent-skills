# Skills Upgrade Gauntlet

Each selected existing skill is an independent experiment. This specialized
charter owns upgrade/retire work; do not nest the general `/gauntlet-loop`.

Standing test: a skill should primarily contain fleet knowledge the harness
could not reasonably supply on its own.

## Freeze before editing

1. Confirm the full immutable original exists.
2. Extract an implementation-neutral outcome contract from the complete
   original and evidence of use: user outcome, success, priority qualities,
   constraints, prohibitions, and activation boundaries.
3. Audit that contract separately against the original; remove procedural
   leakage and freeze it.
4. From only the contract and a neutral capability description, create diverse
   realistic evaluation packets with request/inputs, contract slices,
   invariants, priorities, and disqualifiers.
5. Split iteration packets from sealed held-out packets. Audit coverage,
   realism, solvability, leakage, redundancy, and implementation bias; freeze
   both and expose only coverage.

## Conditions and judging

On equivalent tasks run fresh, isolated harness-default contestants for:

- immutable original skill;
- no skill;
- candidate skill when one exists.

Do not pin or override the model on contestant or judge runs — leave choice to
harness defaults. Do not pass a `model` argument to subagents/Task spawns, and
do not ask for Fable / GPT Sol / Opus / etc. unless the user explicitly
requests a cross-model comparison. Record harness-reported model ids when
available as observational notes; never invent, relabel, or simulate an
unavailable condition.

Fresh judges receive only the task packet and anonymized outputs/artifacts in
random order. Judges also use the harness default (same no-override rule). They must not see skills, producer histories, condition labels,
desired verdicts, or earlier judgments. A verdict chooses the better result,
states confidence, cites contract evidence, and names violations. Judge actual
deliverables and tool behavior, never lead summaries.

## Build and resolve

Build under `candidates/vN/`, learn only from iteration results, and replace
contaminated iteration tests. Never tune to sealed packets, cherry-pick, relax
the frozen standard, or optimize for a judge’s quirks.

**Green — upgrade** requires decisive, repeatable improvement over the original
under the same harness defaults, real value beyond no skill, contract
satisfaction, no important regression, and final sealed survival.

**Green — retire** when no skill repeatedly wins. Preserve evidence and
originals; do not create cosmetic revisions. At install time, deliberately
remove/link/unlist under fleet norms and record any public-manifest decision.

## Install and seal

Install only a winning full candidate into canonical `skills/<name>/`.
Existing per-skill links already resolve canonical content; rerun the installer
only for add/remove/rename or broken linkage. Then run fresh sealed contestants
and judges for upgrades and update state/dashboard. Retirement requires its
evidence but no fabricated held-out upgrade run.

Continue until each selected skill is upgraded, retired, or blocked by a
specific external reason. Never write bodies into tool-local or built-in skill
directories.
