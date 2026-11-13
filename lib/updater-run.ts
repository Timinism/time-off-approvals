import { execFile } from "node:child_process";
import { accessSync, constants as fsConstants, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import semver from "semver";

import { explain, parsePackument, selectSupported, type Packument, type Selection } from "./updater";

const REGISTRY = "https://registry.npmjs.org";
const NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const CACHE_MS = 10 * 60 * 1000;

export type ComponentRow = {
  name: string;
  vendor: string;
  section: "runtime" | "build";
  installed: string | null;
  supported: string;
  latest: string;
  status: "current" | "behind" | "ahead" | "missing" | "held";
  note: string;
};

export type ComponentReport = {
  checkedAt: string;
  node: string;
  apply: { enabled: boolean; reason: string };
  warning: string | null;
  components: ComponentRow[];
};

type CacheBox = {
  cache?: { at: number; report: ComponentReport };
  flight?: Promise<ComponentReport>;
};

function box(): CacheBox {
  const host = globalThis as typeof globalThis & { __timeoffComponents?: CacheBox };
  host.__timeoffComponents ??= {};
  return host.__timeoffComponents;
}

export function projectRoot(): string {
  return process.cwd();
}

export function applyAvailability(root = projectRoot()): { enabled: boolean; reason: string } {
  if (process.env.TIMEOFF_COMPONENT_UPDATES === "0") {
    return { enabled: false, reason: "Component installs are turned off on this host." };
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return {
      enabled: false,
      reason: "This host serves a built copy. Run the update from the project checkout, where npm can install.",
    };
  }
  try {
    accessSync(path.join(root, "package.json"), fsConstants.W_OK);
  } catch {
    return {
      enabled: false,
      reason: "This host serves a built copy. Run the update from the project checkout, where npm can install.",
    };
  }
  return { enabled: true, reason: "Update installs the supported releases into this checkout." };
}

export async function componentReport(force = false): Promise<ComponentReport> {
  const state = box();
  if (!force && state.cache && Date.now() - state.cache.at < CACHE_MS) return state.cache.report;
  const report = await buildReport();
  state.cache = { at: Date.now(), report };
  return report;
}

export async function updateComponents(): Promise<ComponentReport> {
  const state = box();
  if (state.flight) throw new Error("An update is already running.");
  const availability = applyAvailability();
  if (!availability.enabled) throw new Error(availability.reason);
  const flight = runUpdate().finally(() => {
    state.flight = undefined;
    state.cache = undefined;
  });
  state.flight = flight;
  return flight;
}

async function runUpdate(): Promise<ComponentReport> {
  const root = projectRoot();
  const pkgPath = path.join(root, "package.json");
  const lockPath = path.join(root, "package-lock.json");
  const originalPkg = await readFile(pkgPath, "utf8");
  const originalLock = await readFile(lockPath, "utf8").catch(() => null);
  const planned = await plan(root);
  const pkg = JSON.parse(originalPkg) as PackageFile;
  let changed = false;
  for (const row of planned.rows) {
    if (row.installed === row.selection.version && specAllows(row.spec, row.selection.version)) continue;
    if (!safeVersion(row.selection.version)) throw new Error(`Refusing an unexpected version for ${row.name}.`);
    const bucket = row.section === "runtime" ? pkg.dependencies : pkg.devDependencies;
    if (!bucket || !NAME.test(row.name)) throw new Error("Refusing an unexpected component name.");
    bucket[row.name] = nextSpec(row.spec, row.selection.version);
    changed = true;
  }
  if (!changed) return componentReport(true);
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  try {
    await npmInstall(root);
  } catch (error) {
    await writeFile(pkgPath, originalPkg);
    if (originalLock !== null) await writeFile(lockPath, originalLock);
    try {
      await npmInstall(root);
    } catch {
      // The lockfile is restored. A second install is the recovery path when the first one stopped midway.
    }
    throw error;
  }
  return componentReport(true);
}

type Planned = {
  warning: string | null;
  rows: Array<{ name: string; section: "runtime" | "build"; spec: string; installed: string | null; selection: Selection }>;
  vendors: Map<string, string>;
};

async function buildReport(): Promise<ComponentReport> {
  const planned = await plan(projectRoot());
  const node = process.versions.node;
  return {
    checkedAt: new Date().toISOString(),
    node,
    apply: applyAvailability(),
    warning: planned.warning,
    components: planned.rows.map((row) => ({
      name: row.name,
      vendor: planned.vendors.get(row.name) ?? vendorFallback(row.name),
      section: row.section,
      installed: row.installed,
      supported: row.selection.version,
      latest: row.selection.latest,
      status: statusOf(row.installed, row.selection.version, row.selection.latest),
      note: explain(row.selection, node),
    })),
  };
}

async function plan(root: string): Promise<Planned> {
  const file = await readPackage(root);
  const entries = listed(file);
  const docs: Record<string, Packument> = {};
  await mapPool(entries, 6, async (entry) => {
    docs[entry.name] = await loadPackument(entry.name);
  });
  const extraNames = transitiveNames(entries.map((entry) => entry.name), docs);
  const extras: Record<string, Packument> = {};
  const skipped: string[] = [];
  await mapPool(extraNames, 6, async (name) => {
    try {
      extras[name] = await loadPackument(name);
    } catch {
      skipped.push(name);
    }
  });
  const floors: Record<string, string | null> = {};
  for (const entry of entries) {
    floors[entry.name] = prereleaseFloor(entry.spec, installedVersion(root, entry.name));
  }
  const selections = selectSupported({
    names: entries.map((entry) => entry.name),
    docs,
    extras,
    nodeVersion: process.versions.node,
    floors,
  });
  const byName = new Map(selections.map((selection) => [selection.name, selection]));
  const vendors = new Map<string, string>();
  await mapPool(selections, 6, async (selection) => {
    vendors.set(selection.name, await vendorOf(selection.name, selection.version));
  });
  return {
    warning:
      skipped.length > 0
        ? `Time Off could not read support ranges from ${skipped.slice(0, 3).join(", ")}.`
        : null,
    vendors,
    rows: entries.map((entry) => {
      const selection = byName.get(entry.name);
      if (!selection) throw new Error(`Missing a decision for ${entry.name}.`);
      return {
        ...entry,
        installed: installedVersion(root, entry.name),
        selection,
      };
    }),
  };
}

function prereleaseFloor(spec: string, installed: string | null): string | null {
  const declared = spec.replace(/^[\^~>=\s]+/, "");
  const version = semver.valid(declared) ? declared : installed;
  if (!version || !semver.valid(version) || semver.prerelease(version) === null) return null;
  return version;
}

function listed(file: PackageFile): Array<{ name: string; section: "runtime" | "build"; spec: string }> {
  const rows: Array<{ name: string; section: "runtime" | "build"; spec: string }> = [];
  for (const [name, spec] of Object.entries(file.dependencies ?? {})) {
    if (NAME.test(name) && typeof spec === "string") rows.push({ name, section: "runtime", spec });
  }
  for (const [name, spec] of Object.entries(file.devDependencies ?? {})) {
    if (NAME.test(name) && typeof spec === "string") rows.push({ name, section: "build", spec });
  }
  return rows;
}

function transitiveNames(direct: string[], docs: Record<string, Packument>): string[] {
  const have = new Set(direct);
  const rankedNames: string[] = [];
  for (const name of direct) {
    const versions = Object.values(docs[name]?.versions ?? {}).filter(
      (meta) => semver.prerelease(meta.version) === null && !meta.deprecated,
    );
    const newest = versions.sort((a, b) => semver.rcompare(a.version, b.version))[0];
    for (const dep of Object.keys(newest?.dependencies ?? {})) {
      if (!have.has(dep) && NAME.test(dep)) rankedNames.push(dep);
    }
  }
  const unique = [...new Set(rankedNames)];
  unique.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return unique.slice(0, 80);
}

function rank(name: string): number {
  return /typescript|eslint|react|next|tailwind|postcss/.test(name) ? 0 : 1;
}

async function loadPackument(name: string): Promise<Packument> {
  if (!NAME.test(name)) throw new Error("Unknown component.");
  const raw = await fetchRegistry(`/${registryName(name)}`);
  const parsed = parsePackument(raw);
  if (!parsed) throw new Error(`The npm registry returned an unreadable document for ${name}.`);
  return parsed;
}

async function vendorOf(name: string, version: string): Promise<string> {
  if (!safeVersion(version)) return vendorFallback(name);
  try {
    const raw = await fetchRegistry(`/${registryName(name)}/${encodeURIComponent(version)}`, "application/json");
    if (!raw || typeof raw !== "object") return vendorFallback(name);
    const author = (raw as { author?: unknown }).author;
    if (typeof author === "string" && cleanAuthor(author) !== "npm") return cleanAuthor(author);
    if (author && typeof author === "object" && typeof (author as { name?: unknown }).name === "string") {
      const nameFromAuthor = cleanAuthor((author as { name: string }).name);
      if (nameFromAuthor !== "npm") return nameFromAuthor;
    }
    const org = repositoryOrg(raw);
    if (org) return org;
  } catch {
    return vendorFallback(name);
  }
  return vendorFallback(name);
}

function repositoryOrg(raw: object): string | null {
  const repo = (raw as { repository?: unknown }).repository;
  const url =
    typeof repo === "string"
      ? repo
      : repo && typeof repo === "object" && typeof (repo as { url?: unknown }).url === "string"
        ? (repo as { url: string }).url
        : "";
  const match = /github\.com[:/]([^/]+)/i.exec(url);
  return match?.[1] ?? null;
}

function vendorFallback(name: string): string {
  if (name.startsWith("@")) return name.slice(1).split("/")[0] || "npm";
  return "npm";
}

function cleanAuthor(value: string): string {
  const cleaned = value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return cleaned || "npm";
}

async function fetchRegistry(pathname: string, accept = "application/vnd.npm.install-v1+json"): Promise<unknown> {
  const url = new URL(pathname, REGISTRY);
  if (url.origin !== REGISTRY) throw new Error("Registry host is fixed.");
  const response = await fetch(url, {
    headers: {
      accept,
      "user-agent": "timeoff-component-update",
    },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`The npm registry did not return ${pathname}.`);
  return response.json() as Promise<unknown>;
}

function installedVersion(root: string, name: string): string | null {
  const manifest = path.join(root, "node_modules", ...name.split("/"), "package.json");
  try {
    const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" && semver.valid(parsed.version) ? parsed.version : null;
  } catch {
    return null;
  }
}

type PackageFile = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

async function readPackage(root: string): Promise<PackageFile> {
  const raw = await readFile(path.join(root, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("package.json is unreadable.");
  return parsed as PackageFile;
}

function statusOf(installed: string | null, supported: string, latest: string): ComponentRow["status"] {
  if (!installed) return "missing";
  if (semver.lt(installed, supported)) return "behind";
  if (semver.gt(installed, supported)) return "ahead";
  if (semver.lt(supported, latest)) return "held";
  return "current";
}

function specAllows(spec: string, version: string): boolean {
  if (spec === version || spec === `^${version}` || spec === `~${version}`) return true;
  try {
    return semver.satisfies(version, spec);
  } catch {
    return false;
  }
}

function nextSpec(current: string, version: string): string {
  if (current.startsWith("^")) return `^${version}`;
  if (current.startsWith("~")) return `~${version}`;
  return version;
}

function safeVersion(version: string): boolean {
  return semver.valid(version) === version;
}

function registryName(name: string): string {
  return name.replace("/", "%2f");
}

function npmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "npm",
      ["install", "--no-audit", "--no-fund"],
      { cwd, timeout: 180_000, env: process.env, maxBuffer: 8_000_000 },
      (error, _stdout, stderr) => {
        if (error) {
          const detail = stderr.toString().replace(/\s+/g, " ").trim().slice(-400);
          reject(new Error(detail || "npm install failed."));
          return;
        }
        resolve();
      },
    );
  });
}

async function mapPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}
