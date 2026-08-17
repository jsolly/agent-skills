# Fail-open detection catalog

Fourteen defect classes plus one classification bucket. Each carries the shape, a
recall-first sweep recipe, the structural confirmation, and — where the class is
noisy — the trap that makes it a false positive. Sweep every class that applies
to a surface present in the repo.

## Sweep hygiene

**Pass `--hidden`, and exclude `.git/`.** ripgrep skips dot-directories by
default, so without `--hidden` the `.github/workflows/`, `.git-hooks/`,
`.circleci/`, and `.husky/` gates are invisible and the sweep reports clean
instead of reporting that it never looked. With `--hidden` you also pull in
git's own tree — its stock `hooks/*.sample` scripts are shebang'd and
extensionless, so they slip past extension globs but land squarely in the
shebang list and every glob-free recipe. Always pair them:

```bash
rg -n --hidden -g '!.git/*' '<pattern>'
```

**Resolve shell files by shebang, not by extension.** `bin/deploy`,
`scripts/release`, `configure`, and `.git-hooks/pre-commit` are shell scripts
with no `.sh` suffix, and `-g '*.sh'` misses them. Build the list once, then
**re-run every `-g '*.sh'` arm in classes 3–6 and 10 over it** — the extension
glob is the fast first pass, not the whole sweep:

```bash
rg -l --hidden -g '!.git/*' '^#!.*\b(ba|k|z)?sh\b' | tr '\n' '\0' \
  | xargs -0 rg -nH '\|\|\s*(true|:)\s*(#.*)?$'
```

Keep `-H`: with a single input file ripgrep drops the path and the audit loses
its evidence location. Avoid `mapfile` — it is a bash builtin and the agent's
shell may be zsh.

**Resolve embedded languages by content, not by container extension.** A
`.sh` file can hold hundreds of lines of Python in a heredoc, and the
`-g '*.py'` arms will never see them while the glob-free recipes quietly report
findings from them — the audit then claims the surface was unswept *and* cites
its findings. Probe for hosts first:

```bash
rg -ln --hidden -g '!.git/*' -e 'python3?\s+-?\s*<<' -e 'node\s+(-e|--eval|<<)' -e 'perl\s+-e' -e 'ruby\s+-e'
```

Re-run the class 1/2/5/6 language arms over exactly those files with the
extension glob dropped, and record the surface as `swept (embedded)` naming the
hosts.

