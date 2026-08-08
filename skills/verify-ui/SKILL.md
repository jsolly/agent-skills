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

**Product:** honest, inspectable proof that the **changed** user-visible surface
works in a real browser — or an explicit **not done** / **N/A**. Build,
typecheck, and unit green never substitute.

This is a completion gate for observable UI work, not the repo's E2E or
performance battery. Prefer harness-native browser automation; the skill-local
Playwright fallback is last-resort render/console only (see below).

## Activate or abstain

**Fire** on `/verify-ui`, after user-observable client changes, or when asked to
browser-smoke before calling UI done.

**Abstain / N/A** when the diff has no user-facing render path (server-only,
workers, internal APIs). Say so; do **not** invent homepage smoke as “UI done.”

**Stay in smoke scope** if the user also asks for full E2E or Core Web Vitals /
Lighthouse: verify the UI change (or honest not-done); do not treat perf/E2E as
the `/verify-ui` completion gate.

## Completion gate (every `done` claim)

All required; miss any → **not done**:

1. **Affected surface** — route(s) from the diff, against a healthy app origin
   from the repo's `AGENTS.md` **Local UI verification** (dev command, origin,
   auth). Homepage-only is valid only if that is the changed surface.
2. **Exercise or honest `render-only`** — use changed controls / responsive
   states. Label `render-only` only for copy/CSS/asset-only work with no
   interactive surface — still render-check it. Never mark `render-only` to
   skip exercising a changed control.
3. **Expected state** — human judgment against the capture matches change intent
   (no automated visual/DOM assert required).
4. **Console honesty** — new console **errors** or uncaught page errors ⇒ fail
   (not done). New **warnings** are listed in the receipt, never silently
   dropped. Do not claim `clean` when issues occurred.
5. **Dual viewports** — desktop-width and mobile-width visual evidence both
   present (~1280×900 and ~390×844 are fine defaults).
6. **Receipt fields** — route(s); interaction(s) or `render-only`; console
   status (`clean` or exact new warnings/errors); both screenshot
   paths/attachments.

Missing screenshots, unreachable route, missing required auth, untested changed
control, or new console/page errors ⇒ UI work is **not done**.

## Fleet means (not inventable)

### Local UI verification

- Read `AGENTS.md` **Local UI verification** for command, origin, route, auth.
  Do not invent a framework `dev` command or credentials.
- Reuse a healthy documented server; do **not** start a duplicate on another
  port. Prefer the route's visible ready state over flaky `networkidle`.
- Automated server start (when needed) is **executable + argv only** — never a
  shell string (in harness spawn APIs and in the fallback CLI).

### Auth / origin safety

- Only the repo's documented disposable/local test account — fleet fields
  `DEFAULT_USER` / `DEFAULT_PASSWORD` when that is what the docs name. Never
  production, never invent, never print secrets into logs/chat.
- Do not submit credentials until the browser's **final** origin matches the
  expected local app origin (redirect hops do not waive this).
- Unattended target URLs must not embed credentials (or query/fragment noise on
  the fallback path).

**Baseline fallback** (`scripts/smoke-ui.mts`) — last resort only when the
harness lacks browser automation **and** the target repo has Playwright /
`@playwright/test`. Run from the **target repo root** (resolves Playwright and
`--start-command` against `cwd`):

```bash
node <path-to-this-skill>/scripts/smoke-ui.mts \
  --url http://127.0.0.1:3000/affected-route
```

Add `--start-command npm --start-arg run --start-arg dev` only when nothing
healthy is up. The script enforces: loopback-only URLs; no credentials /
query / fragment; readiness `2xx` or same-origin `3xx`; fail if document
navigation leaves the requested origin or path; dual-viewport captures under
temp (or `--output-dir`); non-zero exit on console/page errors.

**Baseline alone cannot authorize done** when auth, a remote URL, or complex /
multi-step control exercise is required — obtain a richer browser session, or
report **not done**. Do not launder that gap as `render-only`.

### Artifacts

- Keep screenshots/receipts out of commits unless the repo explicitly versions
  those test artifacts.

## Receipt (short handoff)

- Route(s) tested
- Interaction(s) exercised, or `render-only`
- Console: `clean`, or exact new warnings/errors
- Desktop screenshot path/attachment
- Mobile screenshot path/attachment
- Status: done only if the completion gate holds; otherwise **not done** (what
  blocked) or **N/A** (no render path)

## Don't

- Don't declare UI done from green build/typecheck/unit alone.
- Don't smoke only an unrelated default route when the diff touched elsewhere.
- Don't skip a viewport; don't leave a changed control untested without honest
  `render-only`.
- Don't ignore console/page errors; don't hide new warnings.
- Don't use/invent/print production or fabricated secrets; don't submit login
  off the expected local origin; don't put creds in smoke URLs.
- Don't claim done from baseline render/console alone when richer evidence was
  required.
- Don't start servers via shell strings; don't duplicate a healthy documented
  server.
- Don't stretch `/verify-ui` into full E2E or performance auditing.
- Don't invent UI-done for server-only / no-render-path changes.
