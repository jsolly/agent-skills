# agent-skills

Public **self-contained agent package** mirrored from allowlisted subsets of private fleet config
(skills, reviewer agents, and cited rules). Hosts only configure secrets, MCP, and environment —
cloud VMs do **not** need a private dotagents checkout.

[![skills.sh](https://skills.sh/b/jsolly/agent-skills)](https://skills.sh/jsolly/agent-skills)

## Self-containment contract

| Layer | In this repo | After cloud install (`bash .cursor/install-cloud-skills.sh`) |
| --- | --- | --- |
| Skills | `skills/<name>/` | `~/.cursor/skills/<name>/` |
| Review agents | `agents/<name>.md` | `~/.cursor/agents/<name>.md` |
| Cited rules | `rules/<name>.md` | `~/.cursor/agent-skills-package/rules/<name>.md` |

Skills that cite `rules/foo.md` mean the **package rule** `rules/foo.md` here — on cloud, read
`~/.cursor/agent-skills-package/rules/foo.md` (see `.cursor/CLOUD.md`). Laptop hosts may wire the
same files via their host installer.

## Install (skills CLI)

```bash
npx skills add jsolly/agent-skills
```

Single skill:

```bash
npx skills add jsolly/agent-skills --skill drawio
```

## Cursor Cloud (fleet repos)

Copy `.cursor/install-cloud-skills.sh`, `.cursor/environment.json`, and `.cursor/CLOUD.md` from
this repo (or from private `dotagents` `templates/cloud-agent/`). The `install` hook shallow-clones
**this repository** and materializes the full package into the VM home paths above.

## Skills

| Name | Description |
| --- | --- |
| `brainstorming-thermonuclear` | Expansive divergent exploration |
| `grill-me-thermonuclear` | Adversarial plan interrogation |
| `drawio` | Native `.drawio` XML diagrams |
| `fyi` | Session handoff snippet |
| `research` | Deep-research prompt for external tools |
| `refactor` | Behavior-preserving TypeScript refactors |
| `remove-feature` | Remove feature/flag/subsystem fully |
| `find-edgecase-slop` | Find spiked edge-case complexity |
| `ship` | Review, gate, integrate to main (PR) |
| `seo` | Technical SEO + Lighthouse audit |
| `janitor` | Drain issues/PRs across repos |
| `explain-diff-html` | Interactive HTML diff explanation |

## Review agents (`/ship` fleet)

| Name | Description |
| --- | --- |
| `a11y-reviewer` | WCAG, semantic HTML, ARIA, keyboard/focus |
| `bug-scanner` | Logic errors, races, edge cases in diff |
| `code-quality-reviewer` | Maintainability, boundaries, canonical layers |
| `confidence-scorer` | Adjudicate single finding severity |
| `db-migration-reviewer` | SQL migrations, RLS, destructive ops |
| `dependency-scanner` | Registry verify, typosquat, version pins |
| `error-handling-reviewer` | Silent failures, swallowed errors |
| `guidelines-auditor` | AGENTS.md and linked guidelines |
| `infra-reviewer` | IAM, IaC safety, deploy steps |
| `secrets-scanner` | Hardcoded creds and .env leaks |
| `security-scanner` | Injection, XSS, auth, crypto |
| `test-reviewer` | Test quality and coverage gaps |

## Cited rules (package)

| Name | Description |
| --- | --- |
| `worktree-authoring` | Worktree-first authoring off main |
| `code-style` | Fleet code style and deletion ethos |
| `typescript-strict` | Strict TS baseline expectations |
| `agent-cloud-access` | Human-gated prod ops and deploy paths |

## Source of truth

Private `dotagents` allowlists (`skills/`, `agents/`, `rules/` `public-manifest.txt`) plus
`/publish-skills` sanitize publish — not a byte-identical sync script. Do not author production
content here; publish from dotagents.
