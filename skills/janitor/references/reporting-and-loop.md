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

End each pass with a terse, scannable summary — this runs every 5 minutes, so no walls of text.
**Every pass report includes a Local outstanding block, then ends with a schedule footer**
(Schedule footer below) so the user can see leftover locals, last run, next run, cadence, and
whether the loop is bounded — without asking.

```text
Janitor pass — <n> repos, <m> authorized items (<p> PRs, <i> issues)
  MERGED       example-project/example-app#524  aws-sdk cloudwatch (patch, changelog clean)
  ADAPTED      my-org/ExampleGeo#392         undici 6.19→6.21 — adopted renamed request option per changelog, CI green → merged
  ARMED        example-project/example-app#521  @astrojs/vue (auto-merge pending CI)
  REBASED      my-org/ExampleGeo#399         form-data (was BEHIND → update-branch)
  UPGRADED     my-org/my-org-website#405   tailwindcss 3→4 — ran @tailwindcss/upgrade, migrated config to CSS-first @theme, CI green → merged
  PREPPED      my-org/checkboxes#88        eslint 8→9 — flat-config migration pushed, labeled, CI pending → merges when green
  IMPLEMENTED  my-org/ExampleGeo#412 (issue) → PR #414 add CSV export button — /ship review clean, CI green → merged, closed #412
  IMPL(held)   my-org/checkboxes#90 (issue) → PR #91 — built, but bug-scanner flags an unhandled null; JANITOR HOLD comment
  HELD         my-org/ExampleGeo#390         vite 7→8 — migration guide drops the `X` API we use; correct replacement needs your call (partial adaptation pushed, JANITOR HOLD comment)
  HELD         my-org/checkboxes#93 (issue) "make it faster" — too vague to implement; asked which flow + target on the issue
  SKIPPED      my-org/<repo>#NN            author @thirdparty (not authorized)
  CLEANED      example-project/example-app   worktree ~/code/.worktrees/example-app-pr597 + branch dependabot/npm_and_yarn/typescript-7.0.2 (PR #597 merged)
  CLEANED      my-org/agent-config            worktree ~/.cursor/worktrees/agent-config/z9qd + branch cursor/bb603bc2 (already on main)
  RESTORED     my-org/my-org-website       primary onto main (discarded dirt on chore/gh-actions-node24, deleted branch)
  PRUNED       my-org/ExampleGeo             local branch feat/old-export (no open PR)
  PRUNED       my-org/agent-config            local branch cursor/61ac1ba9 (already on main)
  KEPT         example-org/example-app  ~/code/.worktrees/example-app-pr597 (open PR #597)
Local outstanding:
  WT      example-org/example-app  ~/code/.worktrees/example-app-pr597 · dependabot/npm_and_yarn/typescript-7.0.2 · open PR #597
Summary: 1 merged, 1 adapted+merged, 1 upgraded+merged, 1 implemented+merged, 1 armed, 1 rebased, 1 prepped, 2 held, 2 cleaned, 1 restored, 2 pruned, 1 kept, 1 outstanding, 0 errors.
Schedule: last 2026-07-25 09:12:04 EDT · next 2026-07-25 09:17:04 EDT · every 5m · unbounded (until drain)
```

Local-cleanup action rows (`CLEANED` / `RESTORED` / `PRUNED` / `KEPT`) are optional when the arm
found nothing to say; include them when something was removed, restored onto `$DEFAULT`, or
deliberately retained (open PR / locked). They never change drain math.

**Local outstanding is required every pass** (including idle and drained reports) — the full
post-cleanup inventory of leftover linked worktrees and non-default local branches across every
`~/code` primary, per `local-cleanup.md` → Inventory outstanding locals. When there are none:

```text
Local outstanding: none
```

Otherwise **enumerate every leftover** as one `WT` / `BRANCH` row with its keep-guard reason
(`open PR #<n>`, `locked`, `detached`, `primary checkout` if restore refused). Do **not**
summarize ("lists remaining leftovers", "several KEPT", "inventory as usual") — the drained
report must still render the complete de-duplicated list so a human can see why each survivor
stayed. Outstanding rows are visibility only — they never change drain math and never keep
the loop alive. After a successful idle pass the list should be open-PR trees (HELD Dependabot
and other still-open heads), not dirty leftover primaries.

If nothing was actionable but work is still in flight (ARMED pending CI, deferred conflicts,
IMPLEMENTED PRs pending CI, UNKNOWN mergeability), one line, then Local outstanding, then the
schedule footer — the loop keeps ticking. Action rows (`CLEANED`/`RESTORED`/`PRUNED`/`KEPT`) stay optional:

```text
Janitor: N authorized items, all armed/in-flight, nothing to do this pass.
Local outstanding:
  WT  example-org/example-app  ~/code/.worktrees/example-app-pr597 · dependabot/… · open PR #597
Schedule: last 2026-07-25 09:12:04 EDT · next 2026-07-25 09:17:04 EDT · every 5m · unbounded (until drain)
```

