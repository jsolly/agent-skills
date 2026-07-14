---
name: remove-feature
description: 'Use when the user says `/remove-feature`, or wants to fully remove/rip out/delete/kill a feature, flag, endpoint, or subsystem from a codebase — "remove X", "rip out the Y feature", "we killed Z, clean up the dead code", "delete the old A path". Interviews to scope the feature, traces it via git history (the commits/PR that first added it) and a codebase deep dive (call-graph from its entry points), builds a complete removal manifest across every orphan category (code, deps, tests, flags, DB, env, routes, assets, docs, IaC), then deletes it in atomic commits with the rest of the app proven still-green. NOT for disabling behind a flag, deprecating with a shim, or fixing a bug — this hard-deletes and leaves no compat layer.'
---

# Remove Feature

> **Author in a worktree.** This skill deletes repo files and lines across many files — work in a git worktree off `main`, never the primary checkout on the `main` branch (`rules/worktree-authoring.md`). Integrate with `/ship`.

Removing a feature fails two ways, and this skill exists to prevent both:

1. **Orphans left behind.** The obvious module is deleted but its residue survives — a now-unused dependency, an orphaned test, a stale feature flag still branched on, a dead DB column, an env var no one reads, an IaC resource still provisioned, a doc describing a thing that no longer exists. Half a removal is worse than none: it looks done while the codebase carries dead weight that misleads the next reader. **The job is total — every artifact the feature ever added, gone or accounted for.**
2. **Collateral deletion.** You delete a helper the feature *used* but that a live path *also* uses, or drop a DB column another feature reads. A removal that breaks a surviving feature is a bug shipped under the banner of cleanup.

The north star: **the feature is gone, nothing that survives references it, and nothing that survives broke.** Evidence — a green suite and a zero-hit reference grep — not a feeling from reading the diff.

The fleet ethos is on your side here: *delete dead code, don't comment it out; git history is the archive; no compat shims; delete the old shape* (`rules/code-style.md`). This skill is that ethos applied to a whole feature at once.

## Phase 1 — Interview & scope (STOP; make no edits)

Do **not** grep-and-delete on a guess. Pin the feature's boundary first, one focused ask at a time (AskUserQuestion, per the fleet's question discipline). Cover, surfacing follow-ups as they come:

- **Identity** — what *is* the feature? Get its name and its **entry points**: user-facing route/page, CLI command/subcommand, API endpoint, UI component, scheduled job, webhook, or feature-flag key. Entry points are where the trace starts.
- **Boundary** — what's unambiguously *part of* the feature vs. shared infrastructure it merely *uses*. The shared stuff stays; name it now so it's never on the delete list.
- **Stateful & external surface** — does it own any of: DB tables/columns/migrations, env vars/secrets, IaC resources (Lambda, queue, cron, alarm, bucket), third-party config (Twilio number, Vercel env, cron entry)? These get special handling in Phase 4 — a dropped DB column or torn-down stack is **destructive and human-gated**, not a code edit you just make.
- **Removal shape** — hard delete now (default, and the fleet's bias) vs. staged (delete code now, drop the DB column in a later migration once no deploy reads it). Confirm which.
- **Data disposition** — for owned DB tables/columns: drop them, or preserve the data (archive/rename) and only stop writing? This is a product decision — ask, never assume drop.

Output of Phase 1: a one-paragraph **scope statement** — the feature, its entry points, its explicit in/out boundary — echoed back and confirmed before any tracing.

## Phase 2 — Trace (git history + codebase deep dive, still read-only)

Find **everything the feature added and everything that will orphan when it goes.**

> **The dominant lesson (from real removals): grepping the feature's name finds the obvious code and misses everything else.** The costly misses are the feature's **support layer** — machinery with *generic* names (a data-backfill job, a benchmark cache, a stretched retention window) that fed the feature but whose names never contain its name. Two techniques find what grep cannot, so do them **first**:
>
> 1. **Git archaeology before any grep** (Pass A) — features get renamed; a current-name grep is blind to the old footprint.
> 2. **"Who is the only reader, and does it survive?"** — for every resource the feature touched, ask *why it exists* and *who still reads it*. A cache that becomes **write-only**, a retention window sized for a now-dead consumer, a column only the removed path selected: these still *run* and "work", so no tool flags them — only this reasoning does.

**A. Git archaeology — what was added when it was built (do this FIRST).** The introducing commit(s)/PR are a near-complete manifest of the feature's footprint; the removal is close to their inverse.

- Find the introduction: `git log --oneline --all -S'<distinctive-token>'` (pickaxe on a string unique to the feature — a flag key, route path, function/table name) finds the commit whose occurrence-count changed, i.e. when it was first added. `git log -G'<regex>'` catches edits/moves the count-based `-S` misses.
- **Trace across renames *before* grepping** — rename blindness is what hides a feature's UI panel and support code from a name-grep. `git log --follow` follows renames **only for a single file**, so use it on one representative file (`git log --follow -- <a-known-feature-file>`); for the *directory* rename chain use the pickaxe or `git log --oneline --all -- '*<token>*'` (a pathspec glob that matches the feature's files under any past directory name).
- **Read the introducing PR's merge diff (`git show <sha>`) as the inverse manifest** — it lists the generically-named support code the name-grep will never surface. Files added *only* in that PR and never since touched by unrelated work are prime hard-delete candidates (confirm each is still feature-only — later commits may have added shared use).

