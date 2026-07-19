# agent-skills (public package)

## What this repo is

Executable **public agent package**: allowlisted skills, the twelve `/ship` reviewer agents, and
the rules those skills cite. A consumer needs only this repo (or its shallow clone on a cloud VM)
plus **host configuration** — repo `AGENTS.md`, User Rules, secrets, MCP servers, CI secrets.

There is no requirement to clone private dotagents on Cursor Cloud. Laptop-only tooling
(`install-local-agent-runtime.sh`, `doctor-agents.sh`, user-level hooks) is out of scope here.

## Package layout

```text
skills/<name>/SKILL.md     → ~/.cursor/skills/<name>/        (cloud + laptop discovery)
agents/<name>.md           → ~/.cursor/agents/<name>.md
rules/<name>.md            → ~/.cursor/agent-skills-package/rules/<name>.md   (cloud)
```

When a skill says `rules/worktree-authoring.md`, resolve it against this package — on cloud, read
from `~/.cursor/agent-skills-package/rules/` (see `.cursor/CLOUD.md`).

## Ship profile

Ship profile: `gate-only` (this repo)

Integration: branch → PR → CI-gated merge. Local gate before commit when changing this repo.

## Commands

```bash
npm ci
npm run gate                 # markdown lint + actionlint when configured
bash tests/test-public-skills-allowlist.sh   # when run from dotagents sibling checkout
```

Cloud smoke for fleet repos: fresh Cursor Cloud Agent on a wired repo; `/ship` must run reviewer
agents and read cited rules — not merely discover skill names.
