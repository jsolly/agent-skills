# Characterization harness (for refactoring code with no tests)

When the target has no tests, **trap the current behavior before changing it** — your mental model of what the code does is exactly the thing that's unreliable on the edge cases. Pin the outputs, refactor against the pins, then delete the harness.

## Template (`tsx` scratch harness)

Write to the scratchpad (or a gitignored path) — never commit it:

```ts
// characterize.ts — throwaway; delete after the refactor
import { targetFn } from '../src/path/to/target';

const cases: Array<[string, () => unknown]> = [
  ['happy path',        () => targetFn({ id: 'u1', total: 100 })],
  ['zero total',        () => targetFn({ id: 'u1', total: 0 })],
  ['negative total',    () => targetFn({ id: 'u1', total: -5 })],
  ['missing user',      () => targetFn(null as never)],          // pin the ugly behavior too
  ['unicode / empty',   () => targetFn({ id: '', total: 1 })],
];

for (const [name, run] of cases) {
  let out: unknown;
  try { out = run(); } catch (e) { out = `THREW: ${(e as Error).message}`; }
  console.log(`${name}: ${JSON.stringify(out)}`);
}
```

## Procedure

1. Run it **before** any edit (`npx --no-install tsx characterize.ts > before.txt`) — this output, including the weird results and the throws, IS the current behavior. Don't "fix" surprises you find; pin them.
2. Refactor per the SKILL.md gates.
3. Run it after; `diff before.txt after.txt` must be empty.
4. Delete the harness and the output files — they never land in a commit. If a pinned case revealed a real bug worth fixing, that's a separate behavior-change commit *after* the refactor, with the harness case promoted into a real test.
