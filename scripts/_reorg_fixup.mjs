#!/usr/bin/env bun
/**
 * Post-reorg fixup: repoint stale specifiers whose targets moved.
 * Builds old->new file map from `git diff --cached --name-status -M` rename
 * pairs, then rewrites any specifier that fails to resolve in the new tree.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, relative, resolve as presolve, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

// ── old -> new file map from staged renames ─────────────────────────────────
const oldToNew = new Map();
{
  const out = execSync("git diff --cached --name-status -M20% -- src", {
    cwd: ROOT,
    encoding: "utf8",
  });
  for (const line of out.split("\n")) {
    const [status, o, n] = line.split("\t");
    if (status?.startsWith("R") && o && n) oldToNew.set(join(ROOT, o), join(ROOT, n));
  }
}
console.log(`rename pairs: ${oldToNew.size}`);

// deleted files (old paths that no longer exist and have no rename target)
const oldIndex = new Set(oldToNew.keys());

function resolveNew(spec, fromFile) {
  spec = spec.replace(/[?#][^"'`]*$/, "");
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = presolve(dirname(fromFile), spec);
  else return null;
  for (const ext of ["", ".ts", ".tsx", ".json", ".d.ts", ".js", ".jsx", ".css"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const idx of ["index.ts", "index.tsx"]) {
      const p = join(base, idx);
      if (existsSync(p)) return p;
    }
  }
  // mirrored-test redirect (vitest plugin)
  const testsRoot = join(SRC, "tests");
  const dir = dirname(fromFile);
  if (spec.startsWith(".") && dir.startsWith(testsRoot)) {
    const sub = relative(testsRoot, dir);
    return resolveNew("." + "/" + spec.replace(/^\.\//, ""), join(SRC, sub, "_x.ts"));
  }
  return null;
}

/** Map an unresolvable specifier to its new location via the rename table. */
function mapStale(spec, fromFile) {
  const suffix = /[?#][^"'`]*$/.exec(spec)?.[0] ?? "";
  const bare = spec.replace(/[?#][^"'`]*$/, "");
  const mapped = mapStaleBare(bare, fromFile);
  return mapped ? mapped + suffix : null;
}

function mapStaleBare(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = presolve(dirname(fromFile), spec);
  else return null;
  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".d.ts",
    base + ".json",
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (oldToNew.has(c)) return toSpec(oldToNew.get(c));
  }
  // mirrored-test fallback against the OLD tree shape
  const testsRoot = join(SRC, "tests");
  const dir = dirname(fromFile);
  if (spec.startsWith(".") && dir.startsWith(testsRoot)) {
    const sub = relative(testsRoot, dir);
    return mapStaleBare("@/" + join(sub, spec).replaceAll(sep, "/"), fromFile);
  }
  return null;
}

const toSpec = (abs) =>
  "@" +
  "/" +
  relative(SRC, abs)
    .replaceAll(sep, "/")
    .replace(/\.(tsx?|d\.ts|json|css)$/, "")
    .replace(/\/index$/, "");

const SPEC_RE =
  /((?:import|export)\s+(?:type\s+)?[\w*${}\s,]*\s+from\s+|import\s*\(\s*|import\s+|(?:vi|jest)\.(?:doMock|mock|unmock|hoisted)\s*\()\s*["'`]([^"'`]+)["'`]/g;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const files = [...walk(SRC), ...walk(join(ROOT, "scripts"))].filter((f) => /\.tsx?$/.test(f));
let fixed = 0;
const unmapped = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  let out = "";
  let last = 0;
  let m;
  SPEC_RE.lastIndex = 0;
  let changed = false;
  while ((m = SPEC_RE.exec(text))) {
    const spec = m[2];
    if (!spec.startsWith("@/") && !spec.startsWith(".")) continue;
    if (resolveNew(spec, f)) continue; // resolves fine already
    const mapped = mapStale(spec, f);
    if (!mapped) {
      unmapped.push(`${relative(ROOT, f)}: ${spec}`);
      continue;
    }
    out += text.slice(last, m.index) + m[0].replace(spec, mapped);
    last = m.index + m[0].length;
    changed = true;
  }
  if (changed) {
    writeFileSync(f, out + text.slice(last));
    fixed++;
  }
}
console.log(`fixed files: ${fixed}, unmapped specs: ${unmapped.length}`);
for (const u of unmapped.slice(0, 60)) console.log("  " + u);