**Exit code 2 is not a clean sweep.** `rg: No files were searched` means the
glob matched nothing (no Go in the repo, a typo'd extension). Record that
surface as **unswept** — never as clean, and only after the embedded-interpreter
probe above also comes back empty. An empty result from a language that is
present and an empty result from a language that was never read look identical
in the terminal and are opposites in an audit.

## Severity ladder

| Severity | Test |
| --- | --- |
| `safety` | The suppressed failure was an authz/authn/validation/integrity check, a CI security or test gate, or a deploy/permission step. Failure means the system allows what it should deny. |
| `reliability` | Work is silently skipped, data silently lost or stale, or a caller is told "success"/"empty" when it was "unknown". Default bucket. |
| `ux` | A user-visible nicety degrades; correctness and data are intact. |
| `telemetry` | Only observability itself is lost (a metric or beacon never sent). |

## Audit record fields

`path` · `line` (or range) · `class` · `evidence_quote` (verbatim) · `language`
· `detector` (regex / read / linter rule id) · `confidence` (high/medium/low) ·
`intended` (`true` / `false` / `unclear`) · `intended_rationale` (quote or
"none found") · `severity` · `co_classes` (other classes that matched the same
site) · `fix_direction` (one line).

## Triage rules

- **One row per `file:line`.** Several classes will match the same site (a
  `return True` inside a loop handler hits 2, 7, and 10). Keep the
  highest-severity class as `class` and list the rest in `co_classes`.
- **A predicate whose failure value is its correct answer is not a finding.**
  `isValidUrl()` returning `false` when `new URL()` throws is the right answer,
  not a swallowed error. The test is whether the caller is *misled*.
- **Exclude** `.git/`, `node_modules/`, `vendor/`, `dist/`, lockfiles — and,
  when auditing the repo that hosts this skill, `skills/find-fail-open/` itself:
  the catalog's own example code matches its own recipes.

## 1. Empty catch / bare except / ignored error value

Handler contains no rethrow, no state change, no error return — execution
continues as if the call succeeded.

```bash
rg -n -U --pcre2 'catch\s*(\([^)]*\))?\s*\{\s*\}' -g '*.{js,jsx,ts,tsx,mjs,mts}'
rg -n -U --pcre2 'except[^\n]*:\s*(pass|continue)\b|except[^\n]*:\n\s*(pass|continue)\b' -g '*.py'
rg -n -U 'if err != nil \{\s*\}|if [^;\n]+; err != nil \{\s*\}' -g '*.go'
rg -n '(^|[^\w.])_\s*(,\s*\w+)?\s*:?=\s*[\w.]+\(|\w+\s*,\s*_\s*:?=\s*[\w.]+\(' -g '*.go'
```

Three regex traps this catalog has paid for. The JS/TS pattern needs `-U` (the
closing brace is usually on its own line) and an *optional* binding (`catch {}`
is the modern spelling). The Python pattern must anchor on `pass`/`continue` —
a bare `except[^:]*:\s*$` matches every multi-line `except` clause in the repo,
empty or not. The Go discard pattern must allow `:=` and a dotted callee, or it
misses `v, _ := os.Open(...)`, the single most common ignored-error idiom.

**Confirm:** the block is truly empty (or comment-only) *and* something
downstream depends on the call having succeeded.

**Trap:** a comment inside the block is an annotation, not proof — record it
`intended: unclear`, low confidence, don't auto-drop. Close/cleanup calls whose
failure has no consequence are genuinely benign.

## 2. Catch-then-return-default

The handler converts a failure into a normal-looking value (`[]`, `{}`, `null`,
`0`, `false`, cached/previous state) so the caller cannot distinguish "no data"
from "failed to get data".

```bash
rg -n -U --pcre2 'catch\s*(\([^)]*\))?\s*\{[^}]{0,200}return\s+(\[\]|\{\}|null|undefined|false|true|0)\s*;?\s*\}' -g '*.{js,jsx,ts,tsx,mjs,mts}'
rg -n -U --pcre2 'except[^\n]*:\n(\s+.*\n){0,3}\s*return\s+(\[\]|\{\}|None|0|False|True)' -g '*.py'
rg -n -U --pcre2 'if err != nil \{\s*return (nil|\[\]|""|0|false|true)\s*\}' -g '*.go'
```

Do not append `\b` after those alternations — `]` and `}` are non-word
characters, so a trailing word boundary can never assert and `return []` /
`return {}` silently stop matching.

**Confirm:** trace one call site — if the caller branches on that value as
though it were real data, it is fail-open. This is usually the highest-volume
class. A permissive default on a check is class 10, not this one.

**Trap:** documented `Optional`/`Result`-style APIs where `null`/`None` means
"absent" and every call site checks it explicitly. The Go pattern deliberately
requires a **single** return value: `if err != nil { return nil, err }` is
correct propagation, and a recipe that matches it drowns the audit in the most
common three lines in Go.

## 3. Fire-and-forget async / detached work

The outcome of started work is never observed.

```bash
rg -n --pcre2 '\.catch\(\s*\(?[^)]*\)?\s*=>\s*\{\s*\}\s*\)|\bvoid\s+\w+\(' -g '*.{js,jsx,ts,tsx,mjs,mts}'
rg -n 'process\.on\(\s*.unhandledRejection' -g '*.{js,ts,mjs,mts}'
rg -n '^\s*go\s+\w+\(' -g '*.go'
rg -n --hidden -g '!.git/*' '[^&]&\s*$' -g '*.sh' -g '*.bash'
```

**Confirm:** JS/TS — an un-awaited call inside an `async` function needs the
enclosing function read; regex cannot prove absence of `await`, so for a bare
floating `doThing();` the only reliable detector is
`@typescript-eslint/no-floating-promises` — run it when the repo already
type-checks instead of guessing. Go — no error channel/`errgroup`/`recover`.
Bash — no later `wait "$pid"` with a status check. A global
`unhandledRejection` handler that only logs converts a crash-visible failure
into a silent one: flag it.

**Trap:** `void main().catch(handler)` at a module top level is the
*recommended* TypeScript entrypoint idiom, not a finding — `void` with an
attached handler is the opposite of fire-and-forget. The bash pattern excludes
a preceding `&` so `cmd &&` continuations don't match, but a trailing `&` in a
comment, quoted string, or URL still will. Deliberately non-blocking analytics beacons →
`telemetry` severity, `intended: true`.

## 4. Shell suppression idioms

```bash
rg -n --hidden -g '!.git/*' '\|\|\s*(true|:)\s*(#.*)?$' -g '*.sh' -g '*.bash' -g '.git-hooks/*' -g '.husky/*'
rg -n --hidden -g '!.git/*' '2>\s*/dev/null' -g '*.sh' -g '.git-hooks/*'
rg -n 'set\s+\+e' -g '*.sh'
rg -n 'if\s+\[\s+\$\?|\$\?\s*-(eq|ne)' -g '*.sh'
rg --files-without-match --hidden -g '!.git/*' 'pipefail' -g '*.sh' -g '.git-hooks/*'
```

Match `pipefail` as a bare word — a flag-shaped pattern like
`set -[a-z]*e[a-z]*o pipefail` misses `set -uo pipefail` and `set -Eeuo
pipefail`, turning the recipe into an all-false-positive list.

**Confirm:** does the script go on to report success (log line, exit 0, next
step) despite the suppressed failure? Also flag pipelines where only the last
stage's status is observed, and `A && B || C` used as if/then/else (`C` runs
when `B` fails too — ShellCheck `SC2015`).

