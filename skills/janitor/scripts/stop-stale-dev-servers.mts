#!/usr/bin/env node
// Runs directly on Node >=23.6 via native type stripping — erasable-syntax TypeScript, no build step.
// Janitor local-cleanup: stop leftover fleet-cwd loopback dev servers. Kill is mechanical;
// classification is the safety boundary (allowlist + loopback + cwd roots + deny list).
import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TERM_TIMEOUT_MS = 2_000;
const KILL_TIMEOUT_MS = 2_000;
const POLL_MS = 50;
const LSOF_MAX_BUFFER = 10 * 1024 * 1024;

type ReportStatus = "STOPPED" | "WOULD_STOP" | "SKIP" | "ERROR";
type SkipReason = "self" | "not-loopback" | "denied" | "not-dev-server" | "cwd-outside-roots";

interface CliOptions {
  dryRun: boolean;
  fixturePath?: string;
  roots: string[];
  extraSelfPids: number[];
}

interface ListenerProcess {
  pid: number;
  command: string;
  cwd: string;
  addrs: string[];
}

interface ReportRow {
  status: ReportStatus;
  pid?: number;
  command?: string;
  cwd?: string;
  addrs?: string[];
  reason?: string;
}

interface ExecFileFailure extends Error {
  code?: string | number;
  status?: number;
  stdout?: string;
  stderr?: string;
}

interface KillFailure extends Error {
  code?: string;
}

const LOOPBACK_HOSTS = new Set(["*", "0.0.0.0", "::", "localhost", "127.0.0.1", "::1"]);
const DENIED_BINARIES = new Set([
  "postgres",
  "postgresql",
  "redis-server",
  "mysqld",
  "mariadbd",
  "mongod",
  "sshd",
  "dockerd",
  "containerd",
  "podman",
  "orbstack",
]);

function usage(): never {
  throw new Error(
    "Usage: stop-stale-dev-servers.mts [--dry-run] [--fixture <json>] [--roots <dir,dir>] [--self-pid <pid> ...]",
  );
}

