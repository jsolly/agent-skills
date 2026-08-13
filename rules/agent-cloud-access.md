---
description: Least-privilege cloud access boundaries for agent reads, deploys, and admin actions
alwaysApply: true
---

# Agent Cloud Access (least privilege)

How a general coding agent (Claude Code / Cursor / Codex) interacts with the four cloud services the fleet uses. **Agents are read-mostly.** Reads and debugging are unscoped-by-default *within a read-only boundary*; any write or admin action goes through a **human step-up** — the agent proposes the exact action, a human approves/executes it.

Design + rationale for the three-tier access model (Tier 2 = agents). This rule is the operational summary.

## Principle

| Tier | Who | Boundary |
| --- | --- | --- |
| Read / debug | the agent, standing | `agent-readonly` (laptop IdC `AgentReadOnly` or Cloud Agent vendor OIDC) |
| Code deploy to prod | GitHub Actions after merge | `github-actions-deploy` via OIDC; agents do not hold a deploy role |
| New infra / prod-data admin | a human, on demand | Identity Center `AdministratorAccess` (MFA); the agent only *proposes* |

The middle tier is CI, not a standing agent identity: **code lands on production via the committed pipeline after merge**. What stays gated from agents is **standing up or mutating cloud *infrastructure*** (CloudFormation/SAM stack create/update, `terraform apply`, …) and **writing prod *data*** (ad-hoc prod migrations, prod DB clients). Enable **manual per-call tool approval** in the client for any tool that can mutate infra or prod data.

## Validating scoped credentials

Probe a least-privilege credential against the actions it is **scoped for**, never an arbitrary read endpoint. Distinguish authn from authz: Twilio `20003`/HTTP 401 = broken credential; `70051` = valid credential lacking that one permission — on an ungranted endpoint that's the key **working as designed**, not a broken key. Validate non-destructively by hitting a granted action with a deliberately invalid parameter (a param-validation error, e.g. Twilio `21211`/`60200`, means authz passed). Before declaring a key broken or a provider down, check the provider's own error log (e.g. Twilio Monitor Alerts `LogLevel=error`) — no auth/authz errors there = no real outage. (A mis-probe once led to rotating and redeploying a perfectly good prod key.)

## AWS