**B. Codebase call-graph — what references it today.** Start at each entry point and fan outward:

- **`tsc` as your worklist (TS repos).** Delete the entry module (or stub the export), run the repo's typecheck — *the errors enumerate every live reference*. This is the same "let the typechecker be your hands" trick `refactor` uses, run in reverse: each error is a site to triage — delete if feature-only, keep (and repoint) if it's a shared symbol you're not removing. Far more reliable than grep alone for TS.
- **Static dead-code tools** where present: `knip` (unused files/exports/deps in one pass), `ts-prune`/`unimported`, `depcheck` for now-unused dependencies; `vulture`/`deadcode` for Python. Run them *after* the first deletion pass to surface newly-orphaned code the typechecker won't flag (dynamically-referenced code, unused deps).
- **Reference grep across every artifact class** — not just `.ts`. The feature's name/flag-key/route will appear in tests, config, env samples (`.env.example`), IaC templates, docs, comments, CSS, and package scripts. `grep -rn '<feature-token>'` across the repo is the orphan census; every hit is a decision.

Consult **`references/orphan-smells.md`** — the per-category taxonomy of what gets left behind and the detection signal + tooling for each (code, deps, tests, flags, DB, env, routes, assets, docs, CSS, IaC). Walk every category; a category you skip is where the orphan hides.

Output of Phase 2: the **removal manifest** below.

## Gate — the REMOVAL MANIFEST (STOP; hand off before deleting)

Print this filled in. Blanks demand real values — file paths, grep counts, commit SHAs — not intentions. This is the delete list — and the self-contained brief a fresh agent would execute. Do **not** start deleting after printing it; the handoff pause below is the seam.

```text
REMOVAL MANIFEST — <feature>
introduced:   <commit/PR SHA(s) that first added it — the footprint to invert>
entry points: <routes / commands / endpoints / flag keys / jobs being removed>
oracle:       <the repo's check+test commands — read its AGENTS.md/package.json; fallback npm run prepush>
baseline:     <oracle result line — GREEN before any deletion>

DELETE (feature-only):
  files:      <whole files to rm — each confirmed feature-only>
  symbols:    <exports/functions/types to delete from surviving files, w/ file:line>
  deps:       <package.json deps to drop — confirmed no other importer (depcheck/knip)>
  tests:      <test files/cases to remove>
  flags:      <feature-flag keys + every branch that reads them>
  routes:     <endpoints/pages/handlers to unregister>
  assets:     <images/components/CSS to remove>
  docs:       <doc sections/README lines/comments describing the feature>
  schema:     <SWEEP — not just the obvious table:
               · columns on KEPT tables (name isn't feature-named; find each column's live reader)
               · enum types / sequences orphaned by a DROP (DROP TABLE does NOT cascade the enum)
               · retention/window tunables (LOOKBACK/RETENTION_DAYS) sized for the dead consumer
               (the code that reads these is deleted here; the actual DROP is HUMAN-GATED below)>
  observ.:    <SWEEP — lives outside src/, in the IaC template: alarms, metric filters, dashboards,
               log groups, SNS subs tied to the feature. For each: does the log field it keys on still
               have a live emitter? If yes it's KEPT (audit its stale description/comment); if no it's
               orphaned. First establish whether the feature had DEDICATED infra at all.>
KEEP (shared — used by surviving code; do NOT touch):
              <symbols/files the feature used that live paths also use>
VERIFY REPLACEMENT (additive orphans the removal can introduce):
  backup/DR:  <any NEW replacement table added to the backup grant list + BACKUP_TABLES? row-presence
               settings tables silently vanish on restore if omitted — audit the replacement, not just the removal>
  convention: <replacement built to the repo's current convention? (e.g. enum vs text+CHECK)>
HUMAN-GATED (destructive / infra — agent PROPOSES, does not execute):
  db:         <tables/columns/enums/migrations — drop vs. preserve, per Phase-1 data disposition>
  data:       <purge of historical rows of the dead type (e.g. DELETE ... WHERE type='<gone>') —
               a prod-DATA write, so agent proposes the exact DELETE, a human runs it; optional, flag never silent>
  env/secret: <env vars / SSM params / secrets to retire>
  iac:        <CFN/SAM resources, cron, queues, alarms — stack update is human step-up>
  external:   <Twilio/Vercel/Cloudflare config to remove in-console>
```

