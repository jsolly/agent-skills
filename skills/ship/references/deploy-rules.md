# Per-Project Deploy Entries — run explicitly by the skill in Step 12

Step 12 behavior depends on **`{SHIP_PROFILE}`** and **`{INTEGRATION_MODEL}`** (see `orchestration.md` step 3, `ci-owner.md`). On **PR ships (either CI owner), skip step 12 entirely** — deploy is not agent-babysat (fire-and-forget) unless the user explicitly asks. On `direct-push` (and explicit babysit requests): **Vercel-Git static sites verify after the push/merge lands; Actions-deployed SAM repos leave GitHub Actions `deploy.yml` to run (unwatched unless asked); repos with break-glass local `deploy:code` may still use that path when AGENTS.md documents it.**

---

## Vercel Git integration (`vercel-static` profile)

When production deploys are triggered by **merge to `main`**, step 12 is **verification**, not invocation. Do **not** run redundant `vercel deploy --prod` / `npx vercel --prod` unless the repo documents manual deploy as the deploy entry or Git integration is absent.

### When this applies

- Repo has `vercel.json` and/or Vercel project linked to GitHub
- Static SPA (Astro/Svelte/Next static export) with no `aws/`, no DB migrations
- Examples: `example-static-site` (Astro → `dist/`, production `https://example.com`), and other Vercel Git-linked static SPAs

### Verification checklist (step 12)

1. **Integration landed** on `main` (PR merged or direct push succeeded).
2. **Production deployment READY** — poll via Vercel dashboard, Vercel MCP/API, or `vercel inspect <deployment-url>` until status is ready (typically 1–3 minutes after push).
3. **HTTP 200** on production URL / custom domain:

   ```bash
   curl -sf -o /dev/null -w '%{http_code}\n' https://example.com
   ```

4. **Optional smoke:** fetch page and confirm title or key UI string (e.g. app name in `<title>`).
5. Record **`deploy: auto (Vercel Git)`** or **`deploy: verified at <url>`** in step 14.

### Fallback — manual CLI deploy

Run `vercel deploy --prod` (or repo-documented command) **only when**:

- `{POST_PUSH_DEPLOYS}` or AGENTS.md names it as the deploy entry, **or**
- Git integration is broken/absent and production will not update on push alone.

### Do not

- Run AWS Lambda live checks for `vercel-static` profile.
- Treat "push landed" as "shipped" without URL verification when production is user-facing.

---

## AWS SAM and other code deploys (`aws-sam` profile)

For **Actions-deployed SAM repos**, code deploy is GitHub Actions after merge — do **not** run local `deploy:code`. Some repos may still document break-glass `npm run deploy:code`. The **infra deploy** (`npm run deploy:infra` / full SAM) is **admin-MFA human step-up** — never auto-run.

**Naming convention:** `deploy:code` = post-land Lambda code deploy (break-glass when documented; Actions-deployed repos use GitHub instead). `deploy:infra` = full SAM/CloudFormation (human MFA). Vercel Git sites have no local deploy entry.

Because deploy runs after push, push and deploy are **not atomic**: a deploy failure leaves `main` updated but runtime stale — fix forward and re-run the entry (idempotent).

The actual triggers/commands per repo live in each project's `AGENTS.md` and its deploy entry.

---

## What the skill deploys (and what to verify)

In step 3, capture deploy/verify rules into `{POST_PUSH_DEPLOYS}`. Examples:

- **`vercel-static`:** "Verify `https://example.com` returns 200 after Vercel Git deploy; no manual vercel CLI."
- **`aws-sam`:** "Code deploy via GitHub Actions `deploy.yml` (Actions-deployed SAM repos) or break-glass `deploy:code` when AGENTS.md documents it; full `npm run deploy:infra` when `aws/template.yaml` changes — human-only."
- **`gate-only`:** "No deploy entry — `deploy: none`."

Also read `docs/deploy-gotchas.md` (or equivalent) for preconditions.

## How to run (step 12) — AWS repos

