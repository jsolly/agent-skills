# AI search surfaces (AI Overviews, AI Mode, ChatGPT, Perplexity)

What a *technical* SEO audit can verify and fix for AI answer surfaces, and the hype to refuse. Evidence anchored mid-2026; re-verify if Google guidance or crawler behavior shifts.

## The model

Google's generative features (AI Overviews, AI Mode) run on the **core Search ranking/quality stack** via RAG ("grounding") plus query fan-out (multiple concurrent subtopic searches), not a separate AI index. See Google's [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and [AI features doc](https://developers.google.com/search/docs/appearance/ai-features).

Consequence: the **eligibility gate is the classic one**. A page must be indexed, crawlable, publicly accessible, and **snippet-eligible**, with no additional technical requirements. AI eligibility is therefore a subset of the fundamentals this skill already audits — there is no separate "GEO/AEO/LLMO" track. Gary Illyes (Google, July 2025): "use normal SEO practices. You don't need GEO, LLMO or anything else."

**Eligibility ≠ selection.** Being eligible is necessary, not sufficient. Which eligible pages actually get *cited* is an unsolved, fast-moving problem — top-10-ranking overlap with AI citations reportedly fell from ~75% (2024) to ~17% (early 2026). This skill can verify and fix eligibility; it must **not promise citation gains**.

## Operative technical levers (auditable, code-owned)

The things that actually gate AI-surface eligibility and live in the codebase/config:

- **Indexability** — `noindex` or a `robots.txt` disallow on an important public page disqualifies it entirely (already core triage).
- **Snippet suppression** — `nosnippet`, `data-nosnippet`, or `max-snippet:0` (meta robots or `X-Robots-Tag`). A page can be indexed yet barred from AI Overviews/AI Mode because it is not snippet-eligible. Confirm the suppression is intentional before flagging.
- **Crawl access for non-Google AI bots** — robots.txt rules for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. Blocking them is often a deliberate content-protection choice; surface it and confirm intent — never auto-"unblock." (`Google-Extended` governs Gemini/Vertex grounding and training, not Googlebot indexing, so it does **not** gate AI Overviews eligibility.)

## Debunked hype — never file as a finding or recommend as a fix

Each is backed by independent empirical work, not just Google's word:

- **`llms.txt`, AI text files, AI-specific markup/Markdown.** AI bots essentially never fetch `llms.txt` (~0.1% of 62k+ AI-bot visits in a 90-day log study, replicated by others), no major provider consumes it at scale, and Google has said on record it does not and will not use it (Illyes; Mueller likened it to the deprecated meta-keywords tag). A near-zero-cost optional bet at most — never a priority fix, and absence is not a defect.
- **Structured data / schema added *for AI citations*.** A controlled Ahrefs experiment (1,885 pages adding JSON-LD vs ~4k matched controls, difference-in-differences, mid-2026) found **no positive AI-citation uplift on any platform** (AI Mode +2.4%, ChatGPT +2.2% = noise; AI Overviews −4.6%). A cross-platform SSRN study found schema presence null after controlling for confounders. Keep schema **only** for classic rich-result eligibility; never recommend adding or expanding it as an AI-citation play. (Caveat: both studies sampled pages with existing citations, so whether schema helps a page *enter* the set is untested — but that is not grounds to recommend it.)
- **Content chunking / writing "for AI."** Not required (Google), and out of this skill's technical scope regardless.

## Per-engine reality

AI visibility is a multi-engine problem: ChatGPT and Perplexity overlap on only ~11% of cited domains; Google AI Overviews vs AI Mode cite identical URLs only ~13.7% of the time. For a *technical* audit the through-line is unchanged — classic crawl/index/snippet fundamentals are the shared prerequisite for every engine. Per-engine *selection* tactics are content/authority strategy, out of scope here.

## Claims this skill must NOT assert (refuted mid-2026)

- That Google rank position is *the* predictor of AI citation.
- That specific source types dominate per engine (e.g., "ChatGPT favors Wikipedia, Perplexity favors Reddit").
- That populated Product/Review schema wins more citations.
- That schema or `llms.txt` drive AI citations.

When asked about these, answer from the evidence above and decline to chase them.
