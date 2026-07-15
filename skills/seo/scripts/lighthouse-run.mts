#!/usr/bin/env node
// Runs directly on Node >=23.6 via native type stripping — erasable-syntax TypeScript, no build step.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";

const usage = `Usage: lighthouse-run.mts <url> [options]

Run Google Lighthouse N times against ONE url (local dev server or production),
median the four category scores, and emit an aggregated, machine-readable summary.
Same command handles localhost and prod — Lighthouse just takes the URL.

Scores are inherently variable run-to-run (Performance most of all: lab-simulated
and throttled). A single run is not a signal — this script medians >=3 runs so the
skill compares medians, never a lone score. Do not chase Performance to 100.

Options:
  --runs N            Lighthouse runs to median (default 3; use 5 for stabler perf).
  --categories LIST   Comma-separated Lighthouse categories
                      (default: performance,accessibility,best-practices,seo).
  --preset NAME       "mobile" (Lighthouse default) or "desktop" (default: mobile).
  --output-dir DIR    Save each full Lighthouse JSON report here (optional).
  --lighthouse-bin P  Path to a lighthouse binary; overrides autodetect.
  --help              Show this help.

Resolution: a "lighthouse" on PATH is used if present (respects a pinned global/local
install); otherwise falls back to "npx -y lighthouse". Requires Google Chrome installed.

Output: aggregated JSON to stdout; progress/diagnostics to stderr.`;

const DEFAULT_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

type Preset = "mobile" | "desktop";

interface ParsedArgs {
  url?: string;
  runs: number;
  categories: string[];
  preset: Preset;
  outputDir?: string;
  lighthouseBin?: string;
  help?: boolean;
}

interface AuditRef {
  id: string;
  weight?: number;
}

interface Audit {
  title: string;
  score: number | null;
  displayValue?: string;
}

interface Category {
  score?: number;
  auditRefs?: AuditRef[];
}

interface LighthouseReport {
  categories?: Record<string, Category>;
  audits?: Record<string, Audit>;
  runtimeError?: { code: string; message: string };
  fetchTime?: string;
  lighthouseVersion?: string;
  _path?: string;
}

interface FailingAudit {
  category: string;
  id: string;
  title: string;
  score: number;
  displayValue: string | null;
  weight: number;
}

interface CategorySummary {
  median: number | null;
  min: number | null;
  max: number | null;
  runs: number[];
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { runs: 3, categories: DEFAULT_CATEGORIES, preset: "mobile" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--runs") {
      parsed.runs = Number.parseInt(args[(index += 1)] ?? "", 10);
    } else if (arg === "--categories") {
      parsed.categories = (args[(index += 1)] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    } else if (arg === "--preset") {
      parsed.preset = (args[(index += 1)] ?? "") as Preset;
    } else if (arg === "--output-dir") {
      parsed.outputDir = args[(index += 1)];
    } else if (arg === "--lighthouse-bin") {
      parsed.lighthouseBin = args[(index += 1)];
    } else if (arg !== undefined && !arg.startsWith("-") && !parsed.url) {
      parsed.url = arg;
    } else {
      throw new Error(`Unknown or misplaced argument: ${arg}`);
    }
  }
  return parsed;
}

function fail(message: string): never {
  stderr.write(`${message}\n`);
  exit(1);
}