1. Confirm step-11 push/merge succeeded.
2. **Actions-deployed SAM repos:** confirm GitHub Actions `deploy.yml` (babysit only if asked). **Break-glass local deploy:** resolve `npm run deploy:code` / `scripts/deploy.sh` when AGENTS.md says so. Gate-only → `deploy: none`.
3. Watch for success signal (workflow green, Lambda updated, etc.).
4. Smoke-check when repo documents one.
5. Post-deploy live verification when diff affects external providers (see below) — **aws-sam only**, not `vercel-static`.
6. On failure: fix forward, re-run gate/push if code changed, re-dispatch or re-run the deploy entry.

---

## Post-deploy live verification (diffs that affect live external behavior)

Some behavior is only exercised against **real** external services (payment providers, data/price APIs, LLM endpoints, SMS/email vendors) — and the local suite deliberately stubs every external call, so a green gate proves *nothing* about the live path. Where a repo has moved that coverage out of the local suite, the live check is **post-push, post-deploy, and manual** — the local run can no longer catch a real-API regression.

**When to run:** the diff touches code that could change how the app talks to a real external service — provider clients, request/response parsing, auth/scoping, retry/timeout policy, or the env/config feeding them. A docs-only or pure-internal diff does not warrant it.

**How (capture the repo's specifics into `{POST_PUSH_DEPLOYS}` at step 3):**

1. After the deploy lands, trigger the repo's live check — typically a **scheduled health-check Lambda invoked manually on demand** (`aws lambda invoke`), or whatever the repo's AGENTS.md documents as its live verification.
2. Confirm it **passes** — exit/handler success, no thrown error, no error-log/alarm fired. The whole point is that this runs against the real API, so treat a failure as a real regression, not flakiness.
3. Record the outcome in the step-14 summary (`live check: passed` / `live check: n/a — no live-affecting paths changed`). A failed live check is a stale/broken runtime — fix forward like a failed deploy.

**Reference pattern (provider-backed Lambda).** There is no local live-provider test tier — provider API keys live only in the Lambda runtime. A scheduled **live-provider-check** Lambda (e.g. `src/handlers/live-provider-check.ts`) runs real round-trips against external APIs and throws on failure. After a deploy that touched provider clients, request/response parsing, or notification content built from live data, invoke it manually with `aws lambda invoke` and confirm it succeeds.

---

## AWS SAM deploy (Lambda / CloudFormation)

Most common pattern for projects with an `aws/` directory.

### When it runs

**Actions-deployed SAM repos:** code deploy is GitHub Actions `.github/workflows/deploy.yml` after merge to `main` — do **not** run local `deploy:code`. Repos that also document break-glass local deploy use `npm run deploy:code` only when AGENTS.md says so. The **infra** deploy (`npm run deploy:infra`, full SAM) is human-only and is *surfaced, not run*, when an infra-trigger path changed. The trigger paths below tell you which deploy a change warrants:

| Path prefix | Why | Which deploy |
| --- | --- | --- |
| `aws/template.yaml`, `aws/template.yml` | Stack definition, env vars, alarms, IAM | `deploy:infra` (human MFA) |
| `aws/deploy.sh` | Deploy script / bundling behavior | `deploy:infra` |
| `src/handlers/` / `aws/src/handlers/` | Lambda handler entrypoints | Actions code deploy (or break-glass `deploy:code`) |
| `src/lib/` | Shared code bundled into Lambdas | Actions code deploy (or break-glass `deploy:code`) |

**Important:** `src/lib/` changes often require a code redeploy even when handlers are unchanged — the bundled artifact includes shared modules. Do not skip code deploy just because only `src/lib/` changed.

### Preconditions (check before babysitting / break-glass)

1. **Deploy only after the push/merge to `main` lands** — never deploy a branch state that isn't on `main`.
2. **Break-glass local deploy:** AWS credentials must work (`AWS_PROFILE` per AGENTS.md). On SSO expiry, `aws sso login` and re-run — never switch profiles silently.
3. **`aws/samconfig.toml`** is usually gitignored — the user must have copied `samconfig.toml.example` once. If it's missing, surface that setup step; do not invent profile names.

### Command (what runs)

**Default (Actions-deployed SAM repos):** GitHub Actions `deploy.yml` after merge — babysit with `gh run watch` only when asked.

**Break-glass (when AGENTS.md documents local deploy):**

```bash
# code deploy (break-glass, scoped role): lambda update-function-code
npm run deploy:code            # = bash aws/deploy-code.sh (or aws/deploy-web.sh)
```

The **infra** deploy is human-only — surface it, do not run it:

```bash
# infra deploy (admin MFA, human step-up): full SAM build + deploy of aws/template.yaml
npm run deploy:infra           # = bash aws/deploy.sh (or npm --prefix aws run deploy)
```

### Success criteria

- Actions workflow green (or break-glass entry exits 0).
- Output shows stack/Lambda update complete.
- Record in the step-14 summary: `deploy: succeeded`. A failed deploy is a stale-runtime state — report it as such (see "How to run" above), not as a push failure.

### Reference pattern (multi-tier SAM repo)

From root `AGENTS.md`:

- **Code deploy (GitHub-managed):** GitHub Actions runs the repo's deploy script after `main` CI passes — migrations + Lambda `update-function-code`. Local `npm run deploy:code` is break-glass only. Web tier may deploy via Vercel GitHub integration.
- **Infra deploy (human MFA, surfaced not run):** `npm run deploy:infra` (alias for `npm --prefix aws run deploy`) — full SAM, required when `aws/template.yaml`/`aws/deploy.sh` changes.
- **Gotcha:** merge env-var template changes to `main` before the infra deploy — see `docs/deploy-gotchas.md`

---

## Common patterns (other stacks)

**SAM/CloudFormation** — see **AWS SAM deploy** above (preferred detail).

**CDK**:

- Trigger: changes to `*.cdk.ts`, `cdk.json`, or `bin/<app>.ts`.
- Command: `cd <cdk-dir> && cdk deploy`.

**Terraform**:

- Trigger: changes to `*.tf`, `*.tfvars`.
- Command: `cd <tf-dir> && terraform apply` (with explicit user confirmation for destroys).

**Lambda code-only updates**:

- Trigger: changes to handler source files in a path documented in AGENTS.md (e.g., `src/handlers/**`).
- Prefer the repo's GitHub Actions deploy workflow; local `deploy:code` only when AGENTS.md documents break-glass.

**Docker image pushes**:

- Trigger: changes to `Dockerfile`, `docker-compose.yml`.
- Command: project-specific build + tag + push sequence.

## Avoiding the trap

With pre-commit hooks gate-only and profile-specific step 12:

- **Vercel Git (`vercel-static`):** verify production URL returns 200 after deploy — do not skip because "push landed". Record `deploy: verified at <url>`.
- **AWS repos:** if a trigger path changed, confirm Actions deploy (Actions-deployed SAM repos) or run break-glass `deploy:code` when AGENTS.md says so. "Push landed" is not "shipped" until deploy succeeds.
- **Deploying before the push lands.** Run the entry only after `git push origin HEAD:main` succeeds, so the runtime never gets ahead of the remote.
- **Treating a deploy failure as a push failure.** The code *is* on `main`; the runtime is stale. Fix forward and re-run the deploy entry (idempotent) — and if it stays red, say so loudly in the final summary.
- **No deploy path wired (AWS repos).** If a repo deploys Lambda code but has neither GitHub Actions `deploy.yml` nor a documented break-glass `deploy:code`, flag it as a wiring gap — the fix is to add the deploy path to the repo, not to improvise commands here. Vercel Git-integrated repos intentionally have no local entry.
- **Auto-running the infra deploy.** Never run `npm run deploy:infra` / `aws/deploy.sh` (full SAM) from the skill — it needs admin MFA and is a human step-up (`rules/agent-cloud-access.md`). Surface the exact command and let the human run it.
- **Destructive deploys** (DB drops, infra teardown, prod resource deletes) still warrant a heads-up — if a repo's deploy entry does something irreversible, confirm with the user before running it.
