---
name: refactor
description: 'TypeScript refactoring that provably preserves behavior. Use for "refactor this", "clean up this code/file", "this file is a mess", "extract / split / reorganize / DRY this out", or periodic tech-debt reduction ("what should we clean up here?"). Two modes: census (scan a module, emit a prioritized debt plan) and targeted (execute one named refactor through contract → atomic commits → equivalence evidence). NOT for bug fixes, behavior changes, or feature work — those are not refactors. Less drastic than a rewrite.'
---

# Refactor

> **Author in a worktree.** This skill edits repo files (atomic commits below) — work in a git worktree off `main`, never the primary checkout on the `main` branch (`rules/worktree-authoring.md`). Integrate with `/ship`.

A refactor can only fail two ways, and this skill exists to prevent both:

1. **Silent behavior change.** Hallucinated equivalence (`arr.filter().map()` ≡ `arr.reduce()`, a moved `await` preserving order), a caller you never grepped, a narrowed type some caller violated at runtime. *A green `tsc` is not proof — see the evidence gate.*
2. **Scope sprawl.** A "rename this type" becomes a 400-line rewrite mixing three concerns, unreviewable and unrevertible. **Touching a file you didn't need to touch is a defect.** Go *deep* on the chosen change (no compat shims, delete the old shape); never go *wide* beyond it.

The goal is a more maintainable codebase **by this repo's definition** (house rules below), with **evidence** — not a feeling from reading the diff — that behavior is unchanged. A refactor that silently alters behavior is net-negative maintainability: a hidden bug plus churn.

**Run the tests — that's what the evidence is made of.** This skill runs *solo and infrequently*: no other agent is sharing the local DB, the dev server, or any stateful fixture, so there is no contention reason to skip, sample, or defer a test. Prefer *running* the suite over *reasoning* about equivalence from reading the diff — a green run is the evidence; a plausible argument is not. Run tests eagerly and often: to establish the baseline, between every commit, and in full before you hand off. When a slower or DB-touching/E2E suite exists, running it is the safe default here, not a luxury — a `db reset`/seed or a suite that mutates local state is fine to run. Skipping a test you *could* have run is the evidence gap that lets a silent behavior change through.

## Entry: census or targeted?

**Census** — the ask is vague ("clean this up", "reduce tech debt", "what's messy here?"): do a **read-only** scan first; make no edits. Look for: re-exports/barrels (grep both forms — see `rules/code-style.md`), types/constants inline instead of `types.ts`/`constants.ts`, single-file folders and one-function files, optional-field bags that should be discriminated unions, `any`/`as` density, dead exports (`knip` if present), god functions. Emit a prioritized plan — one line per atomic refactor, each with its importer fan-out, ordered by value/risk:

```text
DEBT PLAN — src/lib/messaging
1. Remove re-export shim email/index.ts → repoint 4 importers        [fan-out: 4]
2. Extract inline types from send.ts → messaging/types.ts            [fan-out: 2]
3. Payment: optional-field bag → discriminated union                 [fan-out: 7]
```

Each line is a valid future invocation of this skill. Let the user pick; execute **one line at a time** through the gates below.

**Targeted** — the user named the change: go straight to Gate 1.

---

## Gate 1 — STOP before the first edit

Print this block, filled in, before touching any file. Blanks demand real values — a command, a file list, a count — not intentions.

```text
REFACTOR CONTRACT
change:    <one line — the single transform this session performs>
files:     <explicit set of files allowed to change>
oracle:    <the repo's own check+test commands — read its AGENTS.md/package.json; fallback: npm run prepush.
           MUST actually run tests, not just typecheck — a green tsc is not the oracle. Pick the
           broadest test command you can run per-commit without it being painfully slow; running
           solo, err toward more coverage.>
baseline:  <paste the oracle command output's final line — must be green BEFORE any edit>
importers: <for each exported symbol touched: grep count + list; name any NOT yet read>
```

- **No green oracle?** That's the whole job until one exists. No tests on the target → build a throwaway pin of current behavior first: `references/characterization-harness.md`.
- **Baseline red?** Stop — a refactor on top of pre-existing failures can't be distinguished from one that caused them.
- **Importer fan-out too large to keep atomic?** Don't refactor — emit a decomposition plan (census format above) and hand it back.

## Execute — one transform per commit

- Each atomic transform (extract constant → move type to `types.ts` → repoint imports) is **its own commit**, oracle green between each. A failure then localizes to one move; a revert is one clean `git revert`.
- **Let the typechecker be your hands, not your report card.** To remove a re-export or rename a symbol: make the breaking change, run `tsc` — *the errors are your worklist*. Don't plan the full edit from static reading; induce the errors and let them enumerate the call sites.
- A rename is a **transposition**: definition, every call site, tests, types — one pass. The typecheck must fail until it's uniform.
- **Pre-commit, every commit:** run `git diff --stat` and compare against the contract's file set. Any file outside it: `git checkout -- <file>` — a revert you execute, not a temptation you resist. Then commit with the contract echoed: `refactor(<scope>): <transform> [contract: <files>]`.
- Suspect you broke something? Revert the commit and re-approach smaller. A clean revert beats a clever patch on a bad refactor.