**Trap:** highest-volume class in the catalog — a repo of any size returns
`2>/dev/null` by the hundred, and `rm -f tmp || true` cleanup is legitimate.
Triage by target: suppression on a *check, gate, install, or deploy* command is
a finding; suppression on cleanup, existence probes, and `command -v` is not.
Judge by what the suppressed command does, not by the idiom.

## 5. Status-blind HTTP/API handling

```bash
rg -n -B2 '\.json\(\)|\.text\(\)' -g '*.{js,jsx,ts,tsx,mjs,mts}'
rg -n -B2 '\.json\(\)' -g '*.py'
rg -n -A2 'http\.(Get|Post|Head|Do)\(' -g '*.go'
rg -n --hidden -g '!.git/*' 'curl ' -g '*.sh' -g '.git-hooks/*' -g '.github/**'
```

**Confirm:** a status check is missing on the same object in the enclosing
block, so a 404/500 body is parsed as data — `res.ok` / `response.status`
(JS/TS), `resp.status_code` / `raise_for_status()` (Python), `resp.StatusCode`
(Go), `--fail`/`-f` or an explicit `-w '%{http_code}'` test (curl). Pay special
attention to `curl … | tar`/`| sh` install steps: without `pipefail` only the
last stage's status survives, so a failed download installs nothing and the
step still goes green.

**Trap:** APIs that return 200 with an error envelope (GraphQL-style) where
status-blind is the contract — check for downstream error-field inspection
before flagging.

## 6. Tool/resource absence → skip

```bash
rg -n --hidden -g '!.git/*' -A3 'command -v |which \w+ >' -g '*.sh' -g '.git-hooks/*' -g '.github/**'
rg -n -A3 'except (ImportError|ModuleNotFoundError)' -g '*.py'
rg -n -i --hidden -g '!.git/*' 'not (found|installed).{0,40}(skip|skipping)|skipping\b'
```

