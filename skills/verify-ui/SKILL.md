---
name: verify-ui
description: >-
  Use when the user says `/verify-ui`, after any user-observable
  UI/copy/style/asset/client-behavior change, or when asked to browser-smoke
  before declaring UI work done. Produces a fail-closed evidence receipt
  (affected route, dual viewports, interactions or honest `render-only`,
  console status). NOT for full E2E suites, performance / Core Web Vitals
  audits, or server-only changes with no user-facing render path.
---

# Verify UI

**Product:** honest proof the **changed** user-visible surface works in a real browser — or explicit **not done** / **N/A**. Build/typecheck/unit green never substitute. Prefer harness-native browser automation; `scripts/smoke-ui.mts` is last-resort render/console only.

## Activate / abstain

- **Fire** on `/verify-ui`, after user-observable client changes, or when asked to browser-smoke before UI done.
- **N/A** when the diff has no user-facing render path — say so; do not invent homepage “UI done.”
- If user also asks for full E2E / Lighthouse / CWV: still complete (or honestly fail) **this** smoke gate — do not redefine success as those batteries.

## Completion gate (every `done` claim)

**All required; miss any → not done:**

1. **Affected surface** — route(s) from the diff, against a healthy origin from `AGENTS.md` **Local UI verification**. Homepage-only only if that is the changed surface.
2. **Exercise or honest `render-only`** — use changed controls / responsive states. Label `render-only` only when there is no interactive surface (copy/CSS/asset-only) — **never** to skip a changed control.
3. **Expected state** — human judgment that capture matches change intent (no automated visual/DOM assert required).
4. **Console honesty** — new errors / uncaught page errors ⇒ fail. New **warnings** listed in the receipt, never silently dropped; never claim `clean` when issues occurred.
5. **Dual viewports** — desktop-width and mobile-width visual evidence both present (~1280×900 / ~390×844 fine).
6. **Receipt fields** — routes; interactions or `render-only`; console status (`clean` or exact new warnings/errors); both screenshot paths/attachments; status.

Missing screenshots, unreachable route, missing required auth, untested changed control, or new console/page errors ⇒ **not done**.

## Fleet means (do not invent)

- Read `AGENTS.md` **Local UI verification** for command, origin, route, auth — never invent framework `dev` or credentials.
- Reuse a healthy documented server; do not start a duplicate on another port. Automated start = **executable + argv only** — never a shell string.
- Auth: only documented disposable/local test account; never production/invent/print secrets. Do not submit credentials until browser’s **final** origin matches expected local app origin. Unattended URLs must not embed credentials (or query/fragment noise on the fallback path); fallback targets loopback-only and fail if navigation leaves requested origin/path.
- Baseline fallback from **target repo root** (requires Playwright there):

```bash
node <path-to-this-skill>/scripts/smoke-ui.mts \
  --url http://127.0.0.1:3000/affected-route
```

  Add `--start-command npm --start-arg run --start-arg dev` only when nothing healthy is up. **Baseline alone cannot authorize done** when auth, remote URL, or multi-step exercise was required — do not launder that gap as `render-only`.

- Keep screenshots/receipts out of commits unless the repo versions them.

## Receipt

Route(s) · Interaction(s) or `render-only` · Console (`clean` or exact new warnings/errors) · Desktop screenshot · Mobile screenshot · Status (`done` only if completion gate holds; else **not done** + blocker | **N/A**)

## Don't

- Declare UI done from build/typecheck/unit alone
- Smoke only an unrelated default route; skip a viewport; misuse `render-only` on changed controls
- Hide new warnings or ignore console/page errors
- Use/invent/print production or fabricated secrets; login off expected origin; put creds in smoke URLs
- Stretch into full E2E or performance audits as this gate
- Invent UI-done for server-only / no-render-path changes