## Gate 2 — STOP before declaring done

Print this block, filled in. Every line must be an artifact you produced, not an affirmation.

```text
EQUIVALENCE EVIDENCE
oracle before:   <paste baseline result line from the contract>
oracle after:    <paste the same command's result line now — must match>
tests edited:    <none | STOP: an edited test means behavior changed — split it into its own labeled commit>
API surface:     <public-surface change? emit .d.ts before AND after to temp dirs and diff —
                  tsc --emitDeclarationOnly --declaration --outDir <tmp> (the bare --noEmit the
                  repo runs won't emit; --declaration is required). The .d.ts diff must be empty.>
laundering:      <rule out EACH, by name, for THIS diff:
                  as-casts added: <…>  any added: <…>  dynamic key access: <…>
                  runtime validators still asserting old shape: <…>
                  type narrowing (T|undefined→T, string→brand): proven at every call site? <…>>
perf:            <complexity/allocations in hot paths unchanged? one line>
falsification:   <the ONE call site most likely to have changed behavior — and the argument why it didn't>
scope:           <paste git diff --stat — every file inside the contract set>
```

If you cannot write the falsification line — or the equivalence argument a reviewer would need to approve without running it — the refactor is too big or too clever. Shrink it.

**Then hand off the judging:** spawn `code-quality-reviewer` (plus `bug-scanner` for larger diffs) scoped to `git diff --name-only <baseline>..HEAD`, prompt: *"This diff claims pure behavior-preserving refactoring — flag any re-export or inline type/constant that crept in, any `as`/`any` laundering, and any hunk whose equivalence you can't argue in one sentence."* High-confidence findings re-enter the Execute loop; the refactor isn't done while one is open.

**Before pushing: run the repo's full test battery, not just the oracle subset.** The oracle is scoped for fast per-commit feedback; the pre-push run is the whole suite — unit, integration, and every DB-touching/E2E test the repo has. Per the run-the-tests principle above, running solo means the stateful ones are safe to run — so run them. A refactor pushed on the oracle alone when a fuller suite exists is an evidence gap, not a time save.

---

## Worked trace (what compliant output looks like)

```text
User: "clean up the discount logic in pricing.ts"

REFACTOR CONTRACT
change:    extract duplicated membership-rate logic into constants.ts Record map
files:     src/pricing/pricing.ts, src/pricing/constants.ts
oracle:    npm run check:ts && npm test -- pricing
baseline:  Tests: 14 passed, 14 total ✓ / tsc: 0 errors
importers: getDiscountRate exported? no — module-local only. 0 external importers.

[edit 1] add DISCOUNT_RATES: Record<Membership, number> to constants.ts → tsc green
→ commit: refactor(pricing): extract DISCOUNT_RATES to constants.ts [contract: pricing.ts, constants.ts]
[edit 2] replace the if-chains with `DISCOUNT_RATES[m]`. FIRST pin the old output for
         EVERY key: gold/silver hit an if; bronze fell through to the fn's explicit
         `return 0`, so bronze was already 0 — pinning bronze:0 reproduces it exactly.
         (Had the old fn returned undefined for bronze, pinning it to 0 would be a
         behavior change: a Record forcing a key is never license to invent a value the
         old code didn't produce — that goes in a separate, labeled commit.)
→ commit: refactor(pricing): replace duplicate rate chains with DISCOUNT_RATES lookup [contract: …]

EQUIVALENCE EVIDENCE
oracle before:   14 passed / 0 errors      oracle after: 14 passed / 0 errors
tests edited:    none
API surface:     no exported signature changed (.d.ts diff empty)
laundering:      as-casts: 0 added (grepped) · any: 0 · dynamic keys: none ·
                 validators: no schema touches Membership · narrowing: none performed
perf:            O(1) map lookup replaces O(1) if-chain — unchanged
falsification:   riskiest site = bronze: confirmed old fn's explicit `return 0` default
                 already yielded 0 (not undefined); DISCOUNT_RATES[m] returns that same 0.
scope:           2 files changed — both in contract set

→ code-quality-reviewer on the 2 files: no findings. Done.
```

---

## House rules (what "maintainable" means here)

Canonical in `rules/code-style.md` and `rules/typescript-strict.md` — consult them, don't re-derive them. The refactor-time operationalizations:

- **Extractions have destinations:** types → the module's `types.ts`; magic values and `as const` maps → `constants.ts`. Not inline, not mixed.
- **Moving a symbol = repointing every importer in the same commit.** Never leave a forwarding `export { x } from "./old"` shim "for compatibility" — no re-exports, ever.
- **Leave no single-file folder or one-function file behind.** A refactor that strands one isn't done — flatten or grow.
- **Delete the old shape in the same commit** that introduces the new one. Git history is the archive.

Smell → fix patterns (branded types, discriminated unions, strategy maps, guard clauses, dead-code biopsy): grep `references/smells.md`.
