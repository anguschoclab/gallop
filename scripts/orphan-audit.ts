/**
 * scripts/orphan-audit.ts — capability and wiring audit
 *
 * Builds the capability contract graph from authoritative TypeScript unions and
 * registered runtime registries. It intentionally avoids a hardcoded intent or
 * impact list so new gameplay contracts are audited as soon as they are typed.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import * as ts from "typescript";
import { GAME_PHASE_DESCRIPTORS } from "../src/core/time/phases/descriptors";
import { GAME_PIPELINE_PHASES } from "../src/core/time/phases/index";

export interface SourceInput {
  path: string;
  text: string;
  family: "intent" | "impact";
}

export interface IntentCoverage {
  type: string;
  playerProduced: boolean;
  npcProduced: boolean;
  systemProduced: boolean;
  validated: boolean;
  resolved: boolean;
}

export interface CapabilityAuditResult {
  intents: {
    all: string[];
    byType: Record<string, IntentCoverage>;
    unproduced: string[];
    unhandled: string[];
    unvalidated: string[];
    playerOnly: string[];
    npcOnly: string[];
    systemOnly: string[];
  };
  impacts: {
    all: string[];
    handled: string[];
    unhandled: string[];
  };
  phases: {
    registered: string[];
    described: string[];
    undescribed: string[];
    unregisteredDescriptors: string[];
  };
  files: {
    sourceFileCount: number;
    routeCount: number;
    componentCount: number;
  };
  summary: {
    totalIntents: number;
    unhandledIntents: number;
    totalImpacts: number;
    unhandledImpacts: number;
    phasesRegistered: number;
  };
}

interface ContractDeclaration {
  name: string;
  kind: "interface" | "type";
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
  file: SourceInput;
}

function collectFiles(dir: string, extensions: string[], results: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".git" ||
        entry === "dist" ||
        entry === "test-results" ||
        entry === ".output"
      ) {
        continue;
      }
      collectFiles(fullPath, extensions, results);
    } else if (extensions.includes(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function sourceInputs(projectRoot: string, directory: string, family: SourceInput["family"]) {
  return collectFiles(join(projectRoot, directory), [".ts"], [])
    .filter((path) => !path.includes(".test."))
    .map((path) => ({ path: relative(projectRoot, path), text: readFileSafe(path), family }));
}

function sourceFile(input: SourceInput): ts.SourceFile {
  return ts.createSourceFile(input.path, input.text, ts.ScriptTarget.ES2022, true);
}

function literalValues(node: ts.TypeNode | undefined): string[] {
  if (!node) return [];
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    return [node.literal.text];
  }
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((part) => literalValues(part));
  }
  return [];
}

function declarationName(node: ts.Node): string | undefined {
  return (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name
    ? node.name.text
    : undefined;
}

function collectDeclarations(inputs: SourceInput[]): Map<string, ContractDeclaration[]> {
  const declarations = new Map<string, ContractDeclaration[]>();
  for (const input of inputs) {
    const parsed = sourceFile(input);
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        const name = declarationName(node);
        if (name) {
          const declaration: ContractDeclaration = {
            name,
            kind: ts.isInterfaceDeclaration(node) ? "interface" : "type",
            node,
            file: input,
          };
          declarations.set(name, [...(declarations.get(name) ?? []), declaration]);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }
  return declarations;
}

function unionMemberNames(alias: ts.TypeAliasDeclaration): string[] {
  if (!ts.isUnionTypeNode(alias.type)) return [];
  return alias.type.types
    .filter(ts.isTypeReferenceNode)
    .map((member) => member.typeName.getText(alias.getSourceFile()));
}

function typeLiteralValues(declaration: ContractDeclaration): string[] {
  if (ts.isInterfaceDeclaration(declaration.node)) {
    const discriminator = declaration.node.members.find(
      (member): member is ts.PropertySignature =>
        ts.isPropertySignature(member) && member.name.getText() === "type",
    );
    return literalValues(discriminator?.type);
  }
  return literalValues(declaration.node.type);
}

function resolveContractLiterals(
  rootName: string,
  declarations: Map<string, ContractDeclaration[]>,
  seen = new Set<string>(),
): string[] {
  if (seen.has(rootName)) return [];
  seen.add(rootName);

  const matches = declarations.get(rootName) ?? [];
  const literals: string[] = [];
  for (const declaration of matches) {
    literals.push(...typeLiteralValues(declaration));
    if (ts.isTypeAliasDeclaration(declaration.node)) {
      for (const memberName of unionMemberNames(declaration.node)) {
        literals.push(...resolveContractLiterals(memberName, declarations, seen));
      }
    }
  }
  return literals;
}

/**
 * Extract the literal values used as `type` discriminators by declarations in
 * the supplied family. For interfaces, the name or heritage clause must match
 * the family suffix so unrelated type-bearing contracts are excluded.
 */
