# Cursor — official tracker is the forum

Canonical docs: [Reporting a bug](https://cursor.com/help/troubleshooting/reporting-bugs).
Forum: [forum.cursor.com](https://forum.cursor.com) (Discourse). Staff process:
[How we handle Bug Reports](https://forum.cursor.com/t/how-we-handle-bug-reports/150534).

The forum is **public**. Redact before every post or upload. Request IDs are
lookup keys, not secrets (Cursor's own wording) — include them.

Do **not** file Cursor product bugs on the user's application repo, on
`github.com/getcursor/cursor` (a leftover in-app "Report Issue" URL), or on
`microsoft/vscode` unless the defect reproduces in stock VS Code without
Cursor — then it is a VS Code bug; one focused ask if that is unclear.

## When this playbook applies

Subject is any of: Cursor IDE, Cursor CLI (`agent`), Cloud / Background Agent
(GitHub, Slack, Web, Linear), BugBot, or forum.cursor.com itself.

| Kind | Where | Category | Discourse id |
| --- | --- | --- | --- |
| Bug | Support → Bug Reports | [bug-report](https://forum.cursor.com/c/support/bug-report/6) | `6` |
| Enhancement | Ideas → Feature Requests | [feature-requests](https://forum.cursor.com/c/ideas/feature-requests/5) | `5` |
| Unsure if a bug (stuck / how-to) | Support → Help | [help](https://forum.cursor.com/c/support/help/8) | `8` |
| Opinion of existing behavior, not a request | Ideas → Feedback | [feedback](https://forum.cursor.com/c/ideas/feedback/7) | `7` |
| Forum software / this Discourse site | Meta | [meta](https://forum.cursor.com/c/meta) | `16` |
| Billing, subscription, account access | **Not the forum** | email `hi@cursor.com` | (`17` says so; staff unlist forum billing threads) |

Composer (logged-in browser):

- Bug: [new-topic bug-report](https://forum.cursor.com/new-topic?category=support/bug-report)
- Feature request: [new-topic feature-requests](https://forum.cursor.com/new-topic?category=ideas/feature-requests)
- Help: [new-topic help](https://forum.cursor.com/new-topic?category=support/help)

## Search (mandatory, anonymous works)

Distinctive strings: error text, stack top, Request ID is *not* a search key
(internal only), product surface (IDE vs CLI vs Cloud Agent), symptom phrase.

```bash
curl -sS -G 'https://forum.cursor.com/search.json' \
  --data-urlencode 'q=SYMPTOM #bug-report'

curl -sS -G 'https://forum.cursor.com/search.json' \
  --data-urlencode 'q=SYMPTOM #feature-requests'
```

Read the best hits. Topic JSON (title, posts, category):

`https://forum.cursor.com/t/{slug}/{id}.json`

Search **open** (recent activity) first, then older / closed. Follow duplicate
pointers and staff "this is the same as …" links to the canonical topic.

## Decide (Cursor-specific)

Staff read Bug Reports, try to reproduce, and file internally. The composer
**template is mandatory** — a free-form "Cursor is broken" post gets a staff
nag to fill it. Bug Reports (`6`) and Feature Requests (`5`) use Discourse
**form templates** (`form_template_ids` 1 and 2): the logged-in composer is
a structured form, not a single markdown box. Category 5 **votes**
(`can_vote`); the default sort is votes. Shared-issue / **Me too** is
**off** on Bug Reports — do not tell the user to click it.

Colin (staff): extra reports with *your* OS / config / repro help them gauge
severity. That is **new evidence on a match**, not a license to clone.

| Situation | Action |
| --- | --- |
| Open Bug Reports topic, same symptom **and** same product surface | `comment` with the environment / Request ID / impact block below. Do **not** open a second topic that restates the same report. |
| Same symptom, **different** surface or a distinct repro (IDE vs CLI, only Linux, only Cloud Agent, …) | `create` in Bug Reports; first line `Related: <url>`. |
| Canonical topic locked / closed-as-fixed, still reproduces | `create` as a regression, linking the original (generic table). |
| Open Feature Requests match | **Vote** in the UI if a session exists + `comment` with extra rationale / environment. Do **not** clone. |
| Distinct, valuable enhancement | `create` in Feature Requests using the FR template. |
| User is stuck; not clearly a defect | Help (`8`), or `abstain` and answer in chat. Do not file a template-less Bug Report. |
| Billing / invoices / plan / login-to-pay | `abstain`. Tell the user to email `hi@cursor.com`. Do not draft a forum post. |
| In-app leftover GitHub issue URL | Ignore. Stay on the forum. |

Value gate still applies: a maintainer must learn something they cannot
already see. A filled environment + a **new Request ID** is new signal.

## Auth and post

Anonymous `can_create_topic` is false. Search does not require login; **create
and reply do**.

Probe: if `grouped_search_result.can_create_topic` is false and you have no
browser session / API key, you cannot post.

1. **Browser, user already logged in** (Cursor SSO) — open the composer URL.
   Fill **each visible form field** from the playbook map below (Where /
   Describe / Steps / Expected / OS / Version / Request ID / Impact, or FR
   product + describe). Do **not** paste one markdown blob into the first
   box and submit — that leaves required form fields empty. Attach
   screenshots via the composer uploader. Capture the resulting `/t/…` URL.
   The markdown bodies below are for the API `raw` path and for a
   `blocked` draft the user can copy field-by-field.
2. **Discourse API**, only if the user already has a key (never mint one in
   this skill). Env **names** only: `DISCOURSE_API_KEY`, `DISCOURSE_API_USERNAME`.

   ```bash
   # create: category 6 bugs, 5 feature requests, 8 Help
   curl -sS -X POST 'https://forum.cursor.com/posts.json' \
     -H "Api-Key: $DISCOURSE_API_KEY" \
     -H "Api-Username: $DISCOURSE_API_USERNAME" \
     -H 'Content-Type: application/json' \
     --data-binary @body.json
   ```

   Create JSON: `title`, `raw`, `category` (`6`, `5`, or `8` for Help).
   Reply JSON: `topic_id`, `raw` (no title).
   Response `id` is the **post** id — do not put it in the topic path.
   Require `topic_slug` + `topic_id` and use
   `https://forum.cursor.com/t/{topic_slug}/{topic_id}` (or
   `/t/-/{topic_id}`). No topic URL ⇒ `blocked`.

3. **Otherwise** — `blocked` with the filled markdown + the matching
   `new-topic` URL. Do not claim the forum received it.

Do not gist private logs onto this public forum (upload ladder in
`references/providers.md`).

## Uploads

Composer accepts `.jpg` `.png` `.gif` `.mp4` `.mov` (staff template). Prefer
native composer / `POST /uploads.json` (`type=composer`) then embed the
returned URL in `raw`.

**Not** for the public forum: core dumps, heap snapshots, raw profiles,
`Developer: Export Logs…` zips (workspace paths, tokens). Never upload the
zip to forum.cursor.com, even if the user asks in the same turn. Paste a
redacted console excerpt instead; keep the zip local / out-of-band. List it
under Gaps as **not attached**.

## Evidence Cursor staff actually use

Collector from the reproducing CWD — **never** `--include-git`. The helper
already records `cursor --version` and `agent --version` in Toolchain when
those CLIs exist — do **not** also `--probe` them.

```bash
bash <path-to-this-skill>/scripts/collect-host-evidence.sh
```

Never `--probe 'agent about'` — it prints `User Email`.

### Versions

- **IDE (preferred):** macOS **Cursor → About Cursor → Copy**; Windows/Linux
  **Help → About**. Paste the block (`Version`, `VSCode Version`, `Commit`).
- **IDE fallback:** `cursor --version` (version, commit, arch). If About was
  not copied, write `VSCode Version: unknown — About Cursor copy unavailable`.
  Do not dump `product.json` (it contains unrelated client keys).
- **CLI:** `agent --version` only. Never `agent about`.

### Request ID (AI / agent issues)

Cursor docs: Request IDs are backend lookup keys, not confidential. **Do**
put them in the post. **Do not** invent one.

- Chat / Agent (IDE): conversation **`...` → Copy Request ID** (also on the
  response **`...`** menu — [agent issues](https://cursor.com/help/troubleshooting/agent-issues)).
- Cloud / Background Agent: `bc-…` id **and** Copy Request ID on
  [cursor.com/agents](https://cursor.com/agents).
- Missing ID → `unknown — <where you looked>`, not a plausible UUID.

Privacy Mode is **per-request**. Switching to Share Data later does **not**
expose an earlier request. For **unexpected agent behavior**:

1. Ask the user to temporarily enable **Share Data**.
2. Reproduce.
3. Copy the **new** Request ID.
4. Restore Privacy Mode if they want.
5. Say in the post that the ID was captured with Share Data on.

Connectivity / "can't reach Cursor" bugs often do not need Share Data.

### Console and logs

- **Help → Toggle Developer Tools** — console errors for UI/workbench bugs.
- Extension-host timeouts / "Agent Execution Timed Out": Command Palette
  **Developer: Export Logs…** (Main, Window, Extension Host) plus Output →
  Extension Host (empty panel is itself a signal). Never upload that zip to
  the public forum. Paste a redacted console excerpt; keep the zip local.

### Impact (required by the bug form)

Exactly one: unusable / sometimes / works with this issue.

## Bug report body (fill every heading)

```markdown
### Where does the bug appear (feature/product)?
- [ ] Cursor IDE
- [ ] Cursor CLI
- [ ] Background Agent (GitHub, Slack, Web, Linear)
- [ ] BugBot
- [ ] Somewhere else: …

### Describe the Bug
…

### Steps to Reproduce
1.
2.
3.

### Expected Behavior
…

### Screenshots / Screen Recordings
attached | not attached
(do not put a local filesystem path in the public post; keep the path in
the receipt / chat with the user)

### Operating System
Windows 10/11 | macOS | Linux  (+ version/arch from the collector)

### Version Information
IDE: (About Cursor copy, or cursor --version + VSCode Version gap)
CLI: (agent --version)

### For AI issues: which model did you use?
…

### For AI issues: add Request ID with privacy disabled
Request ID: …
Background Agent id: bc-… (if applicable)
Share Data on for this ID: yes/no

### Additional Information
Related: <forum urls>
Collector snapshot in a details block (redacted).

### Does this stop you from using Cursor?
- [ ] Yes - Cursor is unusable
- [ ] Sometimes - I can sometimes use Cursor
- [ ] No - Cursor works, but with this issue
```

## Feature request body

```markdown
### Feature request for product/service
Cursor IDE | Cursor CLI | Background Agent | BugBot | Billing UI | other

### Describe the request
Current behavior, proposed behavior, who it hurts.
Why existing Feature Requests (link them) do not already cover this.
```

Environment only if the request is platform-specific. Do not dump logs.

## Receipt extras (in addition to the skill receipt)

- Forum category + topic URL
- Whether the post used the template (yes/no — no ⇒ not done)
- Request ID included or explicit gap
- Vote (feature requests): done in UI, asked the user, or n/a
