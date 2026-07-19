# Package layout — skills, agents, cited rules

This public repo is a **self-contained package**. Skills, reviewer agents, and the rules that
allowlisted skills cite ship together. The host (laptop or Cursor Cloud VM) only wires paths and
secrets — it does not need a private dotagents checkout for cloud execution.

## Paths after install

| Artifact | Cursor Cloud (default) | Laptop (typical) |
| --- | --- | --- |
| Skills | `~/.cursor/skills/<name>/` | `~/.cursor/skills/<name>/` (host installer) |
| Review agents | `~/.cursor/agents/<name>.md` | `~/.cursor/agents/<name>.md` |
| Cited rules | `~/.cursor/agent-skills-package/rules/<name>.md` | Host rules dir or same package path |

Cloud install: `bash .cursor/install-cloud-skills.sh` (shallow clone of this repo). Laptop-only:
host `install-local-agent-runtime.sh` + doctor — **not** available on cloud VMs.

## How to read `rules/foo.md` citations

Skills and `/ship` references use **package-relative** paths like `rules/worktree-authoring.md`.
That is the logical name inside this repo's `rules/` directory — not a path relative to the
consumer git checkout.

- **On Cursor Cloud:** read the file at `~/.cursor/agent-skills-package/rules/foo.md` (see repo
  `.cursor/CLOUD.md`). `~/.cursor/rules` from a laptop home is **not** auto-applied on cloud.
- **On a laptop:** read the same rule from your host rules wiring, or from a local checkout of
  this package under `rules/foo.md`.

Do not assume a private fleet config checkout exists on cloud.
