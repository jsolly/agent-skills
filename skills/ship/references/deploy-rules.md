# Per-Project Deploy Entries — run explicitly by the skill in Step 12

Step 12 behavior depends on **`{SHIP_PROFILE}`**, **`{INTEGRATION_MODEL}`**, and **`{CI_OWNER}`** (see `orchestration.md` step 3, `ci-owner.md`). On every PR ship: watch CI → fix red → merge. After merge: **Vercel-Git static sites and hybrid Vercel web tiers must prove the merged commit is live via `x-release-id` (see `references/release-id.md`); my-org AWS SAM repos babysit GitHub Actions `deploy.yml`; Heroku GitHub auto-deploy repos verify with `npx heroku releases`; example-app may still use break-glass local `deploy:code`.**

**HTTP 200 alone is insufficient.** Vercel READY / Actions green are supporting evidence; the user-facing source of truth is `x-release-id` **≥ the PR merge SHA** (ancestor check — a later tip that includes the merge still passes). Repos with no HTTP app record `deploy: no-http-release-id (n/a)`.

---

## Vercel Git integration (`vercel-static` profile)

When production deploys are triggered by **merge to `main`**, step 12 is **verification**, not invocation. Do **not** run redundant `vercel deploy --prod` / `npx vercel --prod` unless the repo documents manual deploy as the deploy entry or Git integration is absent.

### When this applies

- Repo has `vercel.json` and/or Vercel project linked to GitHub
- Static SPA (Astro/Svelte/Next static export) with no `aws/`, no DB migrations
- Examples: `example-learn` (Astro → `dist/`, production `https://example-learn.com`), `my-org-website`, `checkboxes`, `ExampleGeo`

### Verification checklist (step 12)

1. **Integration landed** on `main` (PR merged or direct push succeeded).
2. **Production deployment READY** — poll via Vercel dashboard, Vercel MCP/API, or `vercel inspect <deployment-url>` until status is ready for the **merge SHA** (and confirm Git link org/repo when debugging disconnects). Typically 1–3 minutes after push. Supporting evidence only — not sufficient alone.
3. **`x-release-id` ≥ the PR merge SHA** on the documented production URL (follow redirects). **Required.** Pass when prod resolves to the merge commit **or any descendant** (`git merge-base --is-ancestor`). Exact tip-of-`main` equality is not required (concurrent merges would false-fail). HTTP 200 without this check is a **fail** (stale alias / wrong Git link / never rebuilt).

   ```bash
   # Prefer the skill helper (polls ~8 min for CDN lag). Pass the merge SHA:
   MERGED_SHA=$(gh pr view <n> --json mergeCommit --jq .mergeCommit.oid)
   bash "$(git -C $AGENT_CONFIG_ROOT rev-parse --show-toplevel)/skills/ship/scripts/verify-x-release-id.sh" \
     https://example-learn.com "$MERGED_SHA"

   # Or manually (supporting evidence only — prefer the helper's ancestor check):
   curl -sSIL https://example-learn.com | rg -i '^x-release-id:'
   # Pass only if header value is MERGED_SHA or a descendant; fail if missing, "dev", or behind.
   ```

   Full contract + recipe: `references/release-id.md`.
4. **Optional smoke:** fetch page and confirm title or key UI string (e.g. app name in `<title>`).
5. Record **`deploy: verified x-release-id={sha} (≥ {merged}) at <url>`** in step 14.

### Fallback — manual CLI deploy

Run `vercel deploy --prod` (or repo-documented command) **only when**:

- `{POST_PUSH_DEPLOYS}` or AGENTS.md names it as the deploy entry, **or**
- Git integration is broken/absent and production will not update on push alone.

### Do not

- Run AWS Lambda live checks for `vercel-static` profile.
- Treat "push landed" as "shipped" without URL verification when production is user-facing.

---

## AWS SAM and other code deploys (`aws-sam` profile)

For the **my-org SAM fleet** and **example-app**, code deploy is GitHub Actions after merge — do **not** run local `deploy:code` on PR ships. example-app may still document break-glass `npm run deploy:code`. The **infra deploy** (`npm run deploy:infra` / full SAM) is **admin-MFA human step-up** — never auto-run.

**Shared trigger (all aws-sam):** `.github/workflows/deploy.yml` runs via `workflow_run` after **successful CI on `main`** (triggering event `push`; STA also accepts bot-dispatched `workflow_dispatch` CI), plus human `workflow_dispatch` break-glass. PR CI does not deploy. Payload stays repo-specific (fleet: `update-function-code` + drift tags; STA: migrations + live-provider + Vercel web).

