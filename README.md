# agent-skills

Self-contained public package of AI agent skills, review agents, and cited rules — sanitized
from the allowlisted subset of [`jsolly/dotagents`](https://github.com/jsolly/dotagents).

[![skills.sh](https://skills.sh/b/jsolly/agent-skills)](https://skills.sh/jsolly/agent-skills)

## Package layout

| Path | Purpose |
| --- | --- |
| `skills/` | Allowlisted skills (`SKILL.md` + references) |
| `agents/` | Review-fleet prompts dispatched by `/ship` |
| `rules/` | Rules those skills cite (e.g. `rules/worktree-authoring.md`) |

**Self-containment contract:** every `` `rules/<name>.md` `` citation inside `skills/` must resolve
under this repo's `rules/`. Publish fails if a companion is missing or hard-forbid markers remain.
Host still configures secrets, MCP, and env — those are not vendored here.

Cursor Cloud Agents install via a thin repo script that copies:
- `skills/` → `~/.cursor/skills`
- `agents/` → `~/.cursor/agents`
- full tree → `~/.cursor/agent-skills-package` (for rule citations)

Cursor does **not** auto-apply home `~/.cursor/rules`; treat `rules/` as readable companions.

## Install (skills.sh)

```bash
npx skills add jsolly/agent-skills
```

Install a single skill:

```bash
npx skills add jsolly/agent-skills --skill drawio
```

## Skills

| Skill | Description |
| --- | --- |
| `brainstorming-thermonuclear` | Expansive divergent exploration of an idea or design |
| `grill-me-thermonuclear` | Adversarial interrogation of a plan until assumptions hold |
| `drawio` | Generate native `.drawio` XML diagrams (optional CLI export) |
| `fyi` | Session handoff / context snippet for another agent |
| `research` | Deep-research prompt for external research tools |
| `refactor` | TypeScript refactoring that provably preserves behavior |
| `remove-feature` | Fully remove a feature, flag, endpoint, or subsystem |
| `find-edgecase-slop` | Find hard-coded / spiked edge-case complexity; plan-mode todos |
| `ship` | Review, gate, and integrate local work to `main` (PR or direct-push) |
| `seo` | Technical SEO + Lighthouse performance/a11y/best-practices audit |
| `janitor` | Drain self- and Dependabot issues/PRs across a multi-repo `~/code` tree |
| `explain-diff-html` | Rich interactive HTML explanation of a diff/PR (Background, Intuition, Code, Quiz) |

## Agents

Twelve review prompts under `agents/` (`bug-scanner`, `security-scanner`, `code-quality-reviewer`,
`confidence-scorer`, `a11y-reviewer`, `db-migration-reviewer`, `dependency-scanner`,
`error-handling-reviewer`, `guidelines-auditor`, `infra-reviewer`, `secrets-scanner`,
`test-reviewer`).

## Rules

Cited companions under `rules/`: `worktree-authoring`, `code-style`, `typescript-strict`,
`agent-cloud-access`.

## Source of truth

Edits land in private `dotagents` first. Public copies are sanitized via `/publish-skills`
(`scripts/publish-agent-skills-package.sh`) from:
- `skills/public-manifest.txt`
- `agents/public-manifest.txt`
- `rules/public-manifest.txt`

Do not author skills/agents/rules here.
