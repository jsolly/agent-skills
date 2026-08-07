import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

type TargetUrl = string & { readonly targetUrl: unique symbol };
type Milliseconds = number & { readonly milliseconds: unique symbol };

interface CliOptions {
	url: TargetUrl;
	outputDir?: string;
	startExecutable?: string;
	startArgs: string[];
	timeoutMs: Milliseconds;
}

interface BrowserConsoleMessage {
	type(): string;
	text(): string;
}

interface BrowserRoute {
	request(): { url(): string };
	abort(errorCode?: string): Promise<void>;
	continue(): Promise<void>;
}

interface BrowserPage {
	on(event: "console", listener: (message: BrowserConsoleMessage) => void): void;
	on(event: "pageerror", listener: (error: Error) => void): void;
	route?(
		url: string,
		handler: (route: BrowserRoute) => Promise<void> | void,
	): Promise<void>;
	goto(
		url: string,
		options: { waitUntil: "domcontentloaded"; timeout: number },
	): Promise<BrowserResponse | null>;
	url(): string;
	waitForTimeout(timeout: number): Promise<void>;
	screenshot(options: { path: string; fullPage: boolean }): Promise<unknown>;
}

interface BrowserResponse {
	status(): number;
}

interface BrowserContext {
	newPage(): Promise<BrowserPage>;
	close(): Promise<void>;
}

interface Browser {
	newContext(options: {
		viewport: { width: number; height: number };
	}): Promise<BrowserContext>;
	close(): Promise<void>;
}

interface Chromium {
	launch(options: { headless: boolean }): Promise<Browser>;
}

interface PlaywrightModule {
	chromium?: Chromium;
	default?: { chromium?: Chromium };
}

interface BrowserIssue {
	viewport: string;
	source: "console" | "page";
	severity: "warning" | "error";
	message: string;
}

const DEFAULT_TIMEOUT_MS = 30_000 as Milliseconds;

function usage(): never {
	throw new Error(
		"Usage: smoke-ui.mts --url <http(s)://...> [--output-dir <path>] " +
			"[--start-command <executable> --start-arg <arg> ...] [--timeout-ms <milliseconds>]",
	);
}

function parseTargetUrl(raw: string): TargetUrl {
	const parsed = new URL(raw);
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`--url must use http or https, received ${parsed.protocol}`);
	}
	const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
	if (!loopbackHosts.has(parsed.hostname)) {
		throw new Error(
			`--url must target a loopback dev server, received ${parsed.hostname}; use the harness-native browser for remote smoke checks`,
		);
	}
	if (parsed.username !== "" || parsed.password !== "" || parsed.search !== "" || parsed.hash !== "") {
		throw new Error("--url must not contain credentials, query parameters, or a fragment");
	}
	return parsed.toString() as TargetUrl;
}

function parseTimeout(raw: string): Milliseconds {
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`--timeout-ms must be a positive integer, received ${raw}`);
	}
	return value as Milliseconds;
}

function parseArgs(args: readonly string[]): CliOptions {
	let url: TargetUrl | undefined;
	let outputDir: string | undefined;
	let startExecutable: string | undefined;
	const startArgs: string[] = [];
	let timeoutMs = DEFAULT_TIMEOUT_MS;

	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		const value = args[index + 1];
		if (flag === "--url" && value !== undefined) {
			url = parseTargetUrl(value);
			index += 1;
		} else if (flag === "--output-dir" && value !== undefined) {
			outputDir = value;
			index += 1;
		} else if (flag === "--start-command" && value !== undefined) {
			startExecutable = value;
			index += 1;
		} else if (flag === "--start-arg" && value !== undefined) {
			startArgs.push(value);
			index += 1;
		} else if (flag === "--timeout-ms" && value !== undefined) {
			timeoutMs = parseTimeout(value);
			index += 1;
		} else {
			usage();
		}
	}

	if (url === undefined) {
		usage();
	}
	if (startExecutable === undefined && startArgs.length > 0) {
		throw new Error("--start-arg requires --start-command");
	}
	return { url, outputDir, startExecutable, startArgs, timeoutMs };
}