- **Read path (one role, two assume paths):** the **`agent-readonly` role** (committed in `shared-infra/aws/template.yaml`, minted via human `deploy:infra`). Laptop Cursor/Claude/Codex and Cursor Cloud Agents get the **same** AWS access: AWS-managed **`ReadOnlyAccess`** plus an explicit **`Deny`** overlay (`AgentReadOnlyDenySecretsPolicy`) on `ssm:GetParameter*` (the wildcard covers `GetParameterHistory`, which also returns decrypted SecureStrings) and `secretsmanager:GetSecretValue`/`BatchGetSecretValue`. Explicit Deny beats any Allow, so secrets stay unreadable even as `ReadOnlyAccess` grows. **This deny-overlay supersedes the earlier "hand-scoped, never `ReadOnlyAccess`" guidance:** `ReadOnlyAccess` was rejected only because it grants secret reads — the Deny removes exactly that, with no stale allow-list to maintain. It became safe **only** once the secret-runtime-fetch migration moved every fleet secret out of plaintext Lambda env vars to SSM SecureString (so `ReadOnlyAccess`'s `lambda:GetFunctionConfiguration` no longer leaks secrets, and the SSM/Secrets denies are the real boundary) — see `shared-infra/docs/specs/2026-06-22-secret-runtime-fetch-design.md`. No `kms:Decrypt` deny (SSM/Secrets Manager decrypt service-side; it'd only break legit SSE-KMS reads). Read-only must not mean read-secrets. **Accepted scope:** `ReadOnlyAccess` also permits reading application *data* (DynamoDB rows, S3 objects) — in-scope for a solo operator debugging their own fleet; the boundary this role enforces is secret *values*, not data. Do **not** create a cloud-only narrower (or wider) role.
- **Laptop assume path:** IAM Identity Center permission set **`AgentReadOnly`** (1h; `sts:AssumeRole` on `arn:aws:iam::730335616323:role/agent-readonly` only — ReadOnlyAccess stays on the IAM role so laptop and cloud cannot drift). `~/.aws/config` uses `[profile agent-readonly-sso]` (`sso_role_name = AgentReadOnly`) as `source_profile` for `[profile agent-readonly]`. Do **not** chain through `AdministratorAccess`.
- **Cloud assume path:** vendor OIDC → `sts:AssumeRoleWithWebIdentity` into the same role. Cursor Cloud mints a JWT from `/run/cursor/api.sock` (`aud: sts.amazonaws.com`, `sub` pinned to `user:<id>` — not `user:*`). Bootstrap: `.cursor/aws-oidc-login.sh` (cloud-agent template + shared-infra). Local Cursor/Claude/Codex cannot use Cursor Cloud OIDC (those JWTs exist only on the Cloud Agent VM). When Claude/Codex publish a VM OIDC issuer, add another `AWS::IAM::OIDCProvider` + trust statement on **this same role**.
- **Using it — the convention:** laptop agents pass **`--profile agent-readonly`** for AWS reads. Do **not** set `AWS_PROFILE=agent-readonly` globally on the laptop — that strips the human's admin default and breaks `deploy:infra`. Cloud Agent VMs **do** export `AWS_PROFILE=agent-readonly` (no human admin default to preserve). Verified live: a read (`lambda:GetFunctionConfiguration`) succeeds under that profile while `aws ssm get-parameter --with-decryption` on a fleet secret returns an explicit-deny.
- **Code-deploy path (CI, not agents):** landing code on prod is allowed via **PR merge**. The committed pre-commit **gate** (every commit) plus GitHub **CI** (on PR) gate quality before merge. **Nothing deploys inside the hook.** Post-merge deploy runs via Vercel Git integration or GitHub Actions (`deploy.yml`) assuming `github-actions-deploy`. There is **no standing agent deploy role** — IAM `agent-deploy` / laptop `fleet-deploy` are gone. Local `deploy:code` is not an agent path; humans use `AdministratorAccess` for infra (`npm run deploy:infra`) and for any break-glass local code push. Vercel Git-integrated repos have no local deploy entry — babysit the dashboard after merge.
- **New-infra path (human step-up):** standing up or mutating CloudFormation/SAM **stacks** — `sam deploy`, `aws cloudformation create-stack`/`update-stack`/`deploy`, `cdk deploy`, `terraform`/`tofu apply`, `pulumi up` — is **denied to the agent** (`permissions/agent.json`, pinned by `tests/test-repo-invariants.sh`). The human assumes a short-duration (1h), **MFA-gated IAM Identity Center `AdministratorAccess` permission set**; the agent emits the exact command, the human runs it after `aws sso login`. Repos split this cleanly (the pre-commit gate validates code, post-merge Actions ships it; infra is a separate manual `npm run deploy:infra`), and the deny mirrors that split harness-side.
- **Live-check invoke (CI and human only):** `github-actions-deploy` may `lambda:InvokeFunction` on `*-live-provider-check` during `deploy.yml`. Humans may invoke with `AdministratorAccess`. **Agents must not** — do not add invoke to `agent-readonly`. By convention these are read-only health checks: they hit the real external APIs and throw on failure, mutating nothing. The scope deliberately excludes every notification-sending Lambda (schedule/asset-events/email-dispatch). Defined in `shared-infra/aws/template.yaml` (`InvokeLiveProviderCheck` statement).
- **CLI:** `aws` (installed) under the read-only profile for reads; `AdministratorAccess` is human-only.
- **Destructive-op hardening (agent proposes, human executes):** keep CloudFormation **termination protection** enabled on production stacks — `block-stack-delete` only stops the *agent*, not a human in an SSO `AdministratorAccess` role, so termination protection is the cheapest guard against an accidental bulk `DeleteStack` sweep (root-caused once already: `example-app/docs/incidents/2026-05-cloudformation-stack-deletion.md`). When tearing down sandbox/experiment stacks, **allow-list explicit stack names — never loop over "all stacks"** in an account that also hosts production.

## Supabase