**Confirm:** read the `-A3` context — the presence guard is only a finding when
the missing-dependency branch **continues**. A guard whose else-branch is
`exit 1` / `return 1` / `die` fails *closed* and is correct; most `command -v`
hits in a healthy repo are that shape, which is why this recipe is run with
context rather than as a bare line match.

**Trap:** documented optional dependencies. Severity hinges on what the tool
would have checked: a skipped security scanner in CI is `safety`, a skipped
formatter is `ux`.

## 7. Loop continue-after-log with no aggregate

```bash
rg -n -U --hidden -g '!.git/*' --pcre2 '(except|catch)[^\n]*\n(\s+.*\n){0,4}\s*(continue|return)\b'
```

**Confirm:** the handler is **inside a loop** and the function still returns
success — no error counter, failure list, dead-letter queue, or partial-failure
result referenced after the loop. Without the loop, the hit belongs to class 2;
this recipe deliberately over-matches and the loop check is what separates them.
The same shape covers retry loops that swallow the final attempt's failure.

**Trap:** batch jobs that do track failures out of band; look for the
accumulator before flagging.

## 8. Degrade-and-forget flags

A subsystem catches its first error, flips itself to disabled, and serves
degraded behavior indefinitely with no alert and no re-check (circuit breaker
stuck open, silently).

```bash
rg -n -U --hidden -g '!.git/*' --pcre2 '(catch|except)[^\n]*\n(\s+.*\n){0,4}\s*\w*[Ee]nabled\w*\s*=\s*(false|False|0)'
rg -n -i -g '!*.md' -g '!.git/*' 'degraded|fallback mode|disable[d]? (the )?(feature|check)'
```

The second recipe excludes markdown deliberately: prose and filenames about
degradation outnumber code that degrades, and every hit in docs is noise.

**Confirm:** no metric/alert emitted at the moment of disabling, and no reset
or expiry path. A companion alert in another file clears the hit.

**Trap:** a deliberate circuit breaker that does emit a metric at trip time —
the emission may live in a sibling file, so read the call site before flagging.

## 9. CI / build-config suppression

A gate runs, fails, and the pipeline stays green. Highest-severity class by the
ladder whenever the neutered step is a security scan, test suite, or type/lint
gate — and the easiest to miss, because the surface is YAML, JSON, and
Makefiles rather than a programming language.

```bash
rg -n --hidden -g '!.git/*' 'continue-on-error:\s*true|if:\s*always\(\)|failure\(\)' -g '*.{yml,yaml}'
rg -n --hidden -g '!.git/*' -e '--exit-zero|--passWithNoTests|\|\|\s*true|\|\|\s*:' -g '*.{yml,yaml}' -g 'package.json' -g '[Mm]akefile*' -g 'GNUmakefile' -g '*.mk' -g 'Dockerfile*'
rg -n --pcre2 '^\t\s*-' -g '[Mm]akefile*' -g 'GNUmakefile' -g '*.mk'
rg -n --hidden -g '!.git/*' 'exit 0' -g '.git-hooks/*' -g '.husky/*' -g '*.yml' -g '*.yaml'
```

**Confirm:** the suppressed step is a gate someone believes is enforcing
something. `continue-on-error: true` on a security scan, `--exit-zero` on a
linter, a leading `-` on a make recipe, `|| true` in a `package.json` script,
or a hook that always `exit 0`s all produce a green check over a red result.

**Trap:** `continue-on-error` on a genuinely advisory/experimental matrix leg,
and `if: always()` used correctly for artifact upload or cleanup steps. What
matters is whether a human reads the green check as "the gate passed".

## 10. Permissive default on a check (fail-open authorization)

The literal security sense of the name: a gate cannot complete its check —
policy service down, secret unset, token unparseable, scanner missing — and
returns the *permissive* answer. Every other class looks for a restrictive
default (`[]`, `null`, `false`); a gate fails open by returning `true`, or in
shell by `exit 0`. Always `safety` severity.

