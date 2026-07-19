# Orphan Smells — the per-category catalog

The taxonomy of what a removed feature leaves behind, the detection signal for each, and the tool
that finds it. Grounded in (a) verified tooling research and (b) a real fleet removal
(`example-app#542`, "Smart Price Alerts") where an agent's first pass missed most of this and the
user had to push it out one category at a time. Read this during **Phase 2 (trace)** and walk *every*
row — a category you skip is where the orphan hides.

## The one lesson that dominates all others

**Grepping the feature's name finds the obvious code and misses everything else.** In the real
removal, the biggest misses were the feature's **support layer** — machinery with *generic* names
(sector backfill, benchmark caching, a stretched data-retention window) that fed the feature but
whose names never contained "anomaly" or "smart-price". Name-grep is structurally blind to it. Two
techniques find it and grep cannot:

1. **Git archaeology first, before any grep.** The feature was *renamed twice*
   (`instant-alerts/` → `market-notifications/` → `market-notifications/anomaly-alerts/`), so a
   current-name grep found none of its earlier footprint. Walk the introducing PRs/commits and read
   their diffs as the "what to remove" manifest (§Git techniques below).
2. **"Who is the only reader, and does it survive?"** For every resource the feature touched, ask why
   it exists and who still reads it. A cache that becomes **write-only**, a retention window sized for
   a **dead consumer**, a column only the removed path selected — these still *run* and "work", so no
   tool flags them; only this reasoning does. (In #542: SPY + 11 sector-ETF quotes were still fetched
   every minute — ~13 wasted vendor calls/min — writing rows nobody read.)

## Static-analysis reality (applies to every tool below)

Every static tool answers one question — **"is this reachable from a live entry point?"** — and they
split into two error directions:

- **Static graph tools** (Knip, Vulture) *over-approximate usage*: they miss dynamically/reflectively
  referenced code (`getattr`, string-built keys, dynamic `import()`), so they can call live code dead
  **and** miss dead dynamic code. Output is **candidates, not verdicts.**
- **Runtime coverage** (Chrome DevTools Coverage panel, coverage.py, nyc) *under-approximates usage*:
  only code exercised during the recording counts, so un-triggered paths look dead.

They disagree exactly on dynamic code. **Agreement between a static tool and coverage is your
highest-confidence dead-code signal** — cross-check before deleting anything reflective.

---

## Category catalog

### 1. Unreferenced files / exports / functions (TS/JS)

- **Signal:** nothing imports the file; no live path references the export.
- **Tool:** **Knip** — the modern default; builds a whole-project module graph and reports unused
  files, exports, and dependencies in one pass (supersedes `ts-prune`, now maintenance-only). Run it
  *after* the first deletion pass — removing the feature turns its private helpers into fresh
  orphans Knip couldn't see while they were still referenced. `tsc --noUnusedLocals` catches
  file-local unused symbols but not cross-file unused exports (no whole-program view).
- **The `tsc`-as-worklist trick:** delete the entry module, run the repo's typecheck — the errors
  *enumerate* every live reference. Triage each: delete if feature-only, keep+repoint if shared.

### 2. Unreferenced code (Python)

- **Signal:** defined-but-never-used names.
- **Tool:** **Vulture** (AST; per-finding confidence — imports 90%, unreachable/unused-args 100%,
  functions/classes/vars 60%; tune with `--min-confidence`). **deadcode** can auto-strip
  (`deadcode . --fix`, preview with `--fix --dry`). Both miss `getattr`-style dynamic dispatch.

### 3. Now-unused third-party dependencies

- **Signal:** a package in the manifest that nothing imports anymore.
- **Tool:** **Knip** / **depcheck** (JS/TS); **deptry** rule **DEP002** (Python — "declared but never
  imported"). Run after the code deletion; prune the dep **and** update the lockfile in the same commit.

### 4. Orphaned tests & fixtures

- **Signal:** a test file importing a now-deleted module or exercising a dropped DB object/RPC.
- **Tool:** no graph tool lists these from the source-removal set — **grep `tests/` for imports of
  each module you delete.** In #542 ~8 test files (`anomaly-detection.test.ts`, `daily-stats*.test.ts`,
  `snapshot-store.test.ts`, `delivery.test.ts`, a cooldown-RPC test…) referenced deleted objects and
  were missed by the source-only list. Watch for **mixed** tests that exercise both the removed and a
  surviving feature — split, don't delete wholesale.

### 5. Stale feature flags & their config

- **Signal:** a flag no longer evaluated (**Inactive**), or serving one variation to all
  contexts (**Launched**).
