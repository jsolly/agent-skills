# Agent Fleet — Composition, Gating, Models

The 12 review subagent prompts live in this package `agents/`. Cloud install places them at `~/.cursor/agents/*.md`; laptop hosts may symlink the same files. `/ship` step 6 dispatches a **light** or **full** fleet based on `{SHIP_PROFILE}` and diff shape (see `orchestration.md` step 3). Agents set no `model` in frontmatter, which Claude Code defaults to `inherit` — so each subagent runs on the same model as the orchestrator session (see "Model", below).

The fleet was deliberately pruned from 17 to 12 (2026-06-10): overlapping lenses and near-zero hit-rate agents were cut. A review fleet's failure mode is noise, not missing lenses.

---

## Review tiers

| Tier | When | Agent calls (typical) |
| --- | --- | --- |
| **skipped** | Trivial `docs-config` diff — typo, comment-only, single-value config with no logic | 0 |
| **light** | Default for `vercel-static` and frontend-only repos when diff is non-trivial but not infra-heavy | 5–7 fan-out + confidence-scorer |
| **full** | Default for `aws-sam`; mandatory when diff touches `aws/`, migrations, IAM, secrets handling, auth/providers, or cross-cutting lib refactors | 10–12 fan-out + confidence-scorer |

**Escalation:** if light review surfaces Critical/Important structural, security, or infra findings, re-run with **full** fleet before push.

---

## Light fleet

Default for **`vercel-static`** profile and other frontend-only repos when the diff is non-trivial but not infra-heavy.

### Always-run (5 agent types, 5 calls)

| Agent | Lens |
| --- | --- |
| `guidelines-auditor` | Project conventions from AGENTS.md and linked rules |
| `bug-scanner` | Logic errors, broken contracts, race conditions, edge cases |
| `security-scanner` | Injection, XSS, auth bypass, CSRF, SSRF, crypto misuse |
| `secrets-scanner` | Hardcoded API keys, tokens, private keys, .env leaks |
| `code-quality-reviewer` | Maintainability — code-judo, 1k-line rule, boundaries (needs **full file bodies**) |

### Extension-gated (light)

| Agent | Gate |
| --- | --- |
| `a11y-reviewer` | `**/*.{tsx,jsx,vue,astro,html,svelte}` |
| `dependency-scanner` | `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb` changed |

### Skip unless diff matches (light)

| Agent | Gate to include |
| --- | --- |
| `test-reviewer` | Test files changed (`**/*.{test,spec}.*`, `**/__tests__/**`) or AGENTS.md requires tests for this change |
| `error-handling-reviewer` | Not in light fleet by default — add only if diff touches async/error paths heavily |
| `db-migration-reviewer` | Migration paths: `supabase/migrations/**`, `prisma/**`, `drizzle/**`, `alembic/**`, etc. |
| `infra-reviewer` | `aws/**`, `infra/**`, `*.tf`, `cdk.json`, `template.yaml`, IAM/policy paths |

---

## Full fleet

Default for **`aws-sam`** profile. Mandatory when the diff touches infra, DB, auth/providers, or cross-cutting refactors regardless of profile.

### Always-run (10 agent types, 10 calls)

| Agent | Lens | Bash? |
| --- | --- | --- |
| `guidelines-auditor` | Project conventions from AGENTS.md and linked rules | no |
| `code-quality-reviewer` | Deep maintainability — code-judo, 1k-line rule, spaghetti growth, boundaries | yes |
| `bug-scanner` | Logic errors, broken contracts, race conditions, edge cases | yes |
| `security-scanner` | Injection, XSS, auth bypass, CSRF, SSRF, crypto misuse | yes |
| `secrets-scanner` | Hardcoded API keys, tokens, private keys, .env leaks | yes |
| `dependency-scanner` | New deps exist on registry; slopsquat defense | yes |
| `test-reviewer` | Test quality, coverage gaps, realistic data, scenario framing | no |
| `error-handling-reviewer` | Silent failures — swallowed exceptions, fire-and-forget async | no |
| `db-migration-reviewer` | Destructive migrations, RLS, missing indexes, breaking column changes | yes |
| `infra-reviewer` | IAM sprawl, over-permissioned policies, missing deploy steps | yes |

`db-migration-reviewer` and `infra-reviewer` stay always-run in **full** tier even when their lens may not apply — empty-scope verdicts cost ~50 tokens and parallel wall-clock is unchanged.

### Extension-gated (full)

| Agent | Gate |
| --- | --- |
| `a11y-reviewer` | `**/*.{tsx,jsx,vue,astro,html,svelte}` |

`.css` is **not** in the gate — Tailwind config tweaks produce noise without real WCAG signal.

---

## Per-finding adjudication (both tiers)

Not part of the fan-out. Invoked once per surviving Critical/Important finding by step 7.

| Agent | Lens |
| --- | --- |
| `confidence-scorer` | Severity adjudication: Confirm Critical / Downgrade / False positive |

`confidence-scorer` is exempt from the standard contract. It returns `Adjudication` + `Justification`.

## Empty-scope verdict pattern

Agents whose lens doesn't apply return:

```text
**Ready to ship: Yes**
**Reasoning:** No <files in lens> in scope.
```

## Model

Agents set no `model` in frontmatter. Claude Code defaults to `inherit`. Pick the parent model for the review; subagents follow automatically.

## Token economics

- **Light fleet** is the default for `vercel-static` and frontend-only repos — still read full changed-file bodies for `code-quality-reviewer`.
- **Full fleet** is mandatory for `aws-sam`, infra/DB/auth/provider diffs, and escalations from light review.
- Skip fan-out only for trivial `docs-config` diffs (typo, comment-only, one-value config tweak).
