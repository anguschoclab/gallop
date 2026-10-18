#!/usr/bin/env bun
/**
 * Domain-strata reorganization codemod (one-shot).
 *
 * Target layout:
 *   src/shared/{common,types,data,assets,ui,hooks,lib,facades,constants}
 *   src/platform/{engine,time,resolver,persistence,workers,game}
 *   src/domains/<d>/{model,simulation,application,ui}
 *   src/routes, src/tests, src/test-utils unchanged.
 *
 * Usage:
 *   bun scripts/_reorg.mjs           # dry-run report (moves + layer violations)
 *   bun scripts/_reorg.mjs --apply   # rename files and rewrite specifiers
 */
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { join, dirname, relative, basename, resolve as presolve, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APPLY = process.argv.includes("--apply");

// constants/<file> (without ext) -> owning domain; absent => src/shared/constants
const CONSTANT_DOMAIN = {
  aiConstants: "agents",
  auctionConstants: "auction",
  awardsConstants: "awards",
  banisterConstants: "training",
  breedingConstants: "breeding",
  calendarConstants: "calendar",
  economicConstants: "market",
  energyRecoveryConstants: "training",
  facilityConstants: "facilities",
  fameConstants: "prestige",
  financialDistressConstants: "financial",
  gateConstants: "race",
  healthInjuryConstants: "health",
  horseStatConstants: "horse",
  inboxConstants: "inbox",
  jockeyConstants: "jockey",
  narrativeConditionConstants: "narrative",
  narrativeThresholds: "narrative",
  newsConstants: "inbox",
  pipelineConstants: null, // -> platform/time
  privateSaleConstants: "market",
  raceBroadcastConstants: "race",
  raceClassificationConstants: "race",
  raceEngineConstants: "race",
  raceEntryConstants: "race",
  raceSimulationConstants: "race",
};

const PAGE_DOMAIN = {
  AuctionSalePage: "auction",
  BookmarksPage: "bookmarks",
  HorseDetail: "horse",
  HorseGalleryPage: "horse",
  InboxPage: "inbox",
  LiveRace: "race",
  NpcStableDetailPage: "agents",
  NpcStablesCompare: "agents",
  NpcStablesRivalCareers: "agents",
  RootComponent: "shell",
  StablePage: "stable",
  StaffDetailPage: "staff",
  StartScreen: "shell",
  SyndicatePage: "syndicates",
};

const ROOT_COMPONENT_DOMAIN = {
  FinancialChart: "financial",
  FinancialReport: "financial",
};

const NAME_ALIAS = { ai: "agents", npc: "agents" };

const MODEL_RE =
  /(^|[._-])(types?|constants?|data|defaults?|labels?|enums?|themes?|tokens|fixtures|schemas?|names|pools|catalog|mappings|messages|dictionary)\.tsx?$|Types\.tsx?$|Data\.tsx?$|\.d\.ts$/i;

// Ordered prefix rules, longest match wins.
const PREFIX_RULES = [
  ["src/assets/awards", "src/domains/awards/ui/assets"],
  ["src/core/time", "src/platform/time"],
  ["src/core/engine", "src/platform/engine"],
  ["src/core/resolver", "src/platform/resolver"],
  ["src/core/persistence", "src/platform/persistence"],
  ["src/workers", "src/platform/workers"],
  ["src/game", "src/platform/game"],
  ["src/services/storage", "src/platform/persistence/storage"],
  ["src/services/resolver", "src/platform/resolver/facade"],
  ["src/hooks/game", "src/platform/game/hooks"],
  ["src/core/common", "src/shared/common"],
  ["src/core/types", "src/shared/types"],
  ["src/core/data", "src/shared/data/accessors"],
  ["src/core/uuid.ts", "src/shared/uuid/uuid.ts"],
  ["src/core/uuidProvider.ts", "src/shared/uuid/uuidProvider.ts"],
  ["src/core/uuidRegistry.ts", "src/shared/uuid/uuidRegistry.ts"],
  ["src/lib", "src/shared/lib"],
  ["src/data", "src/shared/data"],
  ["src/assets", "src/shared/assets"],
  ["src/components/ui", "src/shared/ui"],
  ["src/components/common", "src/shared/ui/common"],
  ["src/components/shared", "src/shared/ui/shared"],
  ["src/components/charts", "src/shared/ui/charts"],
  ["src/services/common", "src/shared/facades/common"],
  ["src/hooks/shared", "src/shared/hooks"],
  ["src/hooks/ui", "src/shared/hooks/ui"],
];

// null value => file is deleted after its importers are repointed (barrels)
const FILE_OVERRIDES = {
  // generates entities via domain factories -> horse simulation
  "src/data/famousStallions.ts": "src/domains/horse/simulation/famousStallions.ts",
  // wizard glue -> onboarding application
  "src/hooks/shared/useNewGameWizard.ts": "src/domains/onboarding/application/useNewGameWizard.ts",
  "src/components/NewGameWizard/steps/helpers.tsx":
    "src/domains/onboarding/application/steps/helpers.tsx",
  // lazily renders a component -> UI layer
  "src/core/horse/exportPortrait.ts": "src/domains/horse/ui/exportPortrait.ts",
  // domain-coupled shared modules -> their domains
  "src/core/common/traitLabels.ts": "src/domains/genetics/application/traitLabels.ts",
  "src/components/ui/JargonTooltip.tsx": "src/domains/horse/ui/JargonTooltip.tsx",
  "src/components/shared/PrestigeBreakdownPanel.tsx":
    "src/domains/prestige/ui/PrestigeBreakdownPanel.tsx",
  "src/components/shared/PrestigeBadge.tsx": "src/domains/prestige/ui/PrestigeBadge.tsx",
  "src/components/race/TacticOptions.ts": "src/domains/race/application/TacticOptions.ts",
  "src/components/race/raceVisualHelpers.ts": "src/domains/race/application/raceVisualHelpers.ts",
  "src/data/realWorldMarketIndices.ts": "src/domains/calendar/model/realWorldMarketIndices.ts",
  // store/storage-coupled hooks -> platform
  "src/hooks/shared/useSaveSlots.ts": "src/platform/game/hooks/useSaveSlots.ts",
  "src/hooks/shared/useEntityLinks.ts": "src/platform/game/hooks/useEntityLinks.ts",
  "src/hooks/shared/useSkipToNext.ts": "src/platform/game/hooks/useSkipToNext.ts",
  "src/hooks/shared/useStoreHydration.ts": "src/platform/game/hooks/useStoreHydration.ts",
  "src/hooks/shared/useGameSelector.ts": "src/platform/game/hooks/useGameSelector.ts",
  "src/hooks/shared/useBookmarks.ts": "src/platform/game/hooks/useBookmarks.ts",
  "src/hooks/shared/useLiveFreshness.ts": "src/domains/race/application/hooks/useLiveFreshness.ts",
  // pure types/thresholds shared by NPC sim and insights UI -> model
  "src/domains/agents/simulation/npc/scoutingThresholds.ts":
    "src/domains/agents/model/scoutingThresholds.ts",
  // pure display/derivation helpers consumed by UI -> model
  "src/core/tutorial/deriveTutorialStep.ts": "src/domains/tutorial/model/deriveTutorialStep.ts",
  "src/core/racing/nominationFees.ts": "src/domains/racing/model/nominationFees.ts",
  "src/core/health/injuryDisplay.ts": "src/domains/health/model/injuryDisplay.ts",
  "src/core/inbox/ctaRoute.ts": "src/domains/inbox/model/ctaRoute.ts",
  // mega-barrels: importers get symbol-split to true owners
  "src/services/common/commonFacade.ts": null,
};

// files whose re-exports get inlined into importers (deleted or stripped)
const SPLIT_FILES = new Set([
  join(SRC, "services/common/commonFacade.ts"),
  join(SRC, "core/common/random.ts"),
]);

// ─────────────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const allFiles = walk(SRC).filter(
  (f) => !f.includes("routeTree.gen.ts") && !f.endsWith(".DS_Store"),
);