function resolvePlaywrightModule(): string {
	const requireFromRepo = createRequire(path.join(process.cwd(), "package.json"));
	for (const candidate of ["playwright", "@playwright/test"]) {
		try {
			return requireFromRepo.resolve(candidate);
		} catch {
			// Try the next package; target repos commonly install one or the other.
		}
	}
	throw new Error(
		"Playwright is not installed in the target repo. Use the harness-native browser or install the repo's documented browser-test dependencies.",
	);
}

async function loadChromium(): Promise<Chromium> {
	const modulePath = resolvePlaywrightModule();
	const loaded = (await import(pathToFileURL(modulePath).href)) as PlaywrightModule;
	const chromium = loaded.chromium ?? loaded.default?.chromium;
	if (chromium === undefined) {
		throw new Error(`Resolved ${modulePath}, but it does not export chromium`);
	}
	return chromium;
}

function delay(timeoutMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

async function waitUntilReady(
	url: TargetUrl,
	timeoutMs: Milliseconds,
	server: ChildProcess | undefined,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let lastFailure = "no response";
	while (Date.now() < deadline) {
		if (server !== undefined && hasExited(server)) {
			throw new Error(
				`Dev server exited before ${url} became ready (code ${server.exitCode ?? server.signalCode})`,
			);
		}
		try {
			const remainingMs = Math.max(1, deadline - Date.now());
			const response = await fetch(url, {
				redirect: "manual",
				signal: AbortSignal.timeout(Math.min(2_000, remainingMs)),
			});
			if (response.status >= 200 && response.status < 300) {
				return;
			}
			lastFailure = `HTTP ${response.status}`;
		} catch (error) {
			lastFailure = error instanceof Error ? error.message : String(error);
		}
		await delay(250);
	}
	throw new Error(`Timed out waiting for ${url}: ${lastFailure}`);
}

function routeSlug(url: TargetUrl): string {
	const parsed = new URL(url);
	const raw = `${parsed.hostname}-${parsed.pathname === "/" ? "root" : parsed.pathname}`;
	return raw.replaceAll(/[^a-zA-Z0-9]+/g, "-").replaceAll(/^-|-$/g, "").toLowerCase();
}

function normalizedPathname(url: string): string {
	const pathname = new URL(url).pathname;
	return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function hasExited(server: ChildProcess): boolean {
	return server.exitCode !== null || server.signalCode !== null;
}

function processTreeAlive(server: ChildProcess): boolean {
	if (server.pid === undefined) {
		return false;
	}
	if (process.platform !== "win32") {
		try {
			process.kill(-server.pid, 0);
			return true;
		} catch {
			return false;
		}
	}
	return !hasExited(server);
}

function signalProcessTree(server: ChildProcess, signal: NodeJS.Signals): void {
	if (server.pid === undefined) {
		return;
	}
	if (process.platform !== "win32") {
		try {
			process.kill(-server.pid, signal);
			return;
		} catch {
			// Fall back to the direct child when no process group remains.
		}
	}
	if (!hasExited(server)) {
		server.kill(signal);
	}
}

async function waitForProcessTreeExit(server: ChildProcess, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (!processTreeAlive(server)) {
			return true;
		}
		await delay(50);
	}
	return !processTreeAlive(server);
}

async function stopServer(server: ChildProcess | undefined): Promise<void> {
	if (server === undefined || !processTreeAlive(server)) {
		return;
	}
	signalProcessTree(server, "SIGTERM");
	if (!(await waitForProcessTreeExit(server, 2_000))) {
		signalProcessTree(server, "SIGKILL");
		if (!(await waitForProcessTreeExit(server, 2_000))) {
			throw new Error(`Failed to terminate started process group ${server.pid ?? "unknown"}`);
		}
	}
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const outputDir =
		options.outputDir === undefined
			? await mkdtemp(path.join(tmpdir(), "verify-ui-"))
			: path.resolve(options.outputDir);
	if (options.outputDir !== undefined) {
		await mkdir(outputDir, { recursive: true });
	}

	let server: ChildProcess | undefined;
	let serverSpawnFailed: Promise<never> | undefined;
	if (options.startExecutable !== undefined) {
		server = spawn(options.startExecutable, options.startArgs, {
			cwd: process.cwd(),
			detached: process.platform !== "win32",
			shell: false,
			stdio: "inherit",
		});
		serverSpawnFailed = new Promise((_resolve, reject) => {
			server?.on("error", (error) => {
				const message = error instanceof Error ? error.message : String(error);
				reject(new Error(`Failed to start command: ${message}`));
			});
		});
		// Avoid an unhandled rejection if readiness wins the race first.
		void serverSpawnFailed.catch(() => undefined);
	}

	let browser: Browser | undefined;
	let handlingSignal = false;
	const handleSignal = (exitCode: number): void => {
		if (handlingSignal) {
			return;
		}
		handlingSignal = true;
		void (async () => {
			try {
				await browser?.close();
			} finally {
				try {
					await stopServer(server);
				} finally {
					process.exit(exitCode);
				}
			}
		})();
	};
	const handleSigint = (): void => handleSignal(130);
	const handleSigterm = (): void => handleSignal(143);
	process.once("SIGINT", handleSigint);
	process.once("SIGTERM", handleSigterm);

	try {
		const readiness = waitUntilReady(options.url, options.timeoutMs, server);
		await (serverSpawnFailed === undefined
			? readiness
			: Promise.race([readiness, serverSpawnFailed]));
		const chromium = await loadChromium();
		browser = await chromium.launch({ headless: true });

		const issues: BrowserIssue[] = [];
		const screenshots: Record<string, string> = {};
		const viewports = [
			{ name: "desktop", width: 1280, height: 900 },
			{ name: "mobile", width: 390, height: 844 },
		] as const;
		const requested = new URL(options.url);

		for (const viewport of viewports) {
			const context = await browser.newContext({
				viewport: { width: viewport.width, height: viewport.height },
			});
			try {
				const page = await context.newPage();
				if (page.route !== undefined) {
					await page.route("**/*", async (route) => {
						const requestUrl = new URL(route.request().url());
						if (requestUrl.origin !== requested.origin) {
							await route.abort("blockedbyclient");
							return;
						}
						await route.continue();
					});
				}
				page.on("console", (message) => {
					const type = message.type();
					if (type === "error" || type === "warning") {
						issues.push({
							viewport: viewport.name,
							source: "console",
							severity: type,
							message: message.text(),
						});
					}
				});
				page.on("pageerror", (error) => {
					issues.push({
						viewport: viewport.name,
						source: "page",
						severity: "error",
						message: error.message,
					});
				});
				const response = await page.goto(options.url, {
					waitUntil: "domcontentloaded",
					timeout: options.timeoutMs,
				});
				if (response === null || response.status() < 200 || response.status() >= 300) {
					throw new Error(
						`${viewport.name} navigation returned ${response?.status() ?? "no response"}`,
					);
				}
				await page.waitForTimeout(750);
				const final = new URL(page.url());
				if (
					final.origin !== requested.origin ||
					normalizedPathname(final.toString()) !== normalizedPathname(requested.toString())
				) {
					throw new Error(
						`${viewport.name} navigation redirected away from the requested route: ${final.toString()}`,
					);
				}
				const screenshotPath = path.join(
					outputDir,
					`${routeSlug(options.url)}-${viewport.name}.png`,
				);
				await page.screenshot({ path: screenshotPath, fullPage: true });
				screenshots[viewport.name] = screenshotPath;
			} finally {
				await context.close();
			}
		}

		const hasErrors = issues.some((issue) => issue.severity === "error");
		const hasWarnings = issues.some((issue) => issue.severity === "warning");
		const receipt = {
			url: options.url,
			screenshots,
			consoleStatus: hasErrors ? "errors" : hasWarnings ? "warnings" : "clean",
			issues,
		};
		const receiptPath = path.join(outputDir, `${routeSlug(options.url)}-receipt.json`);
		await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
		process.stdout.write(`${JSON.stringify({ ...receipt, receiptPath }, null, 2)}\n`);
		if (hasErrors) {
			process.exitCode = 2;
		}
	} finally {
		process.removeListener("SIGINT", handleSigint);
		process.removeListener("SIGTERM", handleSigterm);
		try {
			await browser?.close();
		} finally {
			await stopServer(server);
		}
	}
}

void main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`verify-ui smoke failed: ${message}\n`);
	process.exitCode = 1;
});
