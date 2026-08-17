---
name: bug-enhancement-report
description: >-
  Use when the user says `/bug-enhancement-report`, or asks to file / log /
  open a bug, defect, enhancement, or feature request with a tracker or vendor
  (including Cursor IDE/CLI/Cloud Agent/BugBot on forum.cursor.com). Search
  existing reports first; comment on a match instead of duplicating; otherwise
  file a new report only when it would add value, with exhaustive redacted
  repro evidence (environment, versions, logs, stacks, resource usage, uploads
  when the provider allows). NOT for diagnosing a local fix plan
  (`investigate`), draining or implementing your own issues (`janitor`),
  session handoff (`fyi`), or writing a deep-research prompt (`research`).
---

# Bug / Enhancement Report

**Outcome:** the given bug or enhancement is on the correct provider as either a
new item or a comment on an existing match — with evidence a maintainer who
never saw this session can act on — or an explicit abstain/blocked receipt.

This skill **files**. It does not diagnose-to-a-fix-plan (`investigate`) and it
does not implement or `/ship` a fix.

## Product gate (every `done` claim)

All required; miss any → `blocked`, not done:

1. **Provider** — live tracker identity (host + repo/project/forum), resolved
   from `references/providers.md`, not guessed. Vendor bugs go to the vendor;
   app-repo bugs go to that repo.
2. **Search** — an actual search ran (commands + what it returned). Skipped
   search ⇒ do not create.
3. **Action** — exactly one of `comment` | `create` | `abstain`, with a reason.
   A match exists → comment (or abstain if there is nothing new). Create only
   when a new item would add value.
4. **Evidence** — for `create` (and for `comment` when new signal exists),
   collect from `references/evidence.md`. Never invent versions, logs, or
   repro steps. List honest gaps instead.
5. **Redaction** — no secrets, tokens, cookies, private keys, or credential
   files in the body or uploads.
6. **Uploads** — when logs or screenshots would help, follow the
   `references/providers.md` upload ladder. Every successful upload has a
   URL in the receipt; otherwise say the file was **not** attached. Never
   claim an upload without a URL.
7. **Live URL** — `comment` and `create` include the item URL from the
   provider. A drafted body with no post is `blocked`, not done.

## Required reads

1. `references/providers.md` — resolve tracker, search, comment vs create,
   capability probe, upload ladder.
2. `references/evidence.md` — host/app/resource collection, redaction, body
   shape. Run `scripts/collect-host-evidence.sh` via
   `<path-to-this-skill>/scripts/collect-host-evidence.sh` from the
   reproducing CWD (not from the skill repo).
3. When the provider is Cursor (IDE, CLI, Cloud/Background Agent, BugBot, or
   the forum itself): `references/cursor-forum.md` — categories, search,
   template, Request ID / Share Data, vote vs clone, billing email.

Do not preload these references until the kind + subject are pinned.

## Loop

1. **Pin** — kind (`bug` | `enhancement`) and subject from the invoke args.
   One focused ask if either is empty or the tracker target is ambiguous.
2. **Resolve provider** — `references/providers.md`. Stop if unresolved.
3. **Search** — existing open items first, then recently closed. Follow
   duplicate pointers to the canonical item.
4. **Decide** — match → comment with *new* evidence only; distinct + valuable
   → create (link related items); question / user-error / no new signal →
   `abstain`.
5. **Collect** — if posting (`create` or a `comment` with new signal),
   collect per `references/evidence.md`. Honor the provider template
   (GitHub/GitLab issue templates; Cursor forum form in
   `references/cursor-forum.md`). Redact before any post. Skip collection
   on `abstain`.
6. **Post** — comment or create via MCP if the connected tool can do it,
   else the provider CLI or documented web/API (Cursor = Discourse).
   Upload valuable artifacts per the upload ladder.
7. **Receipt** — fields below. `done` only when the product gate holds.

## Don't

- File a vendor/product bug on the user's application repo, or the reverse
  (Cursor product bugs go to forum.cursor.com, not the current git remote)
- Create when a search hit already tracks the same symptom
- File Cursor billing/account issues on the forum (email `hi@cursor.com`)
- Invent OS/app versions, logs, stacks, or resource numbers
- Post secrets, `.env` contents, credential files, or unredacted auth headers
- Claim an attachment that was not uploaded
- Implement, commit, or `/ship` a fix under this skill
- Skip search because the user already "looked"

## Receipt

- **Kind** — `bug` | `enhancement`
- **Provider** — host + project/repo/forum
- **Search** — query + result summary (or `blocked` + why)
- **Action** — `comment` | `create` | `abstain`
- **Item** — live URL, or `none`
- **Attachments** — URLs, or `none` (and why)
- **Gaps** — evidence that could not be collected
- **Status** — `done` | `abstain` | `blocked` (+ reason)
