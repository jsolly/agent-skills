# Integrate — PR path (default) + cycle caps

**No fire-and-forget.** After a PR opens, watch required checks, fix forward, merge when green, then post-land verify.

## Before push

1. On a feature branch (create from fresh `origin/main` if currently on `main`).
2. Run local gate at `{CI_OWNER}` depth — full for `local`, cheap subset for `github-handoff`. Re-run explicitly; do not rely on commit-time hooks alone.
3. Cap local push-gate-fix at **3**; on the next failure → **`Not pushed`** / **`Stopped — not pushed`**.

## Push + open PR

```bash
git push -u origin HEAD # DOTAGENTS_SHIP=1
DOTAGENTS_SHIP=1 gh pr create --title "…" --body "…"
```

Never push `HEAD:main` on the PR path. Never `--no-verify`. If a PR already exists for the branch, reuse it (`gh pr view`) — no create allow needed.

## Auto-merge

- Arm only on PRs **this ship run** opened (your credentials): `gh pr merge --auto --squash`.
- **Never** arm third-party / Dependabot PRs.
- If arming fails with “Auto merge is not allowed” — plan-gated (private Free) — note `auto-merge: unavailable (plan-gated)`. Continue babysitting; when green, `gh pr merge --squash`. Expected `auto-merge.yml` noise on those repos is not a regression.

## Babysit PR CI (every PR ship, both CI owners)

1. Watch required checks (`gh pr checks --watch` or poll) until **`CI / ci`** (or the repo’s documented required check) completes.
2. On red: read logs, fix forward on the **same branch**, commit, `git push # DOTAGENTS_SHIP=1`, re-watch. Cap **3** fix-red cycles; on the **4th** red → **`Not merged`** (name the check).
3. Out-of-date branch: `gh pr update-branch` (or equivalent), re-watch.
4. On green: let auto-merge land, or manual squash when plan-gated.
5. Do **not** run profile deploy/verify while the PR is still open (except documented exceptions in AGENTS.md).

`PR open — auto-merge pending CI` is valid **only while still babysitting**. Ending the run there without user abort = incomplete ship.

## Direct-push / break-glass

Only when `{INTEGRATION_MODEL}` is `direct-push` or user explicitly requests emergency bypass:

```bash
git push origin HEAD:main # DOTAGENTS_SHIP=1
```

Then babysit GitHub CI on `main` when Actions run. Lead with **`Shipped to main`** only after gate + deploy/verify succeed — never use that lead for the PR path.

## Cap summary

| Loop | Cap | On exhaustion |
| --- | --- | --- |
| Review-fix | 3 | Stop / **`Stopped — not pushed`** |
| Local push-gate-fix | 3 | **`Not pushed`** |
| PR CI fix-red | 3 | **`Not merged`** |
| aws-sam Deploy fix-red | 3 | **`Merged/Pushed — deploy/verify failed`** |
