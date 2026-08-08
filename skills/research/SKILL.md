---
name: research
description: Use when the user says `/research`, asks for a deep-research prompt, mentions Perplexity Deep Research, or wants a copy/paste query for an external research tool instead of immediate analysis. NOT for performing the research or writing the final report in this session.
---

# Research Query Builder

Deliverable is **one paste-ready prompt** for an external deep-research tool — never findings or the markdown report from this session.

## Output

**Specific enough:** return exactly one fenced text block containing only the prompt. No preamble, postscript, "here's a prompt…", or unsolicited alternatives.

**Material gap** (objective/decision, geography/jurisdiction, timeframe, comparison set, audience) would change search quality → ask **one** concise clarifying question covering what is missing, then continue. Never a questionnaire; never invent domain scope.

If the user also wants a report, still honor prompt-builder first: return the prompt that should generate the report.

## What the prompt must encode

Make the downstream tool answer the **real question** (not a vague topic area). Prefer explicit constraints over filler; skip instructions the tool already knows.

Include what matters for this request:

1. Research objective / decision
2. Scope bounds
3. Geography / jurisdiction
4. Time range
5. Comparisons / alternatives
6. Preferred source types
7. Disagreements / open questions to surface
8. Desired markdown structure for the result

**Process defaults** (not domain defaults): primary sources first; secondary only to triangulate/fill gaps; links for major claims; separate facts vs forecasts; surface disagreement/uncertainty; sections such as executive summary, key findings, evidence, open questions, source list.

## Don't

- Do the research or write the report here
- Wrap the prompt in explanatory chatter
- Silently narrow a vague request
- Drift into analysis mode when `/research` / prompt-builder was the ask
- Ask multiple clarification questions at once
