---
name: verify-ui
description: Use when the user says `/verify-ui`, after any user-observable UI/copy/style/asset/client-behavior change, or when asked to browser-smoke a page before declaring it done. Starts or reuses the documented dev server, exercises the affected route, captures desktop and mobile screenshots, and checks console errors. NOT for full E2E suites, performance audits, or server-only changes with no render path.
---

# Verify UI

Browser-smoke user-observable changes before completion. This is the deterministic evidence pass,
not the repo's full E2E or Core Web Vitals battery.

## Preconditions

1. Read the repo's `AGENTS.md` **Local UI verification** section for dev command, route, and auth.
2. Check existing terminals before starting another server.
3. If auth is required, use only the repo's documented disposable/local test account from
   `DEFAULT_USER` and `DEFAULT_PASSWORD`. Never use production credentials, invent values, print
   them, or submit them until the browser's final origin matches the expected local app origin.
4. Identify the changed route and interaction from the diff; do not smoke only the homepage unless
   that is the affected surface.

## Procedure

1. **Serve.** Reuse a healthy server or start the documented command and wait for an HTTP response.
2. **Open.** Navigate to the affected route in the harness-native browser.
3. **Authenticate.** Sign in with the documented local credentials when required.
4. **Exercise.** Use changed buttons, inputs, toggles, forms, navigation, and responsive states.
   Copy/CSS-only changes still need a render check.
5. **Capture.** Take screenshots at desktop (~1280px) and mobile (~390px).
6. **Inspect.** Confirm expected state and no new browser-console errors. New warnings belong in the
   receipt; clear regressions fail the smoke.
7. **Receipt.** End the user handoff with route, interactions, console status, and both screenshots.

If the harness lacks browser automation but the target repo has Playwright installed, run the
skill-local fallback **from the target repo root** (Playwright and `--start-command` resolve against
`cwd`). Point `node` at this skill's script (next to `SKILL.md`):

```bash
node <path-to-this-skill>/scripts/smoke-ui.mts \
  --url http://127.0.0.1:3000/affected-route
```

Add `--start-command npm --start-arg run --start-arg dev` only when no healthy server exists. Start
commands are executable + argument arrays, never shell strings. The fallback accepts loopback URLs
only, waits for a `2xx` readiness response (no redirect follow), rejects navigations that leave the
requested origin/path, captures both viewports under the system temp directory (or `--output-dir`),
records console warnings/errors, and exits non-zero on page or console errors. Use the native
browser for authentication, remote URLs, and complex interactions; the fallback is a baseline
render/console driver, not a substitute for exercising changed controls.

## Evidence contract

- Route(s) tested
- Interaction(s) exercised, or `render-only`
- Console: `clean`, or exact new warnings/errors
- Desktop screenshot path/attachment
- Mobile screenshot path/attachment

No screenshots, unreachable route, missing auth, untested changed control, or new console errors
means the UI work is **not done**.

## Gotchas

- A successful build does not prove rendered behavior.
- A screenshot at one width misses responsive failures; always capture both viewports.
- `networkidle` is unreliable for apps with live connections. Wait for the route's visible ready
  state instead.
- Do not start a duplicate server on a second port when a healthy documented server already exists.
- Keep screenshots and receipts out of commits unless the repo explicitly versions test artifacts.