export function extractDiscriminatedContracts(inputs: SourceInput[]): string[] {
  const family = inputs[0]?.family;
  const suffix = family === "intent" ? "Intent" : "Impact";
  const declarations = collectDeclarations(inputs);
  const rootName = `Any${suffix}`;
  const unionLiterals = resolveContractLiterals(rootName, declarations);
  if (unionLiterals.length > 0) return [...new Set(unionLiterals)].sort();

  const literals = new Set<string>();
  for (const input of inputs) {
    const parsed = sourceFile(input);
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const familyMatch = (node.heritageClauses ?? []).some((clause) =>
          clause.types.some((heritage) => heritage.expression.getText(parsed).endsWith(suffix)),
        );
        if (familyMatch) {
          for (const value of typeLiteralValues({
            name: node.name.text,
            kind: "interface",
            node,
            file: input,
          })) {
            literals.add(value);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  return [...literals].sort();
}

function collectSourceText(projectRoot: string, directories: string[]): string {
  return directories
    .flatMap((directory) => collectFiles(join(projectRoot, "src", directory), [".ts", ".tsx"]))
    .filter((path) => !path.includes(".test."))
    .map(readFileSafe)
    .join("\n");
}

function hasLiteral(text: string, value: string): boolean {
  if (text.includes(`"${value}"`) || text.includes(`'${value}'`)) return true;
  return new RegExp(`\\b${value}\\s*:`).test(text);
}

/** Compatibility view for callers that only need intent producer/resolver sets. */
export function scanIntentCoverage(srcRoot: string) {
  const audit = runCapabilityAudit(join(srcRoot, ".."));
  return {
    allIntents: audit.intents.all,
    playerGenerated: audit.intents.all.filter((type) => audit.intents.byType[type].playerProduced),
    npcGenerated: audit.intents.all.filter((type) => audit.intents.byType[type].npcProduced),
    handled: audit.intents.all.filter((type) => audit.intents.byType[type].resolved),
  };
}

/** Check selected AI functions for production callers outside their declaration. */
export function scanDormantAiFunctions(srcRoot: string) {
  const checkedFunctions = ["shouldWithdrawForTrackCondition"];
  const productionFiles = collectFiles(srcRoot, [".ts", ".tsx"]).filter(
    (path) => !path.includes(".test."),
  );
  const callers = Object.fromEntries(
    checkedFunctions.map((name) => [
      name,
      productionFiles.filter(
        (path) => !path.endsWith("withdrawalAI.ts") && readFileSafe(path).includes(name),
      ),
    ]),
  );
  return { checkedFunctions, callers };
}

/** Check every FacilityType has an outpost slot footprint. */
export function scanFacilityTypeParity(srcRoot: string) {
  const facilityPath = join(srcRoot, "core", "facilities", "facilityTypes.ts");
  const outpostPath = join(srcRoot, "core", "facilities", "outpostTypes.ts");
  const facilityText = readFileSafe(facilityPath);
  const outpostText = readFileSafe(outpostPath);
  const inputs: SourceInput[] = [{ path: facilityPath, text: facilityText, family: "impact" }];
  const declarations = collectDeclarations(inputs);
  const facilityTypes = [...new Set(resolveContractLiterals("FacilityType", declarations))].sort();
  const footprintSection = outpostText.split("SLOT_FOOTPRINTS:")[1]?.split("} as")[0] ?? "";
  const outpostFootprints = [...footprintSection.matchAll(/\b([a-z_]+)\s*:\s*\d+/g)].map(
    (match) => match[1],
  );
  const footprintSet = new Set(outpostFootprints);
  return {
    facilityTypes,
    outpostFootprints,
    missingFootprints: facilityTypes.filter((type) => !footprintSet.has(type)),
  };
}

/**
 * Build the repository capability audit from authoritative contracts and
 * production source coverage buckets.
 */
export function runCapabilityAudit(projectRoot = process.cwd()): CapabilityAuditResult {
  const resolverInputs = sourceInputs(projectRoot, join("src", "core", "resolver"), "intent");
  const declarations = collectDeclarations(resolverInputs);
  const intents = [...new Set(resolveContractLiterals("AnyIntent", declarations))].sort();

  const impactInputs = sourceInputs(
    projectRoot,
    join("src", "core", "resolver", "impacts"),
    "impact",
  );
  const impactDeclarations = collectDeclarations(impactInputs);
  const impacts = [...new Set(resolveContractLiterals("AnyImpact", impactDeclarations))].sort();

  const playerText = collectSourceText(projectRoot, [
    "components",
    "routes",
    join("game", "store"),
    "hooks",
  ]);
  const npcText = collectSourceText(projectRoot, [join("domains", "agents", "simulation")]);
  const systemText = collectSourceText(projectRoot, ["core/time/phases"]);
  const validatorText = collectSourceText(projectRoot, ["core/resolver/validators"]);
  const resolverText = collectSourceText(projectRoot, [
    "core/resolver/handlers",
    "core/time/phases",
  ]);

  const byType: Record<string, IntentCoverage> = {};
  for (const type of intents) {
    byType[type] = {
      type,
      playerProduced: hasLiteral(playerText, type),
      npcProduced: hasLiteral(npcText, type),
      systemProduced: hasLiteral(systemText, type),
      validated: hasLiteral(validatorText, type),
      resolved: hasLiteral(resolverText, type),
    };
  }

  const registered = GAME_PIPELINE_PHASES.map((phase) => phase.name);
  const described = GAME_PHASE_DESCRIPTORS.map((descriptor) => descriptor.id);
  const registeredSet = new Set(registered);
  const describedSet = new Set(described);

  const srcFiles = collectFiles(join(projectRoot, "src"), [".ts", ".tsx"]).filter(
    (path) => !path.includes(".test.") && !path.includes(join("tests", "e2e")),
  );

  return {
    intents: {
      all: intents,
      byType,
      unproduced: intents.filter(
        (type) =>
          !byType[type].playerProduced && !byType[type].npcProduced && !byType[type].systemProduced,
      ),
      unhandled: intents.filter((type) => !byType[type].resolved),
      unvalidated: intents.filter((type) => !byType[type].validated),
      playerOnly: intents.filter(
        (type) => byType[type].playerProduced && !byType[type].npcProduced,
      ),
      npcOnly: intents.filter((type) => byType[type].npcProduced && !byType[type].playerProduced),
      systemOnly: intents.filter(
        (type) =>
          byType[type].systemProduced && !byType[type].playerProduced && !byType[type].npcProduced,
      ),
    },
    impacts: {
      all: impacts,
      handled: impacts.filter((type) => hasLiteral(resolverText, type)),
      unhandled: impacts.filter((type) => !hasLiteral(resolverText, type)),
    },
    phases: {
      registered,
      described,
      undescribed: registered.filter((name) => !describedSet.has(name)),
      unregisteredDescriptors: described.filter((name) => !registeredSet.has(name)),
    },
    files: {
      sourceFileCount: srcFiles.length,
      routeCount: collectFiles(join(projectRoot, "src", "routes"), [".tsx"]).filter(
        (path) => !path.endsWith("__root.tsx"),
      ).length,
      componentCount: collectFiles(join(projectRoot, "src", "components"), [".ts", ".tsx"]).length,
    },
    summary: {
      totalIntents: intents.length,
      unhandledIntents: intents.filter((type) => !byType[type].resolved).length,
      totalImpacts: impacts.length,
      unhandledImpacts: impacts.filter((type) => !hasLiteral(resolverText, type)).length,
      phasesRegistered: registered.length,
    },
  };
}

/** Backwards-compatible alias for the older scanner name. */
export const runOrphanAudit = runCapabilityAudit;

if (import.meta.main) {
  const result = runCapabilityAudit(process.cwd());
  console.log("\n=======================================================");
  console.log("             GALLOP CAPABILITY AUDIT                    ");
  console.log("=======================================================\n");
  console.log(`Source files: ${result.files.sourceFileCount}`);
  console.log(`Routes: ${result.files.routeCount}`);
  console.log(`Components: ${result.files.componentCount}`);
  console.log(`Intent contracts: ${result.intents.all.length}`);
  console.log(`Unhandled intents: ${result.intents.unhandled.join(", ") || "none"}`);
  console.log(`Unproduced intents: ${result.intents.unproduced.join(", ") || "none"}`);
  console.log(`Impact contracts: ${result.impacts.all.length}`);
  console.log(`Unhandled impacts: ${result.impacts.unhandled.join(", ") || "none"}`);
  console.log(
    `Phases registered/described: ${result.phases.registered.length}/${result.phases.described.length}`,
  );
  console.log("=======================================================\n");
}
