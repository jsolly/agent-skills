# agent-skills

Public AI agent skills mirrored from the allowlisted subset of [`jsolly/dotagents`](https://github.com/jsolly/dotagents).

[![skills.sh](https://skills.sh/b/jsolly/agent-skills)](https://skills.sh/jsolly/agent-skills)

## Install

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

## Source of truth

Edits land in private `dotagents` first. This repo is updated by `scripts/sync-public-skills.sh` from that allowlist (`skills/public-manifest.txt`). Do not author skills here.
