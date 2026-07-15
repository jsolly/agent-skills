#!/usr/bin/env node
// Runs directly on Node >=23.6 via native type stripping — erasable-syntax TypeScript, no build step.
import { readFile } from "node:fs/promises";
import { argv, exit, stderr, stdin, stdout } from "node:process";

const usage = `Usage: seo-triage.mts --input <json-file> [--input <json-file> ...]

Normalize SEO evidence into tiered findings.

Options:
  --input   JSON evidence file. May be repeated. Use "-" for stdin.
  --help    Show this help.
`;

type Tier = "P0" | "P1" | "P2" | "P3";

const tierRank: Record<Tier, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

interface ParsedArgs {
  help?: boolean;
  inputs: string[];
}

interface Finding {
  tier: Tier;
  source: string;
  url: string | null;
  issue: string;
  evidence: string | null;
  action: string;
}

// Evidence payloads are arbitrary external JSON (Ahrefs / GSC / Squirrel); typed as `any` at this
// boundary and narrowed into the typed `Finding` shape below.
type RawPayload = any;
type RawItem = any;

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { inputs: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--input") {
      const value = args[(index += 1)];
      if (value !== undefined) {
        parsed.inputs.push(value);
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function fail(message: string): never {
  stderr.write(`${message}\n`);
  exit(1);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(path: string): Promise<RawPayload> {
  const text = path === "-" ? await readStdin() : await readFile(path, "utf8");
  return JSON.parse(text);
}

function textOf(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function classifyIssue(issue: RawItem): Tier {
  const haystack = [
    issue.issue,
    issue.name,
    issue.title,
    issue.category,
    issue.issue_category,
    issue.importance,
    issue.coverageState,
    issue.evidence,
    issue.url,
  ]
    .map(textOf)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("redirect loop") || haystack.includes("blocked by robots") || haystack.includes("accidental noindex")) {
    return "P0";
  }
  if (haystack.includes("external")) {
    return "P3";
  }
  if (
    haystack.includes("canonical") ||
    haystack.includes("sitemap") ||
    haystack.includes("noindex") ||
    haystack.includes("4xx") ||
    haystack.includes("5xx") ||
    haystack.includes("broken")
  ) {
    return "P1";
  }
  if (haystack.includes("http to https") || haystack.includes("3xx redirect")) {
    return "P3";
  }
  if (haystack.includes("meta description") || haystack.includes("alt") || haystack.includes("social")) {
    return "P2";
  }
  return "P2";
}

function sourceOf(payload: RawPayload, item: RawItem): string {
  if (item.source) {
    return item.source;
  }
  if (payload.results?.[0]?.inspectionResult || item.inspectionResult) {
    return "gsc";
  }
  if (payload.issues || item.issue_id || item.importance) {
    return "ahrefs";
  }
  if (payload.squirrel || item.ruleId || item.rule_id) {
    return "squirrel";
  }
  return "unknown";
}

function extractItems(payload: RawPayload): RawItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.issues)) {
    return payload.issues;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  if (Array.isArray(payload.findings)) {
    return payload.findings;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [payload];
}

function normalizeUrl(item: RawItem): string | null {
  return item.url ?? item.page ?? item.inspectionUrl ?? item.target ?? item.finalUrl ?? null;
}

function normalizeFinding(payload: RawPayload, item: RawItem): Finding {
  const source = sourceOf(payload, item);
  const result = item.result?.inspectionResult?.indexStatusResult ?? item.inspectionResult?.indexStatusResult;
  const merged = result ? { ...item, coverageState: result.coverageState, robotsTxtState: result.robotsTxtState } : item;
  const tier: Tier = merged.tier ?? classifyIssue(merged);
  return {
    tier,
    source,
    url: normalizeUrl(merged),
    issue: merged.issue ?? merged.name ?? merged.title ?? merged.ruleId ?? merged.coverageState ?? "SEO finding",
    evidence: merged.evidence ?? merged.importance ?? merged.category ?? merged.status ?? merged.robotsTxtState ?? null,
    action: tier === "P3" ? "document" : tier === "P2" ? "schedule or batch" : "fix and verify",
  };
}

async function main(): Promise<void> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (args.help) {
    stdout.write(usage);
    return;
  }
  if (args.inputs.length === 0) {
    fail("Missing required --input");
  }

  const findings: Finding[] = [];
  for (const input of args.inputs) {
    const payload = await readJson(input);
    for (const item of extractItems(payload)) {
      findings.push(normalizeFinding(payload, item));
    }
  }

  findings.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.source.localeCompare(b.source));

  stdout.write(
    `${JSON.stringify(
      {
        count: findings.length,
        countsByTier: findings.reduce<Record<string, number>>((counts, finding) => {
          counts[finding.tier] = (counts[finding.tier] ?? 0) + 1;
          return counts;
        }, {}),
        findings,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