If the backlog is **drained** — zero authorized open items, or every remaining one is HELD for a
human — one line, Local outstanding, stop the loop (see Loop termination), and a schedule footer
with no next run. Local cleanup / outstanding inventory does **not** keep the loop alive:

```text
Janitor: backlog drained — 0 actionable items (M held for human). Loop stopped.
Local outstanding:
  WT  example-org/example-app  ~/code/.worktrees/example-app-pr597 · dependabot/… · open PR #597
Schedule: last 2026-07-25 09:12:04 EDT · next none (loop stopped) · was every 5m · stopped after drain
```

### Schedule footer

Append exactly one `Schedule:` line after Local outstanding (which itself follows the summary or
the single-line idle/drained report). Resolve times with the machine's local clock — run
`date '+%Y-%m-%d %H:%M:%S %Z'` at report time; never UTC-only and never omit the zone.

| Field | How to fill it |
| --- | --- |
| **last** | Local wall time when this pass's report is emitted (the `date` output above). |
| **next** | If the armed loop will tick again: `last + interval` in the same local format. If `/janitor once`, launchd-unloaded, or drain-stopped: `none (<reason>)` — e.g. `none (once)`, `none (loop stopped)`. |
| **every / cadence** | The interval the active loop is following (`every 5m` for the default self-armed loop). For `/janitor once`: `once` (no cadence). For a deliberate launchd agent: `every 300s (launchd)` (or whatever `StartInterval` is armed). If the loop just stopped: `was every 5m`. |
| **bound** | Default self-armed loop: `unbounded (until drain)` — no iteration cap; drain termination stops it. `/janitor once`: `1 pass`. A user-armed `/loop` with an explicit count (if any) reports that count; otherwise treat as unbounded until drain/stop. Stopped: `stopped after drain` (or `stopped by user`). |

Examples:

```text
Schedule: last 2026-07-25 09:12:04 EDT · next 2026-07-25 09:17:04 EDT · every 5m · unbounded (until drain)
Schedule: last 2026-07-25 09:12:04 EDT · next none (once) · once · 1 pass
Schedule: last 2026-07-25 09:12:04 EDT · next none (loop stopped) · was every 5m · stopped after drain
```

When first arming the bare-`/janitor` loop (before/as the first pass runs), include the same four
facts in the short arming confirmation so the user sees cadence and bound even before a full
pass report.

## Running it

Each iteration is one pass; the cadence is armed automatically:

- **Default — self-arming loop:** a bare `/janitor` IS the loop request. On invocation, check
  whether this run is already an iteration of an active loop (the `/loop` skill's own framing in
  the prompt). If it is, just run the pass and exit — the loop provides the next tick; **never arm
  a second loop.** If it is not, arm the cadence by invoking the `loop` skill with args
  `5m /janitor`, and let the loop's first iteration run the first pass (don't also run one
  inline — no double pass). Re-runs every 5 min while the session is open (**unbounded until
  drain** — no iteration cap); a drained pass stops it automatically (Loop termination below), or
  stop it any time with the loop's own control. Confirm arming with the schedule footer fields
  (last/next local times, `every 5m`, unbounded until drain).
- **One-shot:** `/janitor once` — run a single pass, arm nothing. Still emit the schedule footer
  (`next none (once)` · `once` · `1 pass`).
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
  self PR needing review, or an issue too ambiguous to implement). Local leftover worktrees/branches
  are **not** backlog items — cleaning them does not prevent drain, leftover `KEPT` open-PR trees
  do not keep the loop alive, and the **Local outstanding** inventory is visibility only (never
  in-flight). When drained, end the loop the janitor armed instead of letting the next
  tick fire: stop it via the `loop` skill's own stop mechanism (don't schedule/reschedule the next
  iteration). Close with the drained report line so the user sees why the loop ended (HELD items are
  theirs to resolve — no further pass will change them).
- **Still in flight ⇒ keep looping.** Anything the next pass could advance keeps the loop alive:
  ARMED auto-merge waiting on CI, PREPPED majors pending CI, an IMPLEMENTED issue's PR pending CI,
  checks pending, BEHIND/DIRTY PRs still converging, UNKNOWN mergeability, or a PR merged this pass
  (its stacked siblings, or the issue it closed, may shift state). Local-cleanup
  `KEPT`/`CLEANED`/`RESTORED`/`PRUNED` rows and Local outstanding alone never count as in-flight.

The `once` and launchd variants are unaffected — each is one independent pass that exits either
way; a drained headless pass simply reports and exits, and stopping that cadence means unloading
the plist.

## Wiring

This is a canonical dotagents skill. After creating/renaming it, link it into `~/`:
`bash ~/code/agent-config/setup/install-local-agent-runtime.sh` (per-skill symlink;
`doctor-agents.sh` then verifies the link). No manifest or GUARDS array to update — skills are
auto-discovered from `skills/*/`.