**Naming convention:** `deploy:code` = post-land Lambda code deploy (break-glass / STA; my-org fleet uses Actions instead). `deploy:infra` = full SAM/CloudFormation (human MFA). Vercel Git sites have no local deploy entry.

Because Deploy runs after merge (and after main CI), merge and Deploy are **not atomic**: a Deploy failure leaves `main` updated but runtime stale — fix forward and re-run. **`/ship` must babysit Deploy to green** (cap 3 fix-red cycles); CI-green + merge alone is not shipped. Fail loud as **`Merged/Pushed — deploy/verify failed`**.

The actual triggers/commands per repo live in each project's `AGENTS.md` and its deploy entry.

---

## What the skill deploys (and what to verify)

In step 3, capture deploy/verify rules into `{POST_PUSH_DEPLOYS}`. Examples:

- **`vercel-static`:** "After Vercel READY, verify `x-release-id` on production URL ≥ merge SHA; no manual vercel CLI."
- **`aws-sam` + Vercel web (STA):** "Required babysit `deploy.yml` after green main CI; verify `x-release-id` on the Vercel production URL ≥ merge SHA."
- **`aws-sam` (no HTTP app):** "Required babysit GitHub Actions `deploy.yml` after green main CI; `deploy: no-http-release-id (n/a)`."
- **`gate-only`:** "No deploy entry — `deploy: no-http-release-id (n/a)` / `deploy: none`."

Also read `docs/deploy-gotchas.md` (or equivalent) for preconditions.

## How to run (step 12) — AWS repos

1. Confirm step-11 push/merge succeeded.
2. **my-org SAM fleet + STA (required):** after merge, wait for main CI if needed, then babysit GitHub Actions **Deploy** until green (`gh run watch`). Cap 3 fix-red-Deploy cycles; then **`Merged/Pushed — deploy/verify failed`**. Do not treat PR CI green + merge as success. **example-app break-glass:** resolve `npm run deploy:code` / the repo's `aws/deploy.sh` only when AGENTS.md says so. Gate-only → `deploy: none`.
3. Watch for success signal (Deploy workflow green, Lambda updated, etc.).
4. **HTTP apps (STA Vercel web, etc.):** require `x-release-id` ≥ merge SHA on the documented production URL — see `references/release-id.md`. Actions green + HTTP 200 without the ancestor check is a fail.
5. Smoke-check when repo documents one.
6. Post-deploy live verification when diff affects external providers (see below) — **aws-sam only**, not `vercel-static`.
7. On Deploy failure: fix forward, re-run gate/push if code changed, re-dispatch or re-run Deploy; if still red after 3 cycles, fail the ship.

---

## Post-deploy live verification (diffs that affect live external behavior)

Some behavior is only exercised against **real** external services (payment providers, data/price APIs, LLM endpoints, SMS/email vendors) — and the local suite deliberately stubs every external call, so a green gate proves *nothing* about the live path. Where a repo has moved that coverage out of the local suite, the live check is **post-push, post-deploy, and manual** — the local run can no longer catch a real-API regression.

**When to run:** the diff touches code that could change how the app talks to a real external service — provider clients, request/response parsing, auth/scoping, retry/timeout policy, or the env/config feeding them. A docs-only or pure-internal diff does not warrant it.

