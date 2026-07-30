# Fleet release-id contract (`x-release-id`)

Normative contract for every my-org HTTP app. `/ship` step 12 uses this to prove the
**merged commit is live** — not mere HTTP 200, and not “Vercel says READY” alone.

Motivating incident: example-app merged + `deploy.yml` green + prod HTTP 200, but
Vercel never built the new SHA (Git link stuck on a transferred org). False green.

## Contract

| Item | Rule |
| --- | --- |
| Header name | `x-release-id` (lowercase; HTTP is case-insensitive) |
| Value | **12-char** git SHA (fleet default). Short or full SHA both resolve via `git rev-parse`. |
| Source | Build-time only: `VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA` / `git rev-parse HEAD` — never runtime `git` |
| Local/dev | May be `"dev"`; production builds must never ship `"dev"` |
| Where set | Prefer middleware / shared response hook so **HTML + API** both get it on unauthenticated probes. Static Vercel sites may stamp the header into `vercel.json` at prebuild. |
| Probe URL | Document per repo in `AGENTS.md` `## Ship` (default: production origin `/`) |
| Optional | `<meta name="release-id" content="…">` for humans; **header is canonical for agents** |
| Security | Short SHA only; no secrets/PII; CSP usually unchanged |

## Out of scope (skip with explicit n/a)

Pure infra / config repos with no user-facing HTTP app (`shared-infra`, `dotagents`, etc.):
record `deploy: no-http-release-id (n/a)` in step 14. Do **not** invent a probe URL.

## Recipe (copy into each HTTP app)

### 1. Stamp script (build-time)

Mirror example-app' build-time stamp script (`gen-release-id.ts` under the app's
`scripts` directory, or a plain `.mjs` twin):

1. Resolve SHA: `VERCEL_GIT_COMMIT_SHA` → `GITHUB_SHA` → `git rev-parse HEAD` → `"dev"`.
2. Take first 12 chars. Optionally append `-dirty` when stamping from a dirty local tree
   (skip dirty detection when SHA came from env / Vercel).
3. Write a committed stub module (e.g. `src/release-id.ts` exporting `RELEASE_ID = "dev"`)
   used for optional HTML `<meta name="release-id">`. The **HTTP header** comes from
   middleware (see below), not from stamping `vercel.json`.
4. `prebuild` stamps the module; `postbuild` restores the stub so the generated value is
   never committed.

### 2. Emit the header

- **SSR / Astro middleware (preferred when the adapter runs request middleware):**
  `response.headers.set("x-release-id", RELEASE_ID)` (optionally fall back to
  `VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA` when the module is still `"dev"`).
- **Static Vercel (no request middleware):** use **root Edge Middleware**
  (`middleware.ts` + `@vercel/edge` `next()`) that sets `x-release-id` from
  `VERCEL_GIT_COMMIT_SHA` at request time. **Do not stamp `vercel.json` headers** —
  Vercel serves the committed `vercel.json` as-is; a build-time rewrite does not
  change the live header (that left the fleet shipping `"dev"`).

### 3. Contract test

Assert middleware wires the header (root Edge Middleware or Astro `src/middleware.ts`).
Reject `x-release-id` entries in committed `vercel.json`. For a production-like module
stamp (`VERCEL_GIT_COMMIT_SHA` set), assert value ≠ `dev`.

### 4. `AGENTS.md` `## Ship` one-liner

```bash
curl -sSIL https://<prod>/ | rg -i '^x-release-id:'
```

## `/ship` verify procedure (step 12)

**Pass condition:** production's `x-release-id` resolves to a commit that is **equal to or a
descendant of** the minimum SHA (`git merge-base --is-ancestor MIN PROD`). Exact tip-of-`main`
equality is **not** required — a later merge that includes this ship's commit still passes.

After merge (and after profile babysit: Vercel READY and/or `deploy.yml` / Heroku release):

1. **Pin the minimum SHA** to the PR's merge commit (not tip of `main`, which may have moved):

   ```bash
   git fetch origin main
   MERGED_SHA=$(gh pr view <n> --json mergeCommit --jq .mergeCommit.oid)
   # direct-push: MERGED_SHA=$(git rev-parse HEAD) after the push lands
   ```

2. **Poll** until prod is at or ahead of that SHA:

   ```bash
   URL=<production URL from AGENTS.md ## Ship>
   bash "$(git -C $AGENT_CONFIG_ROOT rev-parse --show-toplevel)/skills/ship/scripts/verify-x-release-id.sh" \
     "$URL" "$MERGED_SHA"
   ```

   Helper default (no second arg): tip of `origin/main` — fine for ad-hoc checks; **ship must
   pass the merge SHA** so concurrent merges cannot false-fail.

3. **Pass** only when the ancestor check holds. **Fail loudly** if header missing, `dev`,
   `-dirty`, prod still behind `MERGED_SHA`, unresolved SHA, or timeout (~8 minutes).

Record in step 14: `deploy: verified x-release-id={sha} (≥ {merged}) at https://…`

HTTP **200 alone is insufficient**. Vercel READY / Actions green are supporting evidence only.

Tip-of-`main` equality remains useful as an optional ops/doctor “is production fully current?”
check — it is **not** `/ship` success.

## Profile matrix

| Profile | Verify |
| --- | --- |
| `vercel-static` | Vercel READY for merge SHA **and** `x-release-id` ≥ merge SHA |
| `aws-sam` + Vercel web (STA) | `deploy.yml` babysit **and** `x-release-id` ≥ merge SHA on the Vercel production URL |
| `heroku-git` | Heroku release **and** `x-release-id` ≥ merge SHA if the app serves HTTP |
| `gate-only` / no HTTP | skip; `deploy: no-http-release-id (n/a)` |

## Rollout checklist

| Repo | Status |
| --- | --- |
| `example-app` | reference — Astro middleware + existing `gen-release-id.ts` |
| `example-learn` | static — Vercel Edge Middleware (`VERCEL_GIT_COMMIT_SHA`) |
| `my-org-website` | static — Vercel Edge Middleware (`VERCEL_GIT_COMMIT_SHA`) |
| `checkboxes` | Astro/Vercel adapter — Astro middleware (+ env fallback) |
| ExampleGeo / others | add when present under `~/code` |
| `dotagents`, `shared-infra`, … | n/a (no HTTP app) |