```bash
rg -n -U --hidden -g '!.git/*' --pcre2 '(catch|except)[\s\S]{0,200}?return\s+(true|True)\b'
rg -n --hidden -g '!.git/*' -i -A3 'if\s*\(?\s*!\s*(process\.env|os\.environ|getenv|\w+)\s*\)?\s*\{?\s*return\s+(true|True)'
rg -n --hidden -g '!.git/*' -i -A3 '(secret|token|key|policy|acl|role|scope)\w*\s*(\?\?|\|\||=)\s*("")'
rg -n --hidden -g '!.git/*' -i 'return (true|True)\s*;?\s*($|#|//)' -g '*{auth,authz,authn,permission,policy,verify,guard,acl}*'
rg -l --hidden -g '!.git/*' '^#!.*\b(ba|k|z)?sh\b' | rg -i 'guard|gate|auth|check|verify|policy|hook' \
  | tr '\n' '\0' | xargs -0 rg -nH -B3 -e '^\s*exit 0\s*$' -e '\|\|\s*exit 0' -e '\|\|\s*\{[^}]*exit 0'
```

Do not skip the shell arm. In a bash-heavy repo the permissive value is not
`return true` — it is `exit 0`, a `return 1` from a predicate, or a call to an
`allow` helper, and a JS/Python-only class-10 sweep reports zero findings on a
tree full of guards.

**Confirm:** the function or script decides whether something is allowed (name,
callers, or "non-zero exit blocks something" says so), the *cannot-check*
branch returns allow, and no caller re-checks. The canonical shapes:

```ts
const secret = process.env.WEBHOOK_SECRET ?? "";
if (!secret) return true;   // unconfigured -> everything verifies
```

```bash
git rev-parse --show-toplevel >/dev/null 2>&1 || exit 0   # not a repo -> guard allows
```

**Trap:** `return true` on a *non*-gate (a "did anything change" predicate, a
retry-should-continue flag) is not this class, and a guard that deliberately
fails open because blocking-on-uncertainty is worse is `intended: true` — quote
its rationale comment, keep the row, don't drop it. Do **not** grep bare
`allow`/`permit`: in a guards tree every hit is a comment or a call to the
hook protocol's own success verdict helper, which is the *correct* outcome of a
check that ran. The finding is the path where the check could not run.

## 11. Missing or swallowed deadline

A call that can hang forever never produces a failure, so it never produces a
signal; or a timeout does fire and is handled as an empty/clean result.

```bash
rg -n --hidden -g '!.git/*' 'curl |fetch\(|requests\.(get|post)|http\.(Get|Post|Do)\('
rg -n -i --hidden -g '!.git/*' 'timeout|--max-time|AbortController|signal:|WithTimeout|deadline'
```

**Confirm:** cross the two lists. A network or subprocess call absent from the
second list has no deadline — an unresponsive dependency turns into a hung job,
not a caught error. A call present in both is a finding only when the
timeout branch degrades silently (returns empty, logs and continues, marks the
check passed).

**Trap:** calls behind a client library that sets a default timeout, and
deliberately unbounded long-poll/stream connections.

## 12. Vacuous pass

The gate is green because it examined nothing. No suppression flag and no
swallowed error — the check honestly succeeded over an empty input set.

```bash
rg -n --hidden -g '!.git/*' -e '--passWithNoTests|--if-present|--no-error-on-unmatched-pattern' -g '*.{yml,yaml,json,sh}'
rg -n --hidden -g '!.git/*' 'for \w+ in .*\$\(' -g '*.sh'
```

**Confirm:** this class is confirmation-led, not regex-led. For each gate in the
repo (test run, linter, scanner, migration check), ask: if its input glob
matched zero files, would it still pass? A runner with `--passWithNoTests`, a
loop over a command-substituted list that came back empty, a `grep`-based
assertion whose pattern can never match, and a fixture generator that produced
no cases all report success having verified nothing. The tell is the absence of
an input-count assertion.

