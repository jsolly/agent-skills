# AI search surfaces (AI Overviews, AI Mode, ChatGPT, Perplexity)

What a *technical* SEO audit can verify and fix for AI answer surfaces, and the hype to refuse.
Evidence anchored mid-2026; re-verify if Google guidance or crawler behavior shifts.

## The model

Google's generative features (AI Overviews, AI Mode) run on the **core Search ranking/quality
stack** via RAG ("grounding") plus query fan-out, not a separate AI index. See Google's
[AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
and [AI features doc](https://developers.google.com/search/docs/appearance/ai-features).

Consequence: the **eligibility gate is the classic one**. A page must be indexed, crawlable,
publicly accessible, and **snippet-eligible**. There is no separate GEO/AEO/LLMO track (Illyes,
Jul 2025: “use normal SEO… You don't need GEO, LLMO…”).

**Eligibility ≠ selection.** Being eligible is necessary, not sufficient. This skill verifies and
fixes eligibility; it must **not promise citation or selection gains**.

## Operative technical levers (auditable, code-owned)

- **Indexability** — accidental `noindex` / robots disallow on public pages.
- **Snippet suppression** — `nosnippet`, `data-nosnippet`, `max-snippet:0` (meta or
  `X-Robots-Tag`). Indexed pages can still be barred from AI Overviews/AI Mode. Confirm intent
  before changing.
- **Third-party AI bots** — `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`,
  `PerplexityBot`, `Google-Extended` in robots/CDN. Often deliberate licensing; **surface, never
  auto-unblock.** `Google-Extended` ≠ Googlebot and does **not** gate AI Overviews.

## Debunked hype — never file / never recommend as a fix

Ground refusals in current evidence (mid-2026 anchors below), not vibes:

- **`llms.txt` / AI text files / AI-specific markup** — AI bots essentially never fetch it
  (~0.1% of 62k+ AI-bot visits in a 90-day log study, replicated elsewhere); Google will not use
  it. Absence is not a defect.
- **Schema added “for AI citations”** — controlled Ahrefs experiment (1,885 pages vs ~4k
  controls, mid-2026) found **no positive AI-citation uplift** on any platform; keep schema only
  for classic rich results.
- **Content chunking / “write for AI”** — out of technical scope.

## Claims this skill must NOT assert

- That Google rank position is *the* predictor of AI citation.
- That specific source-type stereotypes (Wikipedia/Reddit/etc.) *cause* citations.
- That Product/Review schema or `llms.txt` drive AI citations.

When asked about these, answer from the evidence above, stay concise, and decline to chase them.
After any authorized eligibility restore, state what can be re-checked (headers/index/snippet) and
what still cannot (selection/citation).
