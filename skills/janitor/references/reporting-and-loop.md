# Bounding, Reporting, and Loop Decisions

Read this file before dispatching concurrent deep work and before ending every pass.

## Bounding and idempotency

- **No work caps — parallelize instead of deferring.** Do everything actionable in the pass. When
  multiple items need deep work (conflict resolutions, major-upgrade preps, issue implementations),
  **spawn subagents** — one per PR or issue, each in its own worktree — so the work runs concurrently
  rather than being rationed. A long pass is fine: `/loop` fires sequentially, so it just delays the
  next tick. The invariants bind subagents exactly as they bind the orchestrating pass.
- **Stacked PRs converge, in-pass or across ticks.** Stacked Dependabot PRs conflict on the
  lockfile serially: merging one makes its siblings BEHIND/DIRTY. Merge the mergeable ones,
  update-branch the rest, and re-evaluate within the pass if you like — or let the next tick
  continue; either converges.
- **Don't redo prepped majors.** The `janitor-prepped` label makes this mechanical: an
  already-labeled major merges when green, gets maintenance when BEHIND/DIRTY/red, and is never
  re-researched from scratch (`pr-drain.md` → classification).
- **No overlapping passes.** Assume one pass at a time (`/loop` fires sequentially). Subagents
  within a pass are fine; a second concurrent *janitor pass* is not.

## Reporting contract

End each pass with a terse, scannable summary — this runs every 5 minutes, so no walls of text:

```text
Janitor pass — <n> repos, <m> authorized items (<p> PRs, <i> issues)
  MERGED       other-org/slow-ci-app#524  aws-sdk cloudwatch (patch, changelog clean)
  ADAPTED      my-org/example-game#392         undici 6.19→6.21 — adopted renamed request option per changelog, CI green → merged
  ARMED        other-org/slow-ci-app#521  @astrojs/vue (auto-merge pending CI)
  REBASED      my-org/example-game#399         form-data (was BEHIND → update-branch)
  UPGRADED     my-org/my-org-website#405   tailwindcss 3→4 — ran @tailwindcss/upgrade, migrated config to CSS-first @theme, CI green → merged
  PREPPED      my-org/checkboxes#88        eslint 8→9 — flat-config migration pushed, labeled, CI pending → merges when green
  IMPLEMENTED  my-org/example-game#412 (issue) → PR #414 add CSV export button — /ship review clean, CI green → merged, closed #412
  IMPL(held)   my-org/checkboxes#90 (issue) → PR #91 — built, but bug-scanner flags an unhandled null; JANITOR HOLD comment
  HELD         my-org/example-game#390         vite 7→8 — migration guide drops the `X` API we use; correct replacement needs your call (partial adaptation pushed, JANITOR HOLD comment)
  HELD         my-org/checkboxes#93 (issue) "make it faster" — too vague to implement; asked which flow + target on the issue
  SKIPPED      my-org/<repo>#NN            author @thirdparty (not authorized)
Summary: 1 merged, 1 adapted+merged, 1 upgraded+merged, 1 implemented+merged, 1 armed, 1 rebased, 1 prepped, 2 held, 0 errors.
```

If nothing was actionable but work is still in flight (ARMED pending CI, deferred conflicts,
IMPLEMENTED PRs pending CI, UNKNOWN mergeability), one line — the loop keeps ticking:
`Janitor: N authorized items, all armed/in-flight, nothing to do this pass.`

If the backlog is **drained** — zero authorized open items, or every remaining one is HELD for a
human — one line and stop the loop (see Loop termination):
`Janitor: backlog drained — 0 actionable items (M held for human). Loop stopped.`

## Running it

Each iteration is one pass; the cadence is armed automatically:

- **Default — self-arming loop:** a bare `/janitor` IS the loop request. On invocation, check
  whether this run is already an iteration of an active loop (the `/loop` skill's own framing in
  the prompt). If it is, just run the pass and exit — the loop provides the next tick; **never arm
  a second loop.** If it is not, arm the cadence by invoking the `loop` skill with args
  `5m /janitor`, and let the loop's first iteration run the first pass (don't also run one
  inline — no double pass). Re-runs every 5 min while the session is open; a drained pass stops it
  automatically (Loop termination below), or stop it any time with the loop's own control.
- **One-shot:** `/janitor once` — run a single pass, arm nothing.
- **True background (unattended):** wrap a headless run in a launchd agent, e.g. a
  `~/Library/LaunchAgents/com.example.janitor.plist` firing
  `claude -p "/janitor once"` on a 300s `StartInterval` (use `once` so each firing doesn't try
  to arm an in-session loop). Not created by this skill — set it up deliberately if you want the
  cadence to survive without an open session. (If you already run the old `com.example.pr-janitor`
  plist, unload + rename it — the label and the `-p` command both change.)

## Loop termination — stop when drained

Do not let the loop idle forever on an empty backlog. At the end of each pass, decide:

- **Drained ⇒ end the loop.** The backlog is drained when no authorized open **item (PR or issue)**
  remains that the janitor can still act on: either zero authorized items are open, or every
  remaining one is terminal for the janitor (HELD for a human — a `JANITOR HOLD:` judgment call, a
  self PR needing review, or an issue too ambiguous to implement). When drained, end the loop the
  janitor armed instead of letting the next tick fire: stop it via the `loop` skill's own stop
  mechanism (don't schedule/reschedule the next iteration). Close with the drained report line so the
  user sees why the loop ended (HELD items are theirs to resolve — no further pass will change them).
- **Still in flight ⇒ keep looping.** Anything the next pass could advance keeps the loop alive:
  ARMED auto-merge waiting on CI, PREPPED majors pending CI, an IMPLEMENTED issue's PR pending CI,
  checks pending, BEHIND/DIRTY PRs still converging, UNKNOWN mergeability, or a PR merged this pass
  (its stacked siblings, or the issue it closed, may shift state).

The `once` and launchd variants are unaffected — each is one independent pass that exits either
way; a drained headless pass simply reports and exits, and stopping that cadence means unloading
the plist.

## Wiring

This is a canonical dotagents skill. After creating/renaming it, link it into `~/`:
`bash $AGENT_CONFIG_ROOT/scripts/install-local-agent-runtime.sh` (per-skill symlink;
`doctor-agents.sh` then verifies the link). No manifest or GUARDS array to update — skills are
auto-discovered from `skills/*/`.