function note(message: string): void {
  stderr.write(`${message}\n`);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function resolveInvocation(override?: string): string[] {
  if (override) {
    return [override];
  }
  try {
    execFileSync("lighthouse", ["--version"], { stdio: "ignore" });
    return ["lighthouse"];
  } catch {
    note("• no `lighthouse` on PATH — falling back to `npx -y lighthouse`");
    return ["npx", "-y", "lighthouse"];
  }
}

function runLighthouse(invocation: string[], url: string, categories: string[], preset: Preset): LighthouseReport {
  const [command, ...base] = invocation;
  const args = [
    ...base,
    url,
    "--output=json",
    "--output-path=stdout",
    "--quiet",
    "--chrome-flags=--headless=new",
    `--only-categories=${categories.join(",")}`,
  ];
  if (preset === "desktop") {
    args.push("--preset=desktop");
  }
  // Lighthouse JSON reports run large; give it room.
  const raw = execFileSync(command!, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(raw) as LighthouseReport;
}

function collectFailingAudits(report: LighthouseReport, categories: string[]): FailingAudit[] {
  const failing: FailingAudit[] = [];
  const seen = new Set<string>();
  for (const category of categories) {
    const cat = report.categories?.[category];
    if (!cat?.auditRefs) {
      continue;
    }
    for (const ref of cat.auditRefs) {
      const audit = report.audits?.[ref.id];
      if (!audit || audit.score === null || audit.score >= 1) {
        continue;
      }
      const key = `${category}:${ref.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      failing.push({
        category,
        id: ref.id,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue ?? null,
        weight: ref.weight ?? 0,
      });
    }
  }
  // Heaviest, lowest-scoring first — that ordering is the fix priority.
  failing.sort((a, b) => b.weight - a.weight || a.score - b.score);
  return failing;
}

async function main(): Promise<void> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (args.help) {
    stdout.write(`${usage}\n`);
    return;
  }
  if (!args.url) {
    fail("Missing required <url> argument. See --help.");
  }
  if (!Number.isInteger(args.runs) || args.runs < 1) {
    fail("--runs must be a positive integer.");
  }
  if (args.preset !== "mobile" && args.preset !== "desktop") {
    fail(`--preset must be "mobile" or "desktop", got: ${args.preset}`);
  }
  if (args.outputDir) {
    mkdirSync(args.outputDir, { recursive: true });
  }

  const invocation = resolveInvocation(args.lighthouseBin);
  note(`• lighthouse: ${invocation.join(" ")} — ${args.runs} run(s), ${args.preset}, ${args.url}`);

  const reports: LighthouseReport[] = [];
  const perfPairs: { report: LighthouseReport; perf: number }[] = [];
  const scoresByCategory = new Map<string, number[]>(args.categories.map((category) => [category, []]));

  for (let run = 1; run <= args.runs; run += 1) {
    note(`• run ${run}/${args.runs} ...`);
    let report: LighthouseReport;
    try {
      report = runLighthouse(invocation, args.url, args.categories, args.preset);
    } catch (error) {
      fail(`Lighthouse run ${run} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (report.runtimeError) {
      fail(`Lighthouse run ${run} runtimeError (${report.runtimeError.code}): ${report.runtimeError.message}`);
    }
    for (const category of args.categories) {
      const score = report.categories?.[category]?.score;
      if (typeof score === "number") {
        scoresByCategory.get(category)?.push(Math.round(score * 100));
      }
    }
    const perfScore = report.categories?.performance?.score;
    if (typeof perfScore === "number") {
      perfPairs.push({ report, perf: Math.round(perfScore * 100) });
    }
    if (args.outputDir) {
      const path = `${args.outputDir}/lighthouse-run-${run}.json`;
      writeFileSync(path, JSON.stringify(report));
      report._path = path;
    }
    reports.push(report);
  }

  const categories: Record<string, CategorySummary> = {};
  for (const category of args.categories) {
    const runs = scoresByCategory.get(category) ?? [];
    categories[category] = runs.length
      ? { median: median(runs), min: Math.min(...runs), max: Math.max(...runs), runs }
      : { median: null, min: null, max: null, runs: [] };
  }

  // Extract failing audits from the run whose performance score is closest to the median,
  // so the actionable list reflects a representative (not best/worst) run. Select by closeness
  // rather than exact match: an even run count medians to an average no single run has, and a run
  // with a missing performance score never enters perfPairs — both would break an indexOf lookup.
  let representative: LighthouseReport = reports[reports.length - 1]!;
  if (perfPairs.length) {
    const target = median(perfPairs.map((pair) => pair.perf));
    representative = perfPairs.reduce((best, pair) =>
      Math.abs(pair.perf - target) < Math.abs(best.perf - target) ? pair : best,
    ).report;
  }

  stdout.write(
    `${JSON.stringify(
      {
        url: args.url,
        preset: args.preset,
        runs: args.runs,
        fetchedAt: representative.fetchTime ?? null,
        lighthouseVersion: representative.lighthouseVersion ?? null,
        categories,
        failingAudits: collectFailingAudits(representative, args.categories),
        reportPaths: reports.map((report) => report._path).filter(Boolean),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