**Trap:** genuinely optional steps (a docs build with no docs). Severity follows
what the gate was supposed to prove.

## 13. Verification disabled by configuration

The check is not swallowed and does not fail to run — it is configured never to
fail. TLS/signature/checksum verification is switched off, so a forged or
corrupt input sails through with no error to catch. Always `safety`.

```bash
rg -n --hidden -g '!.git/*' -i 'rejectUnauthorized:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|InsecureSkipVerify:\s*true|verify\s*=\s*False|CERT_NONE|GIT_SSL_NO_VERIFY'
rg -n --hidden -g '!.git/*' 'curl [^|]*\s(-k|--insecure)\b|wget [^|]*--no-check-certificate'
rg -n --hidden -g '!.git/*' -i 'sha256|checksum|gpg --verify|cosign verify'
```

**Confirm:** the first two recipes are findings on sight — read only to record
what the disabled verification was protecting. The third is the inverse check:
a download/install step that *lacks* any checksum or signature verification is
the same defect by omission — a CI job installing its security scanner over a
plain `curl | tar` is the canonical example.

**Trap:** local-development-only configs and test fixtures pointed at
self-signed loopback servers — `intended: true`, but confirm the flag cannot
reach a production code path.

## 14. Success status on a failure path

The server-side mirror of class 5: a handler catches an error and answers `200`
(or exit 0, or an `ok: true` envelope). Alerting is built on 5xx rate and
non-zero exits, so this is the purest "no signal a monitor could notice" shape
in the catalog.

```bash
rg -n -U --hidden -g '!.git/*' --pcre2 '(catch|except)[\s\S]{0,300}?(status\(200\)|statusCode:\s*200|HTTPStatus\.OK|WriteHeader\(200|ok:\s*true)'
rg -n --hidden -g '!.git/*' -i 'return\s*\{\s*statusCode:\s*200' -g '*.{js,ts,mjs,mts,py,go}'
```

**Confirm:** the response is emitted from an error branch, and no metric,
alarm, or dead-letter path fires alongside it. Lambda/queue/cron handlers are
the highest-value targets — a handler that catches and returns success means
the alarm the team believes covers it can never fire.

**Trap:** webhook receivers that must return 200 to stop the sender retrying,
while recording the failure elsewhere. That is correct design — but only when
the "elsewhere" exists; find it before clearing the hit.

## 15. Labeled intentional fail-open

Not a defect class — the classification bucket. Cross-reference hits from 1–14
against comment text, filename conventions (`hooks/`, `telemetry/`,
`*.hook.sh`), and test names.

```bash
rg -n -i --hidden -g '!.git/*' 'fail open|fail-open|best.effort|never block|non-blocking|advisory only|intentionally (ignore|swallow)'
```

Record with `intended: true` and the rationale quote. Revisit only when the
"best-effort" path is actually a security gate.

## Corroborating rule IDs (optional layer)

A hit that an established rule also flags gets higher confidence. Do not run
these as a gate — regex plus reading the code is the floor.

| Tool | Rule | Covers |
| --- | --- | --- |
| ESLint | `no-empty` (`allowEmptyCatch: false`), `no-empty-function` | JS/TS class 1 |
| typescript-eslint | `no-floating-promises`, `no-misused-promises` | JS/TS class 3 — the only reliable detector for a bare un-awaited call |
| Ruff | `S110` try-except-pass, `S112` try-except-continue | Python classes 1, 7 |
| CodeQL | `py/empty-except`, `cs/empty-catch-block` | class 1 |
| staticcheck | `SA9003` empty branch | Go class 1 |
| errcheck | unchecked returns, `-blank` for `_ =` | Go classes 1, 2 |
| ShellCheck | `SC2181`, `SC2015`, `check-set-e-suppressed` | class 4 |

No stock pack covers classes 2, 5, 7–12, or 14 across all four
languages — those need reading the code or a custom Semgrep taint rule
(source = failure value, sink = a decision point that assumes success). Class 3
is covered for TypeScript only, and only when the project already type-checks.