// specifier sites: static imports/exports, side-effect imports, dynamic imports,
// vi./jest.mock factories.
const SPEC_RE =
  /((?:import|export)\s+(?:type\s+)?[\w*${}\s,]*\s+from\s+|import\s*\(\s*|import\s+|(?:vi|jest)\.(?:doMock|mock|unmock|hoisted)\s*\()\s*["'`]([^"'`]+)["'`]/g;

function specifiers(text) {
  const out = [];
  let m;
  while ((m = SPEC_RE.exec(text))) {
    const prefix = m[1];
    out.push({
      spec: m[2],
      index: m.index,
      typeOnly: /^(import|export)\s+type/.test(prefix.trim()),
      dynamic: /^import\s*\(/.test(prefix),
      isExport: /^export/.test(prefix.trim()),
    });
  }
  return out;
}

function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = presolve(dirname(fromFile), spec);
  else return null;
  const tried = tryResolve(base, fromFile);
  if (tried) return tried;
  // vitest mirrored-source redirect: src/tests/<sub>/ importing "./y" resolves
  // against src/<sub>/ — replicate for test files
  const testsRoot = join(SRC, "tests");
  const importerDir = dirname(fromFile);
  if (spec.startsWith(".") && importerDir.startsWith(testsRoot)) {
    const sub = relative(testsRoot, importerDir);
    return tryResolve(presolve(join(SRC, sub), spec), fromFile);
  }
  return null;
}

function tryResolve(base, fromFile) {
  for (const ext of ["", ".ts", ".tsx", ".json", ".d.ts", ".js", ".jsx", ".css"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const idx of ["index.ts", "index.tsx", "index.d.ts"]) {
      const p = join(base, idx);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

const REEXPORT_STAR = /export\s+(?:type\s+)?\*\s+from\s+["']([^"']+)["']/g;

/** Single underlying module a pure barrel forwards to, or null. */
function uniqueBarrelTarget(info) {
  if (!info) return null;
  if (info.star.length === 1 && info.named.size === 0) return info.star[0];
  if (info.star.length === 0 && info.named.size > 0) {
    const targets = new Set([...info.named.values()].map((v) => v.file));
    if (targets.size === 1) return [...targets][0];
  }
  return null;
}
const REEXPORT_NAMED = /export\s+(?:type\s+)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
const EXPORT_LOCAL_NAMED = /export\s+(?:type\s+)?\{([^}]+)\}(?!\s*from)/g;
const EXPORT_DECL_RE =
  /export\s+(?:declare\s+)?(?:const|let|var|function\*?|class|enum|interface|type|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g;

/** If file is only re-export statements, return {star: [...targets], named: Map(name->{file,localName})} */
const COMMENTS_RE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

function barrelInfo(file) {
  const text = readFileSync(file, "utf8");
  let rest = text.replace(COMMENTS_RE, "");
  const star = [];
  let m;
  REEXPORT_STAR.lastIndex = 0;
  while ((m = REEXPORT_STAR.exec(text))) {
    const t = resolveSpec(m[1], file);
    if (t) star.push(t);
    rest = rest.replace(m[0], "");
  }
  const named = new Map();
  REEXPORT_NAMED.lastIndex = 0;
  while ((m = REEXPORT_NAMED.exec(text))) {
    const t = resolveSpec(m[2], file);
    rest = rest.replace(m[0], "");
    if (t) {
      for (const part of m[1].split(",")) {
        const segs = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/);
        const src = segs[0].trim();
        const exported = (segs[1] ?? segs[0]).trim();
        if (exported) named.set(exported, { file: t, localName: src });
      }
    }
  }
  if (/export\s/.test(rest)) return null; // has own exports too
  return { star, named };
}

// ── recursive symbol resolution: (moduleFile, exportedName) -> {file, localName}
const moduleInfoCache = new Map();
function moduleInfo(file) {
  if (moduleInfoCache.has(file)) return moduleInfoCache.get(file);
  const text = readFileSync(file, "utf8");
  const locals = new Set();
  const named = new Map();
  const stars = [];
  let m;
  EXPORT_DECL_RE.lastIndex = 0;
  while ((m = EXPORT_DECL_RE.exec(text))) locals.add(m[1]);
  EXPORT_LOCAL_NAMED.lastIndex = 0;
  while ((m = EXPORT_LOCAL_NAMED.exec(text))) {
    for (const part of m[1].split(",")) {
      const segs = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/);
      const nm = (segs[segs.length - 1] ?? "").trim();
      if (nm) locals.add(nm);
    }
  }
  REEXPORT_NAMED.lastIndex = 0;
  while ((m = REEXPORT_NAMED.exec(text))) {
    const t = resolveSpec(m[2], file);
    if (!t) continue;
    for (const part of m[1].split(",")) {
      const segs = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/);
      const src = segs[0].trim();
      const exp = (segs[1] ?? segs[0]).trim();
      if (exp) named.set(exp, { file: t, localName: src });
    }
  }
  REEXPORT_STAR.lastIndex = 0;
  while ((m = REEXPORT_STAR.exec(text))) {
    const t = resolveSpec(m[1], file);
    if (t) stars.push(t);
  }
  const info = { locals, named, stars };
  moduleInfoCache.set(file, info);
  return info;
}

function resolveSymbol(file, name, seen = new Set()) {
  if (seen.has(file)) return null;
  seen.add(file);
  const info = moduleInfo(file);
  if (info.locals.has(name)) return { file, localName: name };
  const n = info.named.get(name);
  if (n) return resolveSymbol(n.file, n.localName, seen) ?? n;
  for (const s of info.stars) {
    const r = resolveSymbol(s, name, seen);
    if (r) return r;
  }
  return null;
}

// ── classification (core files only) ─────────────────────────────────────────
const classification = new Map(); // absOld -> "model" | "simulation"

function classifyAll() {
  const coreFiles = allFiles.filter(
    (f) =>
      /src\/core\//.test(f) &&
      !/src\/core\/(time|engine|resolver|persistence|common|types|data)\//.test(f) &&
      !/src\/core\/uuid[^/]*\.ts$/.test(f),
  );
  for (const f of coreFiles)
    classification.set(f, MODEL_RE.test(basename(f)) ? "model" : "simulation");

  // fixpoint: a model file that value-imports a simulation-classified file is
  // demoted to simulation
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 30) {
    changed = false;
    for (const f of coreFiles) {
      if (classification.get(f) !== "model") continue;
      for (const s of specifiers(readFileSync(f, "utf8"))) {
        if (s.typeOnly) continue;
        const t = resolveSpec(s.spec, f);
        if (!t) continue;
        const tLayer = classification.get(t);
        const tNewRel = plannedMove(t);
        const tSim = tLayer === "simulation" || (tNewRel && tNewRel.includes("/simulation/"));
        if (tSim) {
          classification.set(f, "simulation");
          changed = true;
          break;
        }
      }
    }
  }
}

function plannedMove(absPath) {
  const rel = relative(ROOT, absPath).replaceAll(sep, "/");
  if (Object.hasOwn(FILE_OVERRIDES, rel)) return FILE_OVERRIDES[rel];

  if (rel.startsWith("src/constants/")) {
    // pure barrels are inlined (deleted); declared symbols move with the leaf.
    const info = barrelInfo(absPath);
    if (info) return null;
    const b = basename(rel).replace(/\.tsx?$/, "");
    if (Object.hasOwn(CONSTANT_DOMAIN, b)) {
      const dom = CONSTANT_DOMAIN[b];
      return dom === null
        ? `src/platform/time/${basename(rel)}`
        : `src/domains/${dom}/model/${basename(rel)}`;
    }
    return `src/shared/constants/${basename(rel)}`;
  }

  // transparent pointer barrels forwarding to a single module are deleted;
  // importers chase through to the real declaration site.
  if (/\.tsx?$/.test(rel)) {
    const info = barrelInfo(absPath);
    if (uniqueBarrelTarget(info)) return null;
  }

  for (const [o, n] of PREFIX_RULES) {
    if (rel === o || rel.startsWith(o + "/")) return n + rel.slice(o.length);
  }

  const parts = rel.split("/");
  if (parts[0] !== "src" || parts.length < 3) return rel;
  const top = parts[1];
  const sub = parts[2];

  if (top === "core") {
    const domain = NAME_ALIAS[sub] ?? sub;
    let layer = classification.get(absPath) ?? "simulation";
    // pure barrels adopt the layer of their contents
    const info = barrelInfo(absPath);
    if (info) {
      const targets = [...info.star, ...[...info.named.values()].map((v) => v.file)];
      const layers = new Set(targets.map((t) => plannedMove(t)?.includes("/model/") ?? false));
      if (layers.size === 1 && layers.has(true)) layer = "model";
    }
    return `src/domains/${domain}/${layer}/${parts.slice(3).join("/")}`;
  }
  if (top === "services") {
    const domain = NAME_ALIAS[sub] ?? sub;
    if (MODEL_RE.test(basename(rel)))
      return `src/domains/${domain}/model/${parts.slice(3).join("/")}`;
    return `src/domains/${domain}/application/${parts.slice(3).join("/")}`;
  }
  if (top === "hooks") {
    const domain = NAME_ALIAS[sub] ?? sub;
    return `src/domains/${domain}/application/hooks/${parts.slice(3).join("/")}`;
  }
  if (top === "components") {
    if (parts.length === 3) {
      const b = basename(rel).replace(/\.(stories\.)?(tsx|ts)$/, "");
      const dom = ROOT_COMPONENT_DOMAIN[b] ?? "shell";
      return `src/domains/${dom}/ui/${basename(rel)}`;
    }
    if (sub === "NewGameWizard") return `src/domains/onboarding/ui/${parts.slice(3).join("/")}`;
    if (sub === "routes") {
      const b = basename(rel).replace(/\.(tsx|ts)$/, "");
      const dom = PAGE_DOMAIN[b] ?? "shell";
      return `src/domains/${dom}/ui/pages/${basename(rel)}`;
    }
    const domain = NAME_ALIAS[sub] ?? sub;
    // pure-logic .ts modules inside component dirs classified as model
    if (MODEL_RE.test(basename(rel)))
      return `src/domains/${domain}/model/${parts.slice(3).join("/")}`;
    return `src/domains/${domain}/ui/${parts.slice(3).join("/")}`;
  }
  return rel;
}

// ── build move map ────────────────────────────────────────────────────────────
const moveMap = new Map(); // oldAbs -> newAbs
classifyAll();
for (const f of allFiles) {
  const newRel = plannedMove(f);
  if (newRel === null) continue;
  const newAbs = join(ROOT, newRel);
  if (newAbs !== f) moveMap.set(f, newAbs);
}
{
  const byTarget = new Map();
  for (const [o, n] of moveMap) {
    if (byTarget.has(n))
      console.log(
        `!! COLLISION: ${relative(ROOT, o)} & ${relative(ROOT, byTarget.get(n))} -> ${relative(ROOT, n)}`,
      );
    else byTarget.set(n, o);
  }
}

// ── layer model for violation report ─────────────────────────────────────────
function layerOf(newRel) {
  if (newRel.startsWith("src/shared/")) return "shared";
  if (newRel.startsWith("src/platform/game")) return "platform-game";
  if (newRel.startsWith("src/platform/")) return "platform";
  if (newRel.startsWith("src/routes/")) return "routes";
  if (newRel.startsWith("src/tests/") || newRel.startsWith("src/test-utils/")) return "tests";
  const m = /^src\/domains\/[^/]+\/(model|simulation|application|ui)\//.exec(newRel);
  if (m) return m[1];
  return "other";
}

const ALL_LAYERS = [
  "shared",
  "platform",
  "platform-game",
  "model",
  "simulation",
  "application",
  "ui",
  "routes",
  "tests",
  "other",
];
const ALLOWED = {
  shared: new Set(["shared"]),
  model: new Set(["shared", "model"]),
  simulation: new Set(["shared", "model", "simulation", "platform"]),
  application: new Set([
    "shared",
    "model",
    "simulation",
    "application",
    "platform",
    "platform-game",
  ]),
  ui: new Set(["shared", "model", "platform", "platform-game", "application", "ui"]),
  platform: new Set(["shared", "model", "simulation", "application", "platform", "platform-game"]),
  "platform-game": new Set([
    "shared",
    "model",
    "simulation",
    "application",
    "platform",
    "platform-game",
  ]),
  routes: new Set(ALL_LAYERS),
  tests: new Set(ALL_LAYERS),
  other: new Set(ALL_LAYERS),
};

// dynamic `import("x")` in type position vs `await import("x")` value import
function isValueDynamic(text, specIndex) {
  const before = text.slice(Math.max(0, specIndex - 30), specIndex);
  return /await\s*$/.test(before);
}

function reportViolations() {
  const violations = [];
  for (const f of allFiles) {
    if (/\.(test|stories)\.tsx?$/.test(f)) continue;
    if (plannedMove(f) === null) continue; // file is deleted/inlined
    const fRel = "src/" + relative(SRC, moveMap.get(f) ?? f).replaceAll(sep, "/");
    const layer = layerOf(fRel);
    const text = readFileSync(f, "utf8");
    for (const s of specifiers(text)) {
      if (s.typeOnly) continue;
      if (SPLIT_FILES.has(f) && s.isExport) continue;
      if (s.dynamic && !isValueDynamic(text, s.index)) continue;
      const t = resolveSpec(s.spec, f);
      if (!t || !t.startsWith(SRC)) continue;
      // deleted/inlined modules get symbol-split or chased at rewrite time
      let target = t;
      if (DELETED.has(t) || SPLIT_FILES.has(t)) {
        const chased = uniqueBarrelTarget(barrelInfo(t));
        if (chased) target = chased;
        else continue;
      }
      const tNew = moveMap.get(target) ?? target;
      const tRel = "src/" + relative(SRC, tNew).replaceAll(sep, "/");
      const tl = layerOf(tRel);
      if (!ALLOWED[layer]?.has(tl)) {
        violations.push(
          `${layer.padEnd(14)} ${relative(ROOT, f)} -> ${tRel}${s.dynamic ? " (dynamic)" : ""}`,
        );
      }
    }
  }
  return violations;
}

// ── specifier rewriting ───────────────────────────────────────────────────────
const stripExt = (p) => p.replace(/\.(tsx?|d\.ts|json|css)$/, "").replace(/\/index$/, "");
const toAbs = (abs) =>
  "@" +
  "/" +
  relative(SRC, abs)
    .replaceAll(sep, "/")
    .replace(/\.(tsx?|d\.ts|json|css)$/, "")
    .replace(/\/index$/, "");

const IMPORT_STMT_RE =
  /(import|export)(\s+type\s+)?([^;]*?)\s+from\s+["'`]([^"'`]+)["'`]|(import)\s*\(\s*["'`]([^"'`]+)["'`]\s*\)|((?:vi|jest)\.(?:doMock|mock|unmock|hoisted)\s*\(\s*["'`]([^"'`]+)["'`])|(import)\s+["'`]([^"'`]+)["'`]/g;

const unresolvedSymbols = [];

function rewriteFile(file, text) {
  let out = "";
  let last = 0;
  let m;
  IMPORT_STMT_RE.lastIndex = 0;
  const importerNew = moveMap.get(file);
  while ((m = IMPORT_STMT_RE.exec(text))) {
    const isFromImport = m[4] !== undefined;
    const spec = m[4] ?? m[6] ?? m[8] ?? m[10];
    if (!spec) continue;
    if (!spec.startsWith("@/") && !spec.startsWith(".")) continue;
    const t = resolveSpec(spec, file);

    // inside a SPLIT file: drop re-export-from statements entirely (consumers
    // were repointed to the real owners)
    if (SPLIT_FILES.has(file) && isFromImport && m[1] === "export") {
      out += text.slice(last, m.index);
      last = m.index + m[0].length;
      continue;
    }

    // named imports of a deleted/inlined module are re-pointed to each
    // symbol's true declaring file
    if (isFromImport && t && (DELETED.has(t) || SPLIT_FILES.has(t))) {
      const clause = m[3] ?? "";
      const namedMatch = /\{([^}]*)\}/.exec(clause);
      if (!namedMatch) {
        const chased = uniqueBarrelTarget(barrelInfo(t));
        const mapped = chased && moveMap.get(chased);
        if (mapped) {
          out += text.slice(last, m.index) + m[0].replace(spec, toAbs(mapped));
          last = m.index + m[0].length;
        } else {
          unresolvedSymbols.push(`${relative(ROOT, file)}: <${clause.trim()}> (via ${spec})`);
        }
        continue;
      }
      const names = namedMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const byMod = new Map();
      const leftover = [];
      for (const raw of names) {
        const isType = /^type\s+/.test(raw);
        const segs = raw.replace(/^type\s+/, "").split(/\s+as\s+/);
        const nm = segs[0].trim();
        const binding = (segs[1] ?? segs[0]).trim();
        const r = resolveSymbol(t, nm);
        if (!r) {
          leftover.push(raw);
          unresolvedSymbols.push(`${relative(ROOT, file)}: ${nm} (via ${spec})`);
          continue;
        }
        const target = moveMap.get(r.file) ?? r.file;
        const k = toAbs(target);
        const emit =
          r.localName === binding
            ? `${isType ? "type " : ""}${r.localName}`
            : `${isType ? "type " : ""}${r.localName} as ${binding}`;
        if (!byMod.has(k)) byMod.set(k, []);
        byMod.get(k).push(emit);
      }
      const pieces = [];
      for (const [mod, list] of [...byMod.entries()].sort())
        pieces.push(`${m[1]}${m[2] ?? " "}{ ${list.join(", ")} } from "${mod}";`);
      if (leftover.length)
        pieces.push(`${m[1]}${m[2] ?? " "}{ ${leftover.join(", ")} } from "${spec}";`);
      out += text.slice(last, m.index) + pieces.join("\n");
      last = m.index + m[0].length;
      continue;
    }

    if (!t) continue;
    // deleted barrel -> chase single target, else warn (multi-target and
    // this specifier has no named imports to split)
    let target = t;
    if (DELETED.has(t)) {
      const chased = uniqueBarrelTarget(barrelInfo(t));
      if (chased) target = chased;
      else {
        unresolvedSymbols.push(
          `${relative(ROOT, file)}: <${spec}> (deleted barrel, unsplittable specifier)`,
        );
        continue;
      }
    }
    const mapped = moveMap.get(target);
    if (mapped) {
      out += text.slice(last, m.index) + m[0].replace(spec, toAbs(mapped));
      last = m.index + m[0].length;
      continue;
    }
    // target unmoved but importer moved and specifier is relative -> recompute
    if (spec.startsWith(".") && importerNew) {
      const rel = relative(dirname(importerNew), t).replaceAll(sep, "/");
      const newSpec = rel.startsWith(".") ? rel : "./" + rel;
      if (newSpec !== spec) {
        out += text.slice(last, m.index) + m[0].replace(spec, newSpec);
        last = m.index + m[0].length;
      }
    }
  }
  return out + text.slice(last);
}

// ── main ──────────────────────────────────────────────────────────────────────
const DELETED = new Set(allFiles.filter((f) => plannedMove(f) === null));
const violations = reportViolations();
console.log(`moves: ${moveMap.size}`);
console.log(`layer violations (post-move model): ${violations.length}`);
for (const v of violations.slice(0, 300)) console.log("  " + v);

const layerCount = {};
for (const [o, n] of moveMap) {
  const l = layerOf(relative(ROOT, n).replaceAll(sep, "/"));
  layerCount[l] = (layerCount[l] ?? 0) + 1;
}
console.log("moved-by-layer:", JSON.stringify(layerCount));

if (!APPLY) {
  // preview pass: exercise rewrite paths to surface unresolved symbols
  for (const f of allFiles) {
    if (!/\.tsx?$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    if (
      text.includes("@/constants") ||
      text.includes("commonFacade") ||
      text.includes("common/random")
    )
      rewriteFile(f, text);
  }
}

if (unresolvedSymbols.length) {
  console.log(`unresolved symbols: ${unresolvedSymbols.length}`);
  for (const u of unresolvedSymbols.slice(0, 50)) console.log("  " + u);
}

if (APPLY) {
  // 1. rewrite specifiers while the OLD tree still resolves imports
  const targets = walk(SRC).concat(walk(join(ROOT, "scripts")));
  let rewritten = 0;
  for (const f of targets) {
    if (!/\.tsx?$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    const out = rewriteFile(f, text);
    if (out !== text) {
      writeFileSync(f, out);
      rewritten++;
    }
  }
  console.log(`rewrote ${rewritten} files`);
  if (unresolvedSymbols.length) {
    console.log(`unresolved symbols: ${unresolvedSymbols.length}`);
    for (const u of unresolvedSymbols.slice(0, 80)) console.log("  " + u);
  }
  // 2. delete inlined barrel files (plannedMove -> null, computed pre-rewrite)
  for (const f of DELETED) {
    if (existsSync(f)) unlinkSync(f);
  }
  // 3. rename files (skip sources that vanished or already landed)
  for (const [o, n] of moveMap) {
    if (!existsSync(o)) {
      if (!existsSync(n)) console.log(`!! MISSING SOURCE+TARGET: ${relative(ROOT, o)}`);
      continue;
    }
    mkdirSync(dirname(n), { recursive: true });
    renameSync(o, n);
  }
  // 4. prune now-empty dirs (bottom-up)
  const allDirs = [];
  const collectDirs = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) {
        collectDirs(p);
        allDirs.push(p);
      }
    }
  };
  collectDirs(SRC);
  for (const d of allDirs.sort().reverse()) {
    try {
      if (readdirSync(d).length === 0) rmdirSync(d);
    } catch {}
  }
  console.log("applied.");
}
