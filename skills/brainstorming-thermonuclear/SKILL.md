---
name: brainstorming-thermonuclear
description: Expansively explore an idea, problem, or design until the option space is saturated, then synthesize with conditional routes and a handoff brief. Generative and collaborative (not adversarial). Use when the user wants to brainstorm, open options before committing, find directions they haven't considered, "brainstorm with me", or `/brainstorming-thermonuclear`. NOT for executing a chosen direction, adversarial plan-killing, or a short single answer.
---

# Brainstorming (thermonuclear)

Map the full possibility space with the user. Stay generative: strengthen weak ideas or find better neighbors — never dismiss during divergence. Output is a navigable option map + synthesis, not comfort or a single pin.

This is the generative twin of adversarial grilling: same exhaustiveness demand, opposite posture.

## Non-negotiable method

1. **Steer via `AskUserQuestion`, one call at a time** (one question per call). During divergence: `multiSelect: true`; options span distinct regions (sensible + wildcard; 2–4); never append `(Recommended)`. User free-text lands in Other — yes-and it onto the map.
2. **Challenge framing early** — restate one altitude up, one down, and one orthogonal angle before treating the given problem as the only frame.
3. **Maintain an explicit idea map** (regions: rich / thin / untouched). Prefer breadth over deepening one cluster. Stop diverging only when (a) no obvious empty regions remain and new ideas are mere variations, or (b) the user knowingly chooses to converge after thin regions are named on the record.
4. **Run both expansion prompts at least once** (as `AskUserQuestion`): forward-looking success imagination ("a year from now this worked far better than hoped — what did we build?") and "if one hard constraint vanished, what would we do?"
5. **Defer judgment until synthesis.** No ranking, filtering, or "that won't work" while diverging. Tag lightly for harvest only: STRONG CANDIDATE / DARK HORSE / SEED.

## Synthesis → handoff (then stop)

After saturation (or knowingly-thin stop): cluster distinct directions; name strongest route, novel/high-upside alternative, and useful recombinations; flag thin/unexplored regions; recommend conditionally ("if you want X…") — never a forced single pin.

Emit a **self-contained brief** a fresh agent could execute (goal, chosen/contending routes + why, first moves, open questions, parked dark horses/seeds).

**Final fork** — one `AskUserQuestion` with `multiSelect: false`: continue-here / change-model / hand-to-workflow / stop. **Do not implement** until the user explicitly chooses a next step after this fork. Bundled "brainstorm then build" pressure still ends at handoff until that choice.

## Keep collaborative

Live build-with-me stays on this thread. Optional read-only / parallel generation subagents may widen or ground; never farm out the interactive steering exchange.

## Don't

- Lock onto the first promising idea or the user's initial framing.
- Dismiss a weak idea without its strongest version or a better neighbor.
- Claim saturation while obvious empty regions stay unnamed.
- Roll straight into building without the handoff pause and user choice.
- End with comfort, a single answer, or an unorganized wall with no synthesis/map.