function parsePositiveInt(raw: string | undefined, flag: string): number {
  if (raw === undefined) {
    throw new Error(`${flag} requires a pid`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative integer, received ${raw}`);
  }
  return value;
}

function parseArgs(args: readonly string[]): CliOptions {
  const extraSelfPids: number[] = [];
  let dryRun = false;
  let fixturePath: string | undefined;
  let rootsArg: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      usage();
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--fixture") {
      fixturePath = args[(index += 1)];
      if (fixturePath === undefined) {
        throw new Error("--fixture requires a path");
      }
    } else if (arg === "--roots") {
      rootsArg = args[(index += 1)];
      if (rootsArg === undefined) {
        throw new Error("--roots requires a comma-separated directory list");
      }
    } else if (arg === "--self-pid") {
      extraSelfPids.push(parsePositiveInt(args[(index += 1)], "--self-pid"));
    } else {
      throw new Error(`Unknown argument: ${arg ?? ""}`);
    }
  }
  const home = homedir();
  const roots =
    rootsArg === undefined
      ? [path.join(home, "code"), path.join(home, ".cursor", "worktrees")]
      : rootsArg
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry !== "");
  if (roots.length === 0) {
    throw new Error("--roots must list at least one directory");
  }
  return { dryRun: dryRun || fixturePath !== undefined, fixturePath, roots, extraSelfPids };
}

function listenHost(addr: string): string {
  if (addr.startsWith("[")) {
    const end = addr.indexOf("]");
    return end === -1 ? addr : addr.slice(1, end);
  }
  const colon = addr.lastIndexOf(":");
  return colon === -1 ? addr : addr.slice(0, colon);
}

function isLoopbackListen(addr: string): boolean {
  const host = listenHost(addr);
  if (LOOPBACK_HOSTS.has(host) || host === "::ffff:127.0.0.1") {
    return true;
  }
  return /^127(?:\.\d{1,3}){3}$/.test(host);
}

function argvBasenames(command: string): string[] {
  return command
    .trim()
    .split(/\s+/)
    .map((token) => path.basename(token).replace(/\.exe$/i, "").toLowerCase());
}

function isDeniedCommand(command: string): boolean {
  if (/Cursor\.app/i.test(command) || /\bCursor Helper\b/i.test(command)) {
    return true;
  }
  return argvBasenames(command).some(
    (name) => DENIED_BINARIES.has(name) || name.startsWith("com.docker"),
  );
}

function isDeniedCwd(cwd: string): boolean {
  return /Cursor\.app/i.test(cwd);
}

function isDevServerCommand(command: string): boolean {
  if (/\bvitest\b/.test(command) || /\bvite-node\b/.test(command)) {
    return false;
  }
  if (/\b(?:npx|npm|pnpm|yarn|bun)(?:\s+exec)?(?:\s+run)?\s+dev\b/.test(command)) {
    return true;
  }
  if (/\bsam(?:\.cmd)?\s+local\b/.test(command)) {
    return true;
  }
  if (/\bwrangler(?:\.js)?(?:\s+pages)?\s+dev\b/.test(command)) {
    return true;
  }
  if (/\bnext-server\b/.test(command) || /node_modules\/next\//.test(command)) {
    return true;
  }
  if (/(?:^|[\/\s])(?:\.bin\/)?next(?:\.js)?(?:\s|$)/.test(command)) {
    return true;
  }
  if (/(?:^|[\/\s])(?:\.bin\/)?astro(?:\.js)?(?:\s|$)/.test(command) || /node_modules\/astro\//.test(command)) {
    return true;
  }
  return (
    /(?:^|[\/\s])(?:\.bin\/)?vite(?:\.js)?(?:\s|$)/.test(command) || /node_modules\/vite\//.test(command)
  );
}

async function resolvePath(target: string): Promise<string> {
  try {
    return await realpath(target);
  } catch {
    return path.resolve(target);
  }
}

async function isUnderRoots(cwd: string, roots: readonly string[]): Promise<boolean> {
  const resolvedCwd = await resolvePath(cwd);
  for (const root of roots) {
    const resolvedRoot = await resolvePath(root);
    if (resolvedCwd === resolvedRoot || resolvedCwd.startsWith(`${resolvedRoot}${path.sep}`)) {
      return true;
    }
  }
  return false;
}

async function decide(
  proc: ListenerProcess,
  roots: readonly string[],
  selfPids: ReadonlySet<number>,
): Promise<{ action: "stop" } | { action: "skip"; reason: SkipReason }> {
  if (selfPids.has(proc.pid) || proc.pid <= 1) {
    return { action: "skip", reason: "self" };
  }
  if (!proc.addrs.some((addr) => isLoopbackListen(addr))) {
    return { action: "skip", reason: "not-loopback" };
  }
  if (isDeniedCommand(proc.command) || isDeniedCwd(proc.cwd)) {
    return { action: "skip", reason: "denied" };
  }
  if (!isDevServerCommand(proc.command)) {
    return { action: "skip", reason: "not-dev-server" };
  }
  if (!(await isUnderRoots(proc.cwd, roots))) {
    return { action: "skip", reason: "cwd-outside-roots" };
  }
  return { action: "stop" };
}

function parseLsofListenLine(line: string): { pid: number; addr: string } | undefined {
  if (!line.includes("(LISTEN)")) {
    return undefined;
  }
  const parts = line.trim().split(/\s+/);
  const pidRaw = parts[1];
  const tcpIndex = parts.indexOf("TCP");
  const addr = tcpIndex >= 0 ? parts[tcpIndex + 1] : undefined;
  const pid = Number(pidRaw);
  if (!Number.isSafeInteger(pid) || pid <= 0 || addr === undefined || addr === "") {
    return undefined;
  }
  return { pid, addr };
}

function isExecFileFailure(error: unknown): error is ExecFileFailure {
  return error instanceof Error;
}

async function lsofListenOutput(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], {
      encoding: "utf8",
      maxBuffer: LSOF_MAX_BUFFER,
    });
    return stdout;
  } catch (error) {
    if (!isExecFileFailure(error)) {
      throw error;
    }
    if (error.code === "ENOENT") {
      throw new Error("lsof-missing: lsof is required to scan listening processes");
    }
    const stdout = error.stdout ?? "";
    const stderr = (error.stderr ?? "").trim();
    if (stdout.trim() !== "" || error.status === 1 || error.code === 1) {
      return stdout;
    }
    throw new Error(`lsof failed: ${stderr || error.message}`);
  }
}

async function processCommand(pid: number): Promise<string | undefined> {
  try {
    const raw = await readFile(`/proc/${String(pid)}/cmdline`);
    const text = raw.toString("utf8").replaceAll("\0", " ").trim();
    if (text !== "") {
      return text;
    }
  } catch {
    // macOS (no /proc) or the pid vanished.
  }
  try {
    const { stdout } = await execFileAsync("ps", ["-ww", "-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    });
    const text = stdout.trim();
    return text === "" ? undefined : text;
  } catch {
    return undefined;
  }
}

async function processCwd(pid: number): Promise<string | undefined> {
  try {
    return await realpath(`/proc/${String(pid)}/cwd`);
  } catch {
    // macOS or vanished pid.
  }
  try {
    const { stdout } = await execFileAsync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
    });
    for (const line of stdout.split("\n")) {
      if (line.startsWith("n") && line.length > 1) {
        return line.slice(1);
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function listLiveListeners(): Promise<ListenerProcess[]> {
  const grouped = new Map<number, string[]>();
  for (const line of (await lsofListenOutput()).split("\n")) {
    const parsed = parseLsofListenLine(line);
    if (parsed === undefined) {
      continue;
    }
    const addrs = grouped.get(parsed.pid) ?? [];
    if (!addrs.includes(parsed.addr)) {
      addrs.push(parsed.addr);
    }
    grouped.set(parsed.pid, addrs);
  }
  const listeners: ListenerProcess[] = [];
  for (const [pid, addrs] of grouped) {
    const command = await processCommand(pid);
    const cwd = await processCwd(pid);
    if (command === undefined || cwd === undefined) {
      continue;
    }
    listeners.push({ pid, command, cwd, addrs });
  }
  return listeners;
}

function isListenerProcess(value: unknown): value is ListenerProcess {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ListenerProcess>;
  return (
    typeof candidate.pid === "number" &&
    Number.isSafeInteger(candidate.pid) &&
    typeof candidate.command === "string" &&
    typeof candidate.cwd === "string" &&
    Array.isArray(candidate.addrs) &&
    candidate.addrs.every((addr) => typeof addr === "string")
  );
}

async function loadFixture(fixturePath: string): Promise<ListenerProcess[]> {
  const parsed: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  if (!Array.isArray(parsed) || !parsed.every(isListenerProcess)) {
    throw new Error("--fixture must be a JSON array of {pid, command, cwd, addrs}");
  }
  return parsed;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as KillFailure).code : undefined;
    return code === "EPERM";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitWhileAlive(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) {
      return true;
    }
    await delay(POLL_MS);
  }
  return !pidAlive(pid);
}

function signalPid(pid: number, signal: NodeJS.Signals): "ok" | "gone" | "denied" {
  try {
    process.kill(pid, signal);
    return "ok";
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as KillFailure).code : undefined;
    if (code === "ESRCH") {
      return "gone";
    }
    if (code === "EPERM") {
      return "denied";
    }
    throw error;
  }
}

async function stopPid(pid: number): Promise<{ status: "STOPPED" | "ERROR"; reason?: string }> {
  const term = signalPid(pid, "SIGTERM");
  if (term === "gone") {
    return { status: "STOPPED" };
  }
  if (term === "denied") {
    return { status: "ERROR", reason: "signal-denied" };
  }
  if (await waitWhileAlive(pid, TERM_TIMEOUT_MS)) {
    return { status: "STOPPED" };
  }
  const kill = signalPid(pid, "SIGKILL");
  if (kill === "gone") {
    return { status: "STOPPED" };
  }
  if (kill === "denied") {
    return { status: "ERROR", reason: "signal-denied" };
  }
  if (await waitWhileAlive(pid, KILL_TIMEOUT_MS)) {
    return { status: "STOPPED" };
  }
  return { status: "ERROR", reason: "still-alive" };
}

function emit(row: ReportRow): void {
  process.stdout.write(`${JSON.stringify(row)}\n`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const selfPids = new Set<number>([process.pid, process.ppid, ...options.extraSelfPids]);
  const listeners =
    options.fixturePath === undefined ? await listLiveListeners() : await loadFixture(options.fixturePath);
  for (const proc of listeners) {
    const decision = await decide(proc, options.roots, selfPids);
    if (decision.action === "skip") {
      if (options.fixturePath !== undefined) {
        emit({
          status: "SKIP",
          pid: proc.pid,
          command: proc.command,
          cwd: proc.cwd,
          addrs: proc.addrs,
          reason: decision.reason,
        });
      }
      continue;
    }
    if (options.dryRun) {
      emit({
        status: "WOULD_STOP",
        pid: proc.pid,
        command: proc.command,
        cwd: proc.cwd,
        addrs: proc.addrs,
      });
      continue;
    }
    const result = await stopPid(proc.pid);
    emit({
      status: result.status,
      pid: proc.pid,
      command: proc.command,
      cwd: proc.cwd,
      addrs: proc.addrs,
      reason: result.reason,
    });
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const reason = message.startsWith("lsof-missing") ? "lsof-missing" : "scan-failed";
  emit({ status: "ERROR", reason });
  process.stderr.write(`stop-stale-dev-servers failed: ${message}\n`);
  process.exitCode = 1;
});
