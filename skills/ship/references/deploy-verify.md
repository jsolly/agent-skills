# Post-land deploy / verify

Merge ≠ shipped when the profile has a runtime story. Prove what AGENTS.md declares; do not improvise undeclared deploy commands. Never deploy/verify a branch state that is not on `main`. Never auto-run admin-MFA / `deploy:infra` (surface for a human when infra paths changed). Destructive/irreversible deploys still need explicit human confirmation.

## HTTP release-id (fleet contract)

For user-facing HTTP apps, production must respond with `x-release-id` resolving to a commit **equal to or a descendant of** the PR merge SHA (or pushed SHA on direct-push):

```bash
git fetch origin main
MERGED_SHA=$(gh pr view <n> --json mergeCommit --jq .mergeCommit.oid)
# Prefer scripts/verify-x-release-id.sh <prod-url> "$MERGED_SHA"
# Pass: git merge-base --is-ancestor MERGED_SHA PROD_SHA
```

**Fail** if header missing, `dev`, dirty (`*-dirty`), unresolved, or still behind merge after polling. Platform READY + HTTP 200 are supporting evidence only — insufficient alone. Exact tip-of-`main` equality is **not** required (concurrent merges would false-fail).

No user-facing HTTP surface → record `deploy: no-http-release-id (n/a)` — do not invent a probe.

## By profile

### `vercel-static`

1. Confirm merge/push landed on `main`.
2. Wait for production deploy READY for the merge (Git-triggered — do not run `vercel deploy --prod` unless AGENTS.md names it or Git integration is absent).
3. Require `x-release-id` ≥ merge SHA on the documented production URL.
4. Record `deploy: verified x-release-id={sha} (≥ {merged}) at <url>`.

### `aws-sam`

Code deploy is typically GitHub Actions `.github/workflows/deploy.yml` via `workflow_run` after **green CI on `main`** — PR CI does not deploy. Local `deploy:code` only when AGENTS.md documents break-glass.

1. After merge: babysit **Deploy** to green (`gh run watch`). Cap **3** fix-red-Deploy cycles; still red → **`Merged/Pushed — deploy/verify failed`** (do not lead with clean ship).
2. If HTTP/Vercel web tier exists: also require release-id ≥ merge SHA.
3. Pure-infra / no HTTP → `deploy: no-http-release-id (n/a)` after Deploy green.
4. **Live external check:** when the diff touches live provider/external integration paths the repo treats as post-deploy-only, run the documented live check after Deploy; failure = deploy/verify failure. If no live-affecting paths changed → explicit `live check: n/a`.
5. Never auto-run `deploy:infra`.

### `heroku-git`

After merge: verify a Heroku release is visible for `main` (`heroku releases` / repo-documented equivalent). If the app serves HTTP, also require release-id ≥ merge SHA. Do not invent an aws-sam Deploy loop for this profile.

### `gate-only` / `docs-config`

`deploy: none` / `deploy: no-http-release-id (n/a)`.

## Wiring gaps

If a repo clearly deploys runtime code but has neither a documented Actions deploy path nor a break-glass entry, flag the gap — do not invent commands.