- **Baseline red?** Stop — you can't prove your deletion is what keeps it green if it started red.
- **Anything in HUMAN-GATED?** Those follow `rules/agent-cloud-access.md`: prod DB migrations and IaC stack changes are **human step-up** — the agent removes the resource *from the template/migration in the diff* and **proposes the exact apply command**, a human runs it. Never `supabase db push`/`sam deploy` a destructive change yourself. DB drops also route through a `db-migration-reviewer` pass.
- **`schema` + `observ.` are the non-obvious sweeps** — the ones a `src/`-only grep never surfaces and where most real misses hide. Walk `references/orphan-smells.md` §6/§8/§9 explicitly; don't fold them into "code".
- **Manifest bigger than one reviewable removal?** Split by seam (e.g. "remove the UI, then the API, then the schema") and do them as separate ships.

## Hand off — pause before execution

The filled manifest is the finish line for *this* skill's planning work. **Do not roll straight from an approved manifest into deleting.** Interview + archaeology + call-graph tracing is a high-reasoning posture — the wrong, and most expensive, configuration for the mechanical delete loop — and the user may want a different model, a fresh context, or a workflow to carry the removal out. So you stop, and you hand off cleanly:

- **Emit the filled REMOVAL MANIFEST as a self-contained, copy-pasteable block.** Include the Phase-1 scope statement, the DELETE/KEEP/HUMAN-GATED lists, the oracle + baseline line, and the leaf-before-root delete order. A *fresh agent with none of this conversation* must be able to execute from that block alone — it has to survive a model switch or a new session, because that is exactly what may happen next. (If the baseline is red, or the user rejects the manifest, there is nothing to hand off — say so plainly and stop; don't manufacture an Execute path the gate just blocked.)
- **Then pause with one final `AskUserQuestion`** — the handoff fork (`multiSelect: false`; this is a committed choice, same single-select shape as the Phase-1 interview). Options: **execute here now** with the current model; **switch model first** (the user runs `/model` — e.g. down to a faster/cheaper executor, or to a different model entirely — then tells you to go); **hand the plan to a workflow** to fan the delete slices out across subagents; or **stop here** with the manifest captured, nothing more to do. The user's real intent, as always, can land in "Other."
- **Do not begin Execute until the user answers.** Picking "switch model first" means you stop and wait — the point of the pause is to give them the seam to change models before any deletion work is spent. Approving the manifest earns the feature the right to be removed; it does not oblige *you* to be the one who deletes it.

## Execute — delete in atomic commits, oracle green between each

- **Order: leaves before roots.** Remove callers/tests/routes first, then the now-unreferenced core, then the newly-orphaned deps/config last. Each atomic step (`rm the component`, `drop the flag branch`, `delete the endpoint`, `prune the dep`) is **its own commit**, oracle green between each — a failure localizes to one step and reverts clean.
- **Delete the whole shape — no shims.** Don't leave a stub function returning `null`, a flag defaulting off, a commented-out block, or a re-export "for compatibility." The feature is gone, not disabled (`rules/code-style.md`). A flag removal deletes the flag *and* collapses every `if (flag)` to its surviving branch.
- **Re-run the orphan tools after the core deletion** (`knip`/`depcheck`/`vulture`): removing the feature turns its private helpers and deps into fresh orphans the first pass couldn't see. Loop until they report clean — that's the tail where orphans hide.
- **Pre-commit, every commit:** `git diff --stat`; anything touching a KEEP file or outside the manifest is collateral — `git checkout -- <file>` and re-approach. Commit message names what left: `chore(remove): drop <feature> <slice> [manifest: <n> files]`.

## Gate — REMOVAL EVIDENCE (STOP before declaring done)

Print filled in; every line is an artifact you produced, not an affirmation.

```text
REMOVAL EVIDENCE — <feature>
oracle before:    <baseline line>     oracle after: <same command now — must be GREEN>
reference sweep:  grep -rn '<feature-token(s)>' → <MUST be 0 live hits; list any and justify (e.g. changelog)>
orphan tools:     knip/depcheck/vulture → <clean, or every remaining hit justified as pre-existing>
deps pruned:      <deps removed + lockfile updated | none>
kept-code intact: <the shared symbols in KEEP still compile & their tests pass>
human-gated:      <for each: the exact command emitted for the human, or "n/a">
docs/config:      <README / .env.example / config references updated | none existed>
falsification:    <the ONE surviving path most likely to have depended on the feature — why it didn't break>
scope:            <git diff --stat — all within the manifest>
```

If the reference sweep has a live hit you can't justify, or you can't write the falsification line, the removal is incomplete — keep going.

**Then hand off the judging:** spawn `bug-scanner` (did a surviving path lose something it needed?) and, if the diff dropped deps or touched shared modules, `code-quality-reviewer`, scoped to `git diff --name-only <baseline>..HEAD`. Prompt: *"This diff removes the '<feature>' feature. Flag any surviving reference to it, any shared symbol wrongly deleted, any orphan (dep/test/flag/asset/config) left behind, and any place a compat shim was left instead of a clean delete."* High-confidence findings re-enter Execute; not done while one is open.

**Before pushing:** run the repo's **full** test battery (not just the oracle subset) — a removal that breaks a distant surviving feature only shows up in the suite you didn't run. Running solo, the DB-touching/E2E tests are safe to run, so run them.

## Ship & the human-gated tail

- **Watch the deploy-gate trap:** a prose-only edit to an IaC file (e.g. fixing a stale comment in `aws/template.yaml`) can trip a repo's "refuse infra-only deploy" gate and strand the whole deploy (migrations + Lambda never ship while the web tier does → runtime 500s). If your doc/comment cleanup touches an IaC file, check the repo's deploy gates before pushing.
- **Ship** the code deletion via `/ship` (branch → PR → CI-gated merge).
- **Then walk the HUMAN-GATED list with the user:** prod DB migrations, SAM/CFN stack updates, and external-console changes ride their own gated paths (`rules/agent-cloud-access.md`) — you proposed the exact commands in the evidence block; the human executes them. The removal isn't truly complete until that tail is done, so **say what remains** rather than reporting "done" on the code merge alone (fail-loud).

## Don't

- **Don't leave orphans "for later"** — a dropped feature whose flag/dep/column survives is the exact smell this skill exists to kill. Account for every category or say explicitly why one stays.
- **Don't delete a KEEP symbol** — shared code the feature used but live paths also use stays untouched; deleting it is collateral damage, not thoroughness.
- **Don't run a destructive prod migration or stack teardown yourself** — propose the command, a human runs it (`rules/agent-cloud-access.md`). Removing the resource from the template/migration in the diff is fine; applying it to prod is not.
- **Don't comment out or shim** — delete the shape; git history is the archive.
- **Don't skip the interview** — guessing the feature boundary is how you delete shared code or miss half the footprint.
- **Don't skip the handoff pause** — printing the manifest is not permission to delete. Emit it, ask the fork (`execute here` / `switch model` / `workflow` / `stop`), and wait. Rolling straight into Execute burns the expensive planning model on mechanical deletes and steals the user's seam to change agents.
