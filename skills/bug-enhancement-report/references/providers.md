# Providers — resolve, search, post, upload

Load from the skill entry. Do not invent a tracker.

## Resolve (first match wins)

1. **User named it** — a URL, `owner/repo`, Linear/Jira project, or forum
   topic. Use that.
2. **Vendor vs repo** — if the subject is a third-party app, CLI, editor,
   cloud product, or SaaS, file with **that vendor's official tracker**
   (product docs → Support / GitHub org / forum / in-app feedback). Filing a
   Cursor, VS Code, GitHub-the-product, or similar bug on the user's
   application repo is a wrong-tracker failure.
3. **Current git remote** — if the subject is *this* codebase, use the CWD
   repo's issue tracker:
   - `github.com` / `github.example` → GitHub issues (`gh`)
   - `gitlab.com` / GitLab host → GitLab issues (`glab` or API)
   - otherwise follow the host's documented issues UI/API
4. **One focused ask** — if 1–3 still leave two plausible trackers.

Record the resolved identity as `host` + `project` (repo, team/project key,
or forum category). Unresolved → `blocked`, do not post.

Wrong-tracker check before every create: would a maintainer of *this*
project actually own the fix? If no, re-resolve.

## Capability probe (before posting)

Do not assume uploads, labels, or issue types.

1. If an MCP server matches the provider, inspect its tool schemas
   (search / comment / create / attach). Use those tools when they exist.
2. Else use the provider CLI and read its help (`gh issue --help`,
   `glab issue --help`, …).
3. Note: create, comment, attach, label, milestone, issue vs discussion.

No authenticated client and no MCP → prepare the full markdown body and
return `blocked` with that draft. Do not pretend a web form was submitted
unless you actually submitted it.

## Search (mandatory)

Extract distinctive strings: error message, stack top frames, component
name, symptom phrase. Search **open** first, then **closed** (last ~12
months is enough unless the user names an older ticket).

| Provider | Search |
| --- | --- |
| GitHub | `gh issue list --repo OWNER/REPO --state open --search '…'` then `--state closed`. Also `gh search issues --repo OWNER/REPO '…'` when the CLI is authenticated. |
| GitLab | `glab issue list --search '…' --state opened` then closed |
| Linear | MCP/API issue search on team + text; include canceled/completed |
| Jira | JQL `text ~ "…" AND project = KEY ORDER BY updated DESC` |
| Discourse / product forum | Search API or site search in the product category |
| Other | Documented search on that tracker; if none exists, say so in the receipt and do not create blindly |

Read the best hits. A **match** is the same symptom + same component, not
merely shared keywords. Follow `Duplicate of #N` to the canonical item.

### Decide

| Situation | Action |
| --- | --- |
| Open match | `comment` with *new* evidence only. Do not create. |
| Closed-as-fixed, still reproduces | `create` as a **regression**, linking the original — unless the tracker prefers a reopen/comment, in which case do that. |
| Closed duplicate / moved | Follow the pointer; treat the canonical item as the match. |
| Closed wontfix / not-a-bug | `abstain` unless the user has new evidence that changes the close reason; then comment, do not silently reopen a new clone. |
| Related but distinct | `create` and link `Related: URL`. |
| Question, user-error, or no new signal | `abstain` (answer in chat). |
| Search failed (auth/network) | `blocked` — do not create to "save time." |

**Value gate for create:** would a maintainer learn something they cannot
already see on an existing item? If not, comment or abstain.

## Post

Honor issue / request templates when the repo or project has them
(`.github/ISSUE_TEMPLATE`, GitLab templates, Linear templates). Fill every
required field; do not invent labels that do not exist (`gh label list`,
equivalent elsewhere).

Prefer MCP create/comment tools when they match. Otherwise:

```bash
# GitHub
gh issue create --repo OWNER/REPO --title '…' --body-file BODY.md
gh issue comment --repo OWNER/REPO NUMBER --body-file COMMENT.md

# GitLab
glab issue create --title '…' --description "$(cat BODY.md)"
glab issue note ISSUE --message "$(cat COMMENT.md)"
```

Capture the URL the tool prints. No URL ⇒ `blocked`.

Public trackers: after redaction, posting is in-scope for this skill (the
invoke *is* the file request). If likely secrets remain, stop and ask
rather than post.

## Upload ladder

Probe first, then take the **highest** rung that actually works. Valuable
artifacts: full text logs, crash **report** text (not core files),
screenshots of a UI bug. Skip empty files and anything that is only secrets.

Do **not** upload core dumps, heap snapshots, or raw profiles unless the
user explicitly asks. Those contain process memory; redaction cannot make
them safe. List them under Gaps instead.

1. **Native attach** — MCP upload/attach tool, or CLI attach if help shows
   it (`glab` uploads, Jira attachments, Linear attachments). Native attach
   stays on the destination item's ACL — prefer it.
2. **GitHub files** — `gh` has **no** first-party attach API. If a `gh`
   extension that uploads to `user-attachments` is **already installed**,
   use it. Do **not** install extensions just for this run. Otherwise:
   - **Private** GitHub items: inline a redacted `<details>` block when
     under the issue body size limit (65536 characters), or tell the user
     the file path to drop onto the issue in the browser. **Never gist
     private evidence** — `gh gist create --secret` is unlisted, not
     private: anyone with the URL can read it, outside the repo ACL.
   - **Public** GitHub items only: text logs may go to a secret gist
     (`gh gist create --secret …`) and be linked, or a `<details>` block.
   - screenshots/binaries with no attach path → say **not attached** and
     tell the user the file path to drop onto the issue in the browser
3. **GitLab** — project upload API / `glab` upload when documented (stays
   on the project). Else snippet only if the item is already public; else
   inline `<details>`.
4. **Linear / Jira** — attachment API when the connected tool exposes it;
   else inline what fits and report the rest as not attached.
5. **Forums** — composer upload if the session can; else report not
   attached. Do not gist private logs to attach to a public forum post.

Never commit logs into the application repo as a substitute for an
attachment. Never paste credential files. Every successful upload must
appear in the receipt as a URL.

## Auth and permissions

- Missing CLI / expired auth → exact login command (names of env vars, not
  values) + `blocked`.
- 403/404 on issues → `blocked` (may lack Issues permission or the tracker
  may use Discussions only — check before creating a discussion; that is a
  different genre unless the user asked for it).
- Rate limits → wait/retry once, then `blocked`.