**How (capture the repo's specifics into `{POST_PUSH_DEPLOYS}` at step 3):**

1. After the deploy lands, trigger the repo's live check — typically a **scheduled health-check Lambda invoked manually on demand** (`aws lambda invoke`), or whatever the repo's AGENTS.md documents as its live verification.
2. Confirm it **passes** — exit/handler success, no thrown error, no error-log/alarm fired. The whole point is that this runs against the real API, so treat a failure as a real regression, not flakiness.
3. Record the outcome in the step-14 summary (`live check: passed` / `live check: n/a — no live-affecting paths changed`). A failed live check is a stale/broken runtime — fix forward like a failed deploy.

**Reference: example-app.** There is no local live-provider test tier — provider keys (`MASSIVE_API_KEY`, `FINNHUB_API_KEY`, `XAI_API_KEY`) live only in the Lambda runtime. The scheduled `example-app-live-provider-check` Lambda (`src/handlers/live-provider-check.ts`) runs the real Massive/Finnhub round-trips and throws on failure. After a deploy that touched `src/lib/providers/`, the provider clients, or notification content built from live data, invoke it manually with `aws lambda invoke` and confirm it succeeds.

---

## AWS SAM deploy (Lambda / CloudFormation)

Most common fleet pattern for personal projects with an `aws/` directory.

### When it runs

**my-org SAM fleet** (shared-infra, todoist-backlog-scheduler, misc-notifications, personal-memory) **and example-app:** code deploy is GitHub Actions `.github/workflows/deploy.yml` via `workflow_run` after green CI on `main` — do **not** run local `deploy:code` on PR ships. STA local `npm run deploy:code` is break-glass only. The **infra** deploy (`npm run deploy:infra`, full SAM) is human-only and is *surfaced, not run*, when an infra-trigger path changed. The trigger paths below tell you which deploy a change warrants:

| Path prefix | Why | Which deploy |
| --- | --- | --- |
| `aws/template.yaml`, `aws/template.yml` | Stack definition, env vars, alarms, IAM | `deploy:infra` (human MFA) |
| `aws/deploy.sh` | Deploy script / bundling behavior | `deploy:infra` |
| `src/handlers/` / `aws/src/handlers/` | Lambda handler entrypoints | Actions code deploy (or STA break-glass `deploy:code`) |
| `src/lib/` | Shared code bundled into Lambdas | Actions code deploy (or STA break-glass `deploy:code`) |

**Important:** `src/lib/` changes often require a code redeploy even when handlers are unchanged — the bundled artifact includes shared modules. Do not skip code deploy just because only `src/lib/` changed.

### Preconditions (check before babysitting / break-glass)

1. **Deploy only after the push/merge to `main` lands** — never deploy a branch state that isn't on `main`.
2. **Break-glass local deploy:** AWS credentials must work (`AWS_PROFILE` per AGENTS.md). On SSO expiry, `aws sso login` and re-run — never switch profiles silently.
3. **`aws/samconfig.toml`** is usually gitignored — the user must have copied `samconfig.toml.example` once. If it's missing, surface that setup step; do not invent profile names.

### Command (what runs)

**Default (my-org fleet + STA):** GitHub Actions `deploy.yml` after green main CI — **required** babysit with `gh run watch` (cap 3; then `Merged/Pushed — deploy/verify failed`).

**Break-glass (example-app when AGENTS.md says so):**

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

### Reference: example-app

From root `AGENTS.md`:

- **Code deploy (GitHub-managed):** GitHub Actions runs `aws/deploy-web.sh --deploy-ci` after `main` CI passes — Supabase migrations + Lambda `update-function-code`. Local `npm run deploy:code` is break-glass only. Vercel web tier deploys via Vercel GitHub integration.
- **Web verify (required):** after merge, poll `https://example-app.com` until `x-release-id` is ≥ the PR merge SHA. Do not treat Actions green + HTTP 200 as sufficient — stale Vercel aliases fail this check. See `references/release-id.md`.
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

- **Vercel Git (`vercel-static`):** verify `x-release-id` ≥ merged SHA after deploy — do not treat HTTP 200 or "push landed" as shipped. Record `deploy: verified x-release-id={sha} (≥ {merged}) at <url>`.
- **AWS + Vercel web (STA):** babysit Actions **and** require the Vercel-tier `x-release-id` ≥ merge SHA — Actions green + HTTP 200 with a stale Vercel alias is still a fail.
- **AWS repos (no HTTP):** if a trigger path changed, confirm Actions deploy (my-org fleet) or run break-glass `deploy:code` when AGENTS.md says so. "Push landed" is not "shipped" until deploy succeeds.
- **Deploying before the push lands.** Run the entry only after `git push origin HEAD:main` succeeds, so the runtime never gets ahead of the remote.
- **Treating a deploy failure as a push failure.** The code *is* on `main`; the runtime is stale. Fix forward and re-run the deploy entry (idempotent) — and if it stays red, say so loudly in the final summary.
- **No deploy path wired (AWS repos).** If a repo deploys Lambda code but has neither GitHub Actions `deploy.yml` nor a documented break-glass `deploy:code`, flag it as a wiring gap — the fix is to add the deploy path to the repo, not to improvise commands here. Vercel Git-integrated repos intentionally have no local entry.
- **Auto-running the infra deploy.** Never run `npm run deploy:infra` / `aws/deploy.sh` (full SAM) from the skill — it needs admin MFA and is a human step-up (`rules/agent-cloud-access.md`). Surface the exact command and let the human run it.
- **Destructive deploys** (DB drops, infra teardown, prod resource deletes) still warrant a heads-up — if a repo's deploy entry does something irreversible, confirm with the user before running it.
