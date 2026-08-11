# Classification + review depth

Read root `AGENTS.md` `## Ship`. Prefer explicit declarations; otherwise infer conservatively (more review + stricter deploy rules). Do not copy this skill’s procedure into every repo — repos declare persistent inputs only.

## Ship profile → post-land duty

| Profile | Detect (order) | Default review depth | After merge |
| --- | --- | --- | --- |
| **`vercel-static`** | Declared, or `vercel.json` / Vercel Git + static site, no `aws/` / DB migrations | light | Vercel READY for merge **and** `x-release-id` ≥ merge SHA |
| **`aws-sam`** | Declared, or `aws/template.yaml` + Actions/`deploy:code` pattern | full | Babysit GitHub **Deploy** (cap 3); release-id if HTTP/Vercel web tier; pure-infra → n/a; live external check when paths apply |
| **`heroku-git`** | Declared / Heroku GitHub auto-deploy from `main` | by risk | Heroku release for `main` + release-id when HTTP |
| **`gate-only`** | Gate wired, no deploy entry | by risk | `deploy: none` / `no-http-release-id (n/a)` |
| **`docs-config`** | Derived only — every changed path matches allowlist below | **skipped** | Usually none |

**by risk** (heroku-git, gate-only): start **light** unless a force-full path below matches; then **full**.

## Force-full paths (any profile)

Escalate to **full** when the diff touches infra/IaC, migrations, IAM/secrets, auth/provider clients, or cross-cutting lib refactors — even on `vercel-static` / `gate-only`.

Also escalate light → full when light already returned Critical/Important structural/security/infra findings (`review-roster.md`).

## Integration + CI owner

| Variable | Values |
| --- | --- |
| `{INTEGRATION_MODEL}` | **`pr-auto-merge`** default. **`direct-push`** only if AGENTS.md declares it or user explicitly requests emergency bypass. |
| `{CI_OWNER}` | **`local`** (default): full documented local gate before push. **`github-handoff`**: cheap local subset only (lint/types/static per AGENTS.md); do **not** invent a fuller local battery — remote CI owns heavy checks. Babysit is required for both. |

Plan-gated auto-merge (private Free / `enablePullRequestAutoMerge` fails): expected — babysit and `gh pr merge --squash` when green (`integrate.md`). Not a regression.

## Docs/config allowlist (skip review fan-out)

Skip semantic-review fan-out **iff every** path in the pending change set matches:

| Kind | Matches |
| --- | --- |
| Extensions | `.md`, `.mdx`, `.txt`, `.json`, `.jsonc`, `.toml`, `.yml`, `.yaml`, `.ini`, `.cfg`, `.conf`, `.editorconfig` |
| Basenames | `.gitignore`, `.gitattributes`, `.npmrc`, `.nvmrc`, `LICENSE`, `LICENSE.*`, `NOTICE`, `CODEOWNERS` |

Anything else (code, shell, SQL, CSS, lockfiles, unknown extensions, binaries) **forces review**. Binary allowlist match — no triviality judgment. Allowlist skip does **not** skip the integrate loop; still PR → CI → merge.

## Review policy (ends)

- Right-size depth to profile/risk; fan out the named Cursor Task roster in `review-roster.md` (all 12 `agents/*` bound: 11 lenses + `confidence-scorer`).
- Lens output contract: `output-contract.md`.
- Verified in-bounds findings fixed in-run or rejected with reason — not user punch-lists.
- Unbounded redesign / conflicts with user/spec → stop-and-ask.
- Cap review-fix cycles at **3**; next failure → hard-stop terminal.
- Commit messages reflect original intent, not “address review.”
