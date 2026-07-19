---
description: Strict TypeScript fleet baseline and CI check commands
paths: ["**/*.{ts,tsx,mts}", "**/tsconfig*.json"]
alwaysApply: false
---

# Strict TypeScript (fleet standard)

All TypeScript repos under `~/code` share one strictness baseline via `dotagents/tsconfig/`.

## Baselines

| Profile | File | Use when |
| --- | --- | --- |
| **tsc** | `dotagents/tsconfig/strict-tsc.json` | Node/Lambda/Vite apps checked with `tsc --noEmit` |
| **astro** | `dotagents/tsconfig/strict-astro.json` | Astro apps extending `astro/tsconfigs/strict` |

Both profiles enable `noUncheckedIndexedAccess`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, and disallow unreachable code / unused labels.

The **tsc** profile also sets `strict: true` and `noUnusedLocals`. The **astro** profile omits `noUnusedLocals` because `@astrojs/ts-plugin` false-flags imports that are only used in `.astro` frontmatter; rely on Biome `noUnusedImports` for `.ts`/`.vue` instead.

Repos that already use `exactOptionalPropertyTypes` (misc-notifications, shared-infra, todoist-backlog-scheduler) keep it as a repo-local addition on top of the baseline.

**CI:** GitHub Actions runners do not have a host agent-config checkout unless you add one. Repos whose `tsconfig.json` extends a shared baseline should **vendor a copy** of that baseline JSON into the repo (e.g. `tsconfig/strict-astro.baseline.json`) so CI typecheck is self-contained.

## Check commands (must fail CI / pre-commit on violations)

| Stack | `package.json` script |
| --- | --- |
| Astro | `"check:ts": "astro check --minimumSeverity warning --minimumFailingSeverity warning"` |
| tsc | `"check:ts": "tsc --noEmit"` |

Pre-commit hooks should run `npm run check:ts` (not a bare undocumented `tsc` or `astro check`).
