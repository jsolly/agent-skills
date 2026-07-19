# agent-skills

Public sanitized package for Cursor / Claude agent skills.

- **Do not author here.** Private source of truth: `jsolly/dotagents`.
- Publish via `/publish-skills` → `scripts/publish-agent-skills-package.sh`.
- Self-contained: `skills/` + `agents/` + cited `rules/`. Missing companions fail publish.
- Cloud install: fleet repos run `.cursor/install-cloud-skills.sh` (not a clone of private
  `dotagents`).