- **Tool:** a flag-reference finder (e.g. LaunchDarkly `ld-find-code-refs`). **Delete the flag *and*
  collapse every `if (flag)` to its surviving branch** — a flag left defaulting-off is not a removal.

### 6. Dead database columns / tables / enums / sequences

This is the richest non-obvious category. Dropping the obvious table is step one; the residue:

- **Column on a KEPT table** — survives because the table survives; its name isn't feature-named.
  *(#542: `assets.sector`, read only by the removed scorer + a dead endpoint.)* **Signal:** for each
  *kept* table, list every column and confirm a live reader.
- **Enum type not cascade-dropped** — `DROP TABLE` / `DROP COLUMN` does **not** drop the column's enum
  type; it dangles. *(#542: `price_alert_delivery_status` was missed while its sibling
  `alert_move_size` was caught.)* **Signal:** after every drop, enumerate `pg_type` enums (and
  sequences) with zero remaining column consumers.
- **Constant/dead column at scale** — PostgreSQL wiki "Finding useless columns": one query over
  `pg_statistic` where `stadistinct between 0 and 1` (0 = all-null/unknown, 1 = single constant) on
  real tables flags columns nothing meaningfully writes. Planner estimates → candidates, verify.
- **Historical row data** — rows of a now-dead category in a free-text column nothing constrains
  (*#542: `notification_log.type = 'price_alert'`*). Inert; a *deliberate optional* `DELETE`, not a
  schema migration. Flag it; don't silently leave it *or* silently purge it.
- **Retention / window tunables** — a `LOOKBACK_DAYS` / `RETENTION_DAYS` widened to feed the removed
  feature's baseline. *(#542: 35→14 and 30→14, sized for an ATR-14 volatility baseline the surviving
  sparkline doesn't need.)* **Signal:** ask *why* each tunable was set that high; a window sized for a
  dead consumer is an orphan.

### 7. Backup / DR coverage (the *additive* orphan — silent data loss)

- **Signal:** the feature's **replacement** table isn't in the backup set — no `GRANT SELECT … TO
  backup_readonly`, absent from `BACKUP_TABLES`. Backups "succeed"; the omission only bites on restore.
  *(#542: the new `price_move_alert_thresholds` — where row-presence == "alert enabled" — was left out;
  a disaster restore would have silently disabled every user's alerts. The prior config table
  `price_targets` was in the list; precedent existed and wasn't followed.)*
- **Rule:** any **new** user-settings table introduced by the replacement must be added to the backup
  grants + table list. **Audit the replacement, not just the removal.**

### 8. Observability tied to a kept-but-changed Lambda/service

- **Signal:** alarms, metric filters, dashboards, log groups, SNS subscriptions attached to a function
  whose *purpose changed* when the feature left. They're **outside `src/`** (in the SAM/CFN template),
  so a code grep never sees them.
- **How to judge:** for each alarm/metric-filter, confirm the **log field it keys on still has a live
  emitter.** *(#542: the `ComputeDailyStats*` alarms key on generic `$.level="error"` /
  `vendor_retry_exhausted` — still emitted, so **not** orphaned; the Lambda survived, repurposed to
  cache daily closes.)* The leftovers were **stale descriptions/comments** ("missed daily snapshot",
  README "ADV-20 and ATR-14") — audit those too. **A deliberate observability sweep is the only thing
  that distinguishes "still live" from "orphaned" here** — neither grep nor a dead-code tool will.

### 9. Abandoned infrastructure (IaC / cron / queues / dedicated resources)

- **Signal:** a resource the feature *owned* — its own Lambda, `ScheduleV2`/cron, queue, alarm, bucket,
  IAM grant. **First establish whether the feature had dedicated infra at all** — in #542 the anomaly
  pipeline ran *inside* an existing scheduled function, so `aws/template.yaml` was correctly untouched.
  Don't assume infra exists; don't assume it doesn't.
- **Tool:** diff IaC (`terraform plan`/state, or grep the SAM template for the feature's resource
  names). Common orphan shapes in cloud state: unattached volumes, idle load balancers, alarms whose
  metric no longer emits, queues with no producer. **Removing the resource from the template is a code
  edit; applying the teardown to prod is human-gated** (`rules/agent-cloud-access.md`).

### 10. Orphaned API endpoints / routes

- **Signal:** a handler nothing calls (the UI that called it was removed). *(#542: `/api/assets/prices`
  fed the deleted move-size selector.)* **Tool:** grep for the route string; check the client caller
  set. (Research: no dedicated tool verified — grep + caller trace.) Remove the handler **and** its test.

### 11. Unreachable UI components & static assets

- **Signal:** a component no route renders; an image/font nothing references. *(#542: the whole
  `MarketNotificationsPanel.vue` sensitivity selector + its async wiring in `DashboardPanels.vue` —
  the "biggest miss", invisible because the panel had been renamed.)*
- **Tool:** Knip (unused files) for components; grep asset filenames. Runtime **Chrome DevTools
  Coverage** confirms a **JS/CSS bundle** is never executed (Coverage measures JS/CSS bytes only — for
  an image/font "never loaded", use the **Network panel**, not Coverage).

### 12. Dead CSS

- **Signal:** selectors no live markup uses.
- **Tool:** **PurgeCSS** (content-token match; safelist dynamically-built class names to avoid false
  positives). Chrome Coverage for runtime confirmation.

### 13. Hand-authored type remnants (vs generated)

- **Signal:** a hand-written type alias / union member for the removed feature. **Generated** type
  files (`database.types.ts`) regenerate clean via the repo's codegen; **hand-authored** ones
  (`src/lib/db/types.ts`) do **not**. *(#542: `AlertMoveSize` alias + two updatable-column union
  members lingered.)* **Rule:** regenerate the generated, grep the hand-authored.

### 14. Dead function parameters

- **Signal:** a param now always the same literal, or a pass-through nothing needs. **knip/Vulture do
  not flag dead *options*.** *(#542: a `notificationType` collapsed to one literal + three `failure*`
  pass-throughs.)* Caught only by reading the call sites the removal touched.

### 15. Dangling docs / comments / prose

- **Signal:** README/FAQ/AGENTS.md text and code comments describing the gone feature. *(#542: README
  "configurable sensitivity (Significant/Extreme)", a SAM-template comment, FAQ copy.)* Grep the
  feature's user-facing nouns across `*.md` / `*.astro` / comments.

### 16. Unused environment variables / secrets

- **Signal:** an env var, SSM param, or secret only the removed feature read — now set but consumed
  nowhere. Lingers in `.env.example`, the deploy env, Lambda config, SSM, or a secrets manager.
- **Tool:** grep the var name across `.env*`, config, IaC, and code; for a config-object it may hide
  behind `process.env.<X>` / `os.environ[...]`. No dead-code tool covers env — it's a name grep plus
  "who still reads it?". **Retiring the value from a live env / SSM / secrets store is a prod change →
  HUMAN-GATED** (agent proposes, human executes; `rules/agent-cloud-access.md`). Deleting the
  `.env.example` line and the now-dead `process.env.<X>` read in code is a normal code edit.

### 17. Convention drift on the *replacement* (adjacent, but cheap while unpushed)

- Not an orphan, but the same sweep catches it: a replacement built against an older convention
  (*#542: a `text` + CHECK column where the repo had a committed migration mandating enums*). Cheap to
  fix before push; a second prod migration later if missed.

---

## Git techniques (language-agnostic, do these FIRST)

- **`git log --oneline --all -S'<distinctive-token>'`** — pickaxe on an exact string (flag key, route,
  function, table name). Finds the commit that changed its occurrence count — i.e. **when it was first
  added and when it was removed.** The best "find the introducing PR" probe.
- **`git log -G'<regex>'`** — broader than `-S`: matches any commit whose patch text adds/removes a
  line matching the regex, even when the total count is unchanged (edits/moves `-S` misses).
- **`git log --follow -- <single-file>`** — follows renames, but **only for one file** (git limitation).
  Use it on a representative feature file. For the *directory* rename chain (what hid #542's UI panel
  and support layer), `--follow` on a dir does nothing — use `git log --oneline --all -- '*<token>*'`
  (a pathspec glob matching the feature's files under any past directory name) or the pickaxe above.
- **Read the introducing PR's diff** (`git show <merge-sha>`) as a near-complete inverse manifest —
  the feature's removal is close to the negation of its introduction, *including* the generically-named
  support code the name-grep will never surface.

## The deploy-gate gotcha (fleet-specific)

A doc/comment-only edit to an **infra file** (e.g. a one-word comment fix in `aws/template.yaml`) can
trip a repo's "refuse infra-only deploy" gate and **strand the whole deploy** (migrations + Lambda
never ship while the web tier does → runtime 500s). If your cleanup touches an IaC file for prose only,
check the repo's deploy gates before pushing. (Caught by `infra-reviewer` in #542.)
