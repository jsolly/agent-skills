# Fleet guards + git discipline

Git safety during `/ship` is **orchestrator discipline**. There is no hard `block-git` for `--no-verify` / force-push — do not assume hooks will stop you.

## Ship markers (asymmetric — required)

| Operation | Form | Guard |
| --- | --- | --- |
| PR create | **Leading** `DOTAGENTS_SHIP=1 gh pr create …` (also covers `gh pull-request create`) | `block-pr-create-outside-ship` **denies** bare creates |
| Remote push | **Trailing** `git push … # DOTAGENTS_SHIP=1` | `warn-push-outside-ship` **asks** on bare remote push (Claude/Codex; Cursor miss by design) |

Do **not** use leading `DOTAGENTS_SHIP=1` on push — Claude cannot allow-list past non-known-safe env assignments; PR create keeps the leading-env form. Push-mark and PR-allow are **not** interchangeable.

Existing PR for the branch → `gh pr view` / edit / merge / checks (no create allow needed).

## Always forbidden in ship

- `--no-verify` on commit or push
- `git push --force`, `--force-with-lease`, `git reset --hard`
- `git add -A` / `git add .` — stage named paths only (secrets, probe artifacts, binaries stay out)
- Weakening/disabling checks or deleting failing tests to force green
- Bare PR create outside this skill
- Auto-running `deploy:infra` / full admin-MFA stack deploys
- Working around `block-prod-db-migrations` / `block-stack-delete`

## Still hard-blocked by fleet shell guards (elsewhere)

Prod DB migrations, stack teardown, writing content into `CLAUDE.md`, edits to tracked files on a `main` checkout (gitignored exempt). Ship must not bypass them.
