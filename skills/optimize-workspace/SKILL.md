---
name: optimize-workspace
description: >-
  Use when the user says `/optimize-workspace` or `/memory-to-config`, or wants
  an exhaustive optimization of skills, rules, memories, agents, and standing
  briefs. Inventories into a view-only dashboard, waits for chat selection,
  then resolves selected skills through blind upgrade/retire experiments and
  selected knowledge through a capital-plan apply. NOT for singleton memory
  filing, creating a new skill, ad-hoc config edits, or shipping/merging.
---

# Optimize Workspace

**Outcome:** selected workspace assets reach honest terminal states while
immutable originals, resumable state, and a live view-only dashboard preserve
user control. The target is quieter agents: standing preferences in config,
skills that earn their tokens, and memory as debt to drain.

This skill owns a specialized rigor charter; do not nest `/gauntlet-loop`.
Creation belongs to `/solly-create-skill`; integration remains `/ship`.

## Product gate

Claim complete only when:

1. Every available skill/config/memory/friction scope was inventoried; every
   missing source is named.
2. The dashboard was opened and linked before mutation, and the user selected
   scope in chat (or resumed a persisted selection).
3. Pristine full originals exist for every mutated target.
4. Every selected skill is decisively upgraded with final sealed evidence or
   **Green — retire** with retirement evidence and install-time accounting
   (see Retire below).
5. Every selected capital item is applied, deliberately skipped, or blocked
   with a reason; no item disappears.
6. State/dashboard are current and sufficient to resume.
7. Contestants and judges use harness defaults (no `model` pin/override; do
   not request named models unless the user asks for a cross-model
   comparison); record harness-reported model IDs when available and never
   invent or relabel conditions.

## Progressive reads

1. Before inventory/resume: `references/persistence.md`.
2. Before dashboard/selection: `references/inventory-and-dashboard.md`.
3. After selection, per selected skill: `references/skill-gauntlet.md`.
4. After capital selection: `references/capital-plan.md`.

Do not preload post-selection lane playbooks before that lane has selected work.

## Run

Steps 1–4 are the read-only entry; **stop at the end of step 4 and wait**. No
candidate, config edit, memory deletion, or originals snapshot may happen
before the user's chat selection arrives (or a persisted selection resumes).

1. **Resume** — offer an incomplete run under
   `~/.config/dotagents/optimize-workspace/` versus new; preserve prior
   selections; never overwrite an existing run's `originals/`.
2. **Inventory** — enumerate all canonical assets, live link drift, memories,
   and friction evidence across harnesses; name every missing source loudly
   (a missing harness path is a disclosure, never a silent skip).
3. **Dashboard** — write `state.json` + `dashboard.html` in the run dir,
   `open` the dashboard, and paste the `file://` link in chat. It is a report,
   never a control surface — dashboard interaction is not approval.
4. **Select and wait** — recommend a set and wait for the user's chat reply.
   "Improve whatever you recommend" before the inventory exists does not count
   as selection.
5. **Snapshot** — copy complete selected originals into the run's `originals/`
   before any mutation.
6. **Resolve autonomously**:
   - skills → frozen contract and benchmark, original/no-skill/candidate
     comparisons, blind judgment, upgrade or retire;
   - capital → evidence-backed PROMOTE/RETIRE/PEEL/MERGE/PREFERENCE/KEEP,
     encode before delete.
7. **Install/apply** — canonical skill source and selected config/memory edits;
   machine changes may go live, repo changes remain for `/ship`.
8. **Seal and report** — final held-out evaluation for installed upgrades,
   dashboard/state update, and complete per-item receipt.

After selection, pause only for genuine external blockers or live-system/data
risk. Do not ask the user to steer experiments or approve each drafted edit.

## Retire (Green — retire) install accounting

Retirement is a first-class terminal state — never manufacture a candidate to
paint the dashboard green. At install time a retirement must, deliberately and
on the record:

- record the retire verdict + evidence pointer on the dashboard/state;
- remove the canonical `skills/<name>/` in the working tree (repo change →
  `/ship`), preserving `originals/` and all run evidence;
- update exposure **explicitly**: drop any `public-manifest.txt` /
  `work-excluded.txt` line as a visible, deliberate edit — never silently;
- re-run the installer so live per-harness links are pruned, and verify the
  unlink;
- mark the held-out upgrade eval N/A for this skill (skip it — do not fabricate
  post-install results for a skill that no longer exists).

## Hard don'ts

- Mutate before selection or without an immutable original.
- Leak sealed packets to builders, cherry-pick, relax the frozen standard, pin
  or override contestant/judge models, fake models/results, or manufacture an
  upgrade when no skill is better.
- Promote a singleton or delete memory before verified durable capture.
- Write skill bodies into tool-local/built-in directories or author a symlinked
  canonical mirror such as `CLAUDE.md`.
- Push, merge, or open a PR from this skill.

## Receipt

`run · dashboard · originals · each skill verdict (upgrade evidence | retire accounting) · each capital outcome · missing/blocked/watch items · repo changes awaiting /ship`
