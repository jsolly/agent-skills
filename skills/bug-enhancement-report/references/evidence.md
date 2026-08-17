# Evidence — collect, redact, shape

Load from the skill entry after the provider is resolved and the action is
`create` or a `comment` that adds signal. Facts you did not collect do not
go in the post.

## Host snapshot (required for bugs; include for enhancements when environment-specific)

Run from the environment that reproduces the problem (the user's machine,
the failing CI job, or the container — say which). The helper lives in
this skill directory, not the repro repo — invoke it by skill path from
the reproducing CWD (same pattern as `verify-ui`):

```bash
bash <path-to-this-skill>/scripts/collect-host-evidence.sh
```

(`scripts/collect-host-evidence.sh` is the skill-local helper.)

Add probes for the apps actually involved:

```bash
bash <path-to-this-skill>/scripts/collect-host-evidence.sh \
  --probe 'app --version' \
  --probe 'node -v'
```

Cursor product reports: never `--include-git`; probes, About Cursor, Request ID,
and DevTools are in `references/cursor-forum.md`. Never `--probe 'agent about'`.

Pass `--include-git` **only** when the subject is this codebase (vendor
tickets must not leak private repo identity, branch names, or untracked
filenames):

```bash
bash <path-to-this-skill>/scripts/collect-host-evidence.sh --include-git
```

If a specific process is implicated, sample it (`comm=` only, not argv):

```bash
bash <path-to-this-skill>/scripts/collect-host-evidence.sh --pid PID
```

Do not retype OS/CPU/memory numbers from memory — use the script output or
an equivalent live command. If the script is unavailable, collect the same
fields with native commands and quote them.

## Always collect when applicable

| Field | Bug | Enhancement | How |
| --- | --- | --- | --- |
| Summary | yes | yes | One sentence a stranger can search |
| Expected vs actual | yes | proposed vs current | Observed, not hoped |
| Repro steps | yes, numbered, starting from a clean state | yes when there is a current workaround | Commands/clicks you actually ran |
| OS + arch | yes | when relevant | Script |
| App / CLI / runtime versions | yes | the product being changed | `--version`, about dialog, `package.json` / lockfile — not guessed. Cursor: `references/cursor-forum.md` |
| Git SHA + branch + dirty | if the subject is this repo | if the subject is this repo | Collector `--include-git`, or `git rev-parse HEAD` + `git status -sb` — never `user.email`, never paste origin onto a vendor ticket |
| Logs | yes | rarely | Tail of the relevant log, crash report, CI log. Prefer files over screenshots of text |
| Stack traces | yes if a crash/exception | n/a | Full trace; do not trim the top frames |
| CPU / memory / load | hangs, slowness, OOM, leaks, crashes | n/a unless performance | Script system block + `--pid` sample; Activity Monitor / `top` excerpt if useful |
| Screenshots / recording | UI/visual bugs | UI proposals when it clarifies | Native attach if possible; otherwise path + "not attached" |
| Regression window | if it used to work | n/a | Last-known-good version or commit |

CI-only failures: include the workflow name, job URL, runner OS image, and
the failing step log — not just "CI is red."

## Redaction (before body or upload)

Strip or replace:

- Tokens, passwords, cookies, `Authorization` headers, API keys, private keys
- `.env`, `secrets.env`, cloud credential files, SSO cache
- Connection strings, session IDs, customer PII, email/password dumps

Rewrite home paths to `~` when the username is not needed to repro. Do not
redact versions, error codes, or stack frames. If a file is *only* secrets,
do not attach it. Core dumps, heap snapshots, and raw profiles stay local
unless the user explicitly asks to attach them — redaction cannot make
process memory safe.

If redaction cannot make a log safe, omit it and list it under **Gaps**.

## Body shape

Use the provider template when one exists. Otherwise:

### Bug

```markdown
### Summary
<one searchable sentence>

### Expected
<what should happen>

### Actual
<what happens>

### Repro
1.
2.

### Environment
<paste collect-host-evidence.sh output>

### Logs / stacks
Collapsible details wrapping a short redacted excerpt, or a link
to the gist/attachment (full file, not a screenshot of text). Extra
hang/OOM excerpts that are not already in the host snapshot go here
or under Additional context.

### Additional context
<regression window, related items, what you already tried>
```

### Enhancement

```markdown
### Summary
<one searchable sentence>

### Problem
<current behavior and who it hurts>

### Proposal
<concrete behavior; alternatives considered>

### Why this is not already covered
<link existing issues/docs you searched>

### Environment
<only if the request is platform-specific>
```

Keep the issue body under the provider's size limit. Large logs belong in
an attachment, gist, or snippet (see `references/providers.md` upload
ladder), with a short excerpt in the body so the item is still readable if
the link dies.

## Honesty

- Missing a version → write `unknown — <what you tried>`, never a plausible
  guess.
- Could not reproduce locally → say so; still include environment + logs
  from the original report if the user provided them.
- Resource numbers from an idle machine after the hang ended are not
  evidence of the hang — sample during the failure or label them stale.
