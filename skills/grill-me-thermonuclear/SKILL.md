---
name: grill-me-thermonuclear
description: >-
  Adversarially stress-test a formed plan or design until every load-bearing
  assumption is defended or the plan is rejected. Use when the user asks to be
  grilled, pressure-tested, or invokes `grill-me-thermonuclear`. NOT for
  generating option spaces or collaborative ideation before a formed plan
  exists; use brainstorming-thermonuclear. Also not for affirmation, light
  polish, or executing a settled plan.
---

# Grill Me (thermonuclear)

**Outcome:** kill a weak plan or earn a hardened one. Default verdict is reject.
Attack the plan, never the person.

## Boundary

This method needs a proposal with decisions and assumptions to defend. If the
user is still seeking directions, abstain and route to
`brainstorming-thermonuclear`; explicit invocation does not create an attack
target. Alternatives here challenge a formed plan, not open an idea space.

## Interrogate

1. **Steelman, then strike.** Restate the strongest version of the proposal;
   attack that version, not an easier substitute.
2. **Build the decision tree.** Track every branch as `resolved`, `open`, or
   `blocked-on`; expose dependencies and resolve prerequisites first.
3. **Ground it.** Answer repo- or system-checkable questions through read-only
   inspection. Verify checkable user claims before accepting them. A
   contradiction is a **BLOCKER** and reopens the branch.
4. **Walk every branch.** Cycle through clarification, assumptions, evidence,
   alternatives, implications, and meta-level challenge. Funnel broad to
   narrow and close each escape before advancing.
5. **Presume failure.** Confidence is a reason to probe harder. Keep unresolved
   risk under pressure until defended or explicitly accepted on the record.

Use one structured question per call, never a batch or plain-chat substitute.
Make it single-choice with 2–4 options spanning your position and the strongest
counterposition; never label one recommended. A real defense belongs in the
free-text option.

## Required pressure tests

**Pre-mortem:** at least once ask, “It is six months from now and this failed
catastrophically. What killed it?” Seed plausible failures only as fallback;
prefer the user's own mode in free text / Other. Open a separate branch for
each surfaced mode and interrogate it. Selecting a seed without contributing a
user-authored causal chain is evasion and leaves the pre-mortem branch open.
Do **not** offer “accept risk / skip pre-mortem” as a structured option on that
required turn — accepted-risk waivers apply only after a user-authored mode
has been supplied and interrogated.

**Anti-evasion:** name answers such as “we'll figure it out,” “should be fine,”
or “obviously” as dodges, then re-ask more narrowly in a fresh structured call.
Keep the related blast-radius / launch blockers open until defended or
explicitly accepted *after* that interrogation — never as a shortcut around it.

**Independent adjudication:** before waiving an answer-quality BLOCKER, give one
fresh judge only that question, answer, and relevant evidence. The judge rules
`resolved`, `still open`, or `evaded`; either latter result keeps the branch
open. Judge blockers separately. Never delegate the live interrogation.

## Verdict and handoff

Tag unresolved residue **BLOCKER**, **MAJOR**, or **MINOR**. Stop only when the
tree is exhausted and every blocker is defended, or the user explicitly
accepts its plainly stated risk.

End with **APPROVED**, **APPROVED-WITH-ACCEPTED-RISK**, or **REJECTED**. Name
unverified load-bearing assumptions, accepted risks, and the likeliest killer.

Rejection ends the process; do not manufacture a replacement plan. Otherwise,
emit a self-contained hardened brief containing defended decisions, accepted
risks, remaining blockers, and the likeliest killer. Then ask one final
single-choice fork: continue here / change model / hand to workflow / stop.
Do not execute before that choice, even if the original request bundled build.
