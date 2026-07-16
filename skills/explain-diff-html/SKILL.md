---
name: explain-diff-html
description: >-
  Use when the user says `/explain-diff-html`, or asks for a rich HTML explanation
  of a code change, diff, branch, or PR — a self-contained interactive page with
  background, intuition, code walkthrough, and a quiz. NOT for plain markdown
  reviews, short chat summaries, shipping/merging the change, or non-diff topics.
---

# Explain Diff (HTML)

Produce a rich, interactive explanation of the specified code change as a single
self-contained HTML file.

## Attribution

Adapted from [Geoffrey Litt](https://www.geoffreylitt.com)'s
[`explain-diff-html`](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)
skill. Preserve the section model and output contract below; house-style frontmatter
and trigger wording are the only intentional deltas.

## Sections

Build these sections, in order:

- **Background:** Explain the existing system relevant to this change. Broadly
  explore surrounding code. Include a deep background for beginners (note that it
  can be skipped if the reader is already familiar), then a narrower background
  directly relevant to the change.
- **Intuition:** Explain the core intuition for the code change — essence, not
  full details. Use concrete examples with toy data. Use figures and diagrams
  liberally.
- **Code:** High-level walkthrough of the changes. Group/order them in an
  understandable way.
- **Quiz:** Five medium-difficulty multiple-choice questions that test substance
  (not gotchas). Clicking an answer must show correct/incorrect feedback.

## Format

- Output a **single self-contained HTML file** (inline CSS + JavaScript). One long
  page with section headers and a table of contents — no tabs for top-level
  structure. Basic responsive styling for phone viewing.
- Write the file to the **system temp directory** (e.g. `/tmp` on macOS/Linux),
  never inside a code repo. Filename must always start with today's date in
  `YYYY-MM-DD-` form and follow
  `YYYY-MM-DD-explanation-<slug>.html`, where `<slug>` is basename-safe
  (alphanumeric and hyphens only). Example:
  `/tmp/2026-01-12-explanation-auth-refactor.html`.
- Write with the clarity and flow of Martin Kleppmann — engaging, classic style,
  smooth transitions between sections.
- Prefer a small number of reusable diagram families (e.g. simplified UI mocks,
  system/data-flow diagrams with example data). No ASCII diagrams — use simple
  HTML for diagrams and HTML lists for lists.
- For code blocks, always use `<pre>` tags. If you use a custom styled `div`
  instead, it **must** have `white-space: pre-wrap` in its CSS. Before saving,
  scan each code block and confirm its CSS includes `white-space: pre` or
  `pre-wrap`.
- **HTML-escape** all dynamic text from the diff, titles, paths, and quotes
  (`&`, `<`, `>`, `"`, `'`) before embedding it. Never paste raw repo strings into
  markup or feed them to `innerHTML` / `document.write`; use `textContent` or
  escaped templates for quiz UI.
- **Redact secrets** (API keys, tokens, `.env` values, credentials) in displayed
  code and prose — replace with `[REDACTED]` and note the redaction. Do not copy
  secret-bearing files verbatim into the HTML.
- Use callouts for key concepts, definitions, and important edge cases.

## Workflow

1. Resolve the change the user named: PR → `gh pr diff <n>`; branch →
   `git diff origin/main...HEAD` (or the named base); paths → `git diff -- <paths>`;
   no target → staged + unstaged (`git diff` and `git diff --cached`), or ask once
   if both are empty. Explore surrounding code enough for Background + Intuition.
2. Draft the four sections; keep diagrams consistent across the page.
3. Write the HTML file under the system temp dir with today's
   `YYYY-MM-DD-explanation-<slug>.html` name. Confirm TOC links, quiz click
   handlers, code-block whitespace, escaping, and redaction before saving.
4. Open it for the user when practical (quoted path, e.g. `open -- '/tmp/…'` on
   macOS), and report the absolute path.