- **Read path (MCP):** run the Supabase MCP with `--project-ref=<ref>` **and** `--read-only` **and** `--features=database,docs,debugging`. `--read-only` alone only governs the DB tools (`execute_sql`, `apply_migration`) — it does **not** block `create_project`/`create_branch`; the `--features` whitelist is what removes those. The PAT behind the MCP is **account-wide** (scoping is enforced at the flag layer, not the token) — treat it as a high-value secret; never hand the agent a write PAT.
- **Local dev:** the `supabase` CLI drives the local stack and needs **no credentials** (`supabase start`). Kept for that reason.
- **Local dev DB is fine:** a bare `supabase db reset` (no `--linked`/`--db-url`) resets the **local** stack — agents need it to seed a fresh checkout's pre-commit gate, so `block-prod-db-migrations` and the `agent.json` deny allow it. Only the prod-targeting `--linked`/`--db-url` forms are blocked.
- **Interactive DB clients are not guarded by `block-prod-db-migrations`:** `psql`/`mysql`/`pgcli`/`mycli` pass that guard regardless of host (2026-06-25). Proving a client "provably local" from the command string required ~140 lines of URI/conninfo parsing **and** false-blocked every legitimate local client that wasn't on Supabase's port `54322` (a plain `psql -h 127.0.0.1 -p 5432 mydb`, socket/peer auth, any non-Supabase dev DB) — a wide net with a high false-positive rate. A client pointed at an obviously-prod host (`psql -h prod-rds…`) is exactly the shape the agent's command-safety **classifier** flags, so that judgment is left to it. The guard keeps only the high-precision, classifier-won't-catch *migration/apply* matches (below). **Still:** don't point an interactive client at a prod host; read-only prod inspection should go through the Supabase MCP `execute_sql` with `--read-only` or `supabase inspect db`/`db diff` (which cannot mutate).
- **Production migrations:** agents must **not** apply prod migrations or write prod data without explicit per-statement human approval — `supabase db push`, `supabase db reset --linked`/`--db-url`, `supabase migration repair`, `prisma migrate dev/deploy/reset`, `drizzle-kit push/migrate`, `alembic upgrade/downgrade`, a remote-routed `manage.py migrate`, etc. stay blocked (enforced by `block-prod-db-migrations` + the `agent.json` deny, and per-repo guards, e.g. `example-app/AGENTS.md`). Prod migrations still ship — they ride the committed deploy/CI pipeline on push, not an interactive agent command. Read-only prod inspection is fine when asked.

## Vercel

- **Read path (MCP):** the per-project **OAuth** hosted MCP (`vercel mcp --project`) — no long-lived token on disk, revocable, scoped to one project. Read deployments, builds, logs.
- **Tokens (if ever needed):** project-scoped (`vercel tokens add … --project <id>`); for runtime use **OIDC** (`VERCEL_OIDC_TOKEN`) over static tokens.
- **Writes (deploys):** Vercel Git-integrated repos deploy via Vercel's GitHub integration after merge to `main` — no local CLI step. **CLI break-glass** (human `AdministratorAccess` only): `example-app`'s local `npm run deploy:code` may call `gate_deploy_vercel` — not the agent.

## Twilio

- **The Twilio MCP is documentation-only** — it cannot perform account operations. Don't expect an MCP write path.
- **Read/observability path:** a **read-scoped Restricted API key** (Monitor Events/Alerts, Usage Records, Voice Insights read endpoints) for debugging delivery/usage. Mint via the v1 IAM Keys API; never a Standard or Main key.
- **Admin (account/key management):** there is **no programmatic step-up** on a solo plan — the Accounts/Keys endpoints need a Console-created Main key, and Public Key Client Validation is paywalled. So privileged Twilio ops are a **manual human action in the Console** (with Console MFA). The agent proposes; the human clicks.

## Cloudflare

- **MCP is the only access path** (the `cloudflare` Claude Code plugin: docs search + API-spec search; account operations would need an API token, and none is configured). This is deliberate (user 2026-07-03) — do **not** add `wrangler` or any Cloudflare CLI/dep to repos, and do not disable the plugin as "fleet-irrelevant".
- **GitHub has no MCP** — its OAuth lacks the dynamic client registration Claude Code requires, and a PAT header would sit plaintext on disk (rejected 2026-06-30). GitHub work goes through the `gh` CLI.

## Wiring status

The path is documented and the Claude Code plugins (Supabase, Vercel, AWS-serverless) are enabled. AWS reads use `agent-readonly` (laptop: IdC `AgentReadOnly`; Cursor Cloud: OIDC). Code deploys are GitHub Actions (`github-actions-deploy`); humans run `deploy:infra` with `AdministratorAccess`. Remaining human one-time steps: supply a read-only-scoped Supabase PAT to the MCP with the flags above; OAuth-authorize the Vercel per-project MCP; mint the read-scoped Twilio Restricted key.
