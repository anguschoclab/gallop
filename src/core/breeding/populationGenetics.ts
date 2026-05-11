/**
 * populationGenetics.ts - Bloodline tracking, COI calculation, and genome modifiers
 *
 * This file provides population genetics calculations including bloodline resolution,
 * coefficient of inbreeding (COI), ancestral history coefficient (AHC), and genome
 * modifiers that affect foal generation based on inbreeding patterns.
 *
 * Dependencies: @/game/types (Horse, GameState, Pedigree), @/core/data/pedigreeData (findHorseByName), @/core/genetics/genotypeCache (cachedCoi, cachedBloodline)
 * Related files: horseFactory.ts (uses genome modifiers for foal generation), breedingCompatibility.ts (uses COI for compatibility)
 */

import type { Horse, GameState, Pedigree } from "@/game/types";
import { findHorseByName } from "@/core/data/pedigreeData";
import { cachedCoi, cachedBloodline } from "@/core/genetics/genotypeCache";

// ============================================================================
// Bloodline tagging — sire-line founder identification
// ============================================================================

// Real-world dominant sire lines for procedural NPC pedigrees. The set is intentionally
// comprehensive — the goal is for every horse to belong to roughly one of these tags
// so cross-tag matings are strategically meaningful.
export const KNOWN_BLOODLINES = [
  "Northern Dancer", // dominant globally, especially turf
  "Mr. Prospector", // dominant in NA dirt
  "Bold Ruler", // historical NA powerhouse (Secretariat)
  "Sadler's Wells", // European turf dominance
  "Storm Cat", // NA dirt; into Into Mischief branch
  "Sunday Silence", // Japanese powerhouse (Deep Impact)
  "Galileo", // European turf classic
  "A.P. Indy", // NA dirt classic
  "Seattle Slew", // NA dirt
  "Native Dancer", // historical
  "Danzig", // NA dirt speed line
  "Danehill", // Australian/speed line
  "Dubawi", // Modern European turf
  "Frankel", // Modern European turf superstar
  "Tapit", // Modern NA dirt
  "Into Mischief", // Modern NA dirt speed
  "Medaglia d'Oro", // Modern NA dirt
  "Unbridled's Song", // NA dirt
  "Hansel", // NA dirt
  "Liam the Map", // Modern turf influence
] as const;

export type Bloodline = (typeof KNOWN_BLOODLINES)[number] | "Unaffiliated";

// Tier — Region pairs: when a horse races in a region whose dominant sire
// line matches the horse's bloodline, it gets a small ability boost.
export const REGIONAL_LINE_BIAS: Record<
  Bloodline,
  { surface?: "Turf" | "Dirt" | "Synthetic"; boost: number }
> = {
  "Northern Dancer": { surface: "Turf", boost: 0.02 },
  "Mr. Prospector": { surface: "Dirt", boost: 0.02 },
  "Storm Cat": { surface: "Dirt", boost: 0.02 },
  "Sadler's Wells": { surface: "Turf", boost: 0.02 },
  "Sunday Silence": { surface: "Turf", boost: 0.02 },
  Galileo: { surface: "Turf", boost: 0.02 },
  "A.P. Indy": { surface: "Dirt", boost: 0.015 },
  "Seattle Slew": { surface: "Dirt", boost: 0.015 },
  "Bold Ruler": { surface: "Dirt", boost: 0.015 },
  "Native Dancer": { boost: 0.01 },
  Danzig: { surface: "Dirt", boost: 0.015 },
  Danehill: { surface: "Dirt", boost: 0.015 },
  Dubawi: { surface: "Turf", boost: 0.015 },
  Frankel: { surface: "Turf", boost: 0.02 },
  Tapit: { surface: "Dirt", boost: 0.015 },
  "Into Mischief": { surface: "Dirt", boost: 0.015 },
  "Medaglia d'Oro": { surface: "Dirt", boost: 0.015 },
  "Unbridled's Song": { surface: "Dirt", boost: 0.015 },
  Hansel: { surface: "Dirt", boost: 0.01 },
  "Liam the Map": { surface: "Turf", boost: 0.01 },
  Unaffiliated: { boost: 0 },
};

/**
 * Walk a horse's sire-line pedigree to find which bloodline it belongs to.
 *
 * Stops at the first ancestor whose name matches a known founder. Checks both
 * in-game horses via ID and curated foundation data via name chain.
 *
 * @param horse - The horse to resolve the bloodline for
 * @param horseMap - Map of horse ID to horse object for O(1) lookup
 * @param depth - Current recursion depth (for internal use)
 * @returns Bloodline name, or "Unaffiliated" if not found
 *
 * @example
 * const bloodline = resolveBloodline(horse, horseMap);
 */
export function resolveBloodline(
  horse: Horse,
<<<<<<< Updated upstream
  state: Pick<GameState, "horses"> & { horseMap?: Map<string, Horse> },
=======
  horseMap: Map<string, Horse>,
>>>>>>> Stashed changes
  depth: number = 0,
): Bloodline {
  if (depth === 0) {
    return cachedBloodline(horse.id, () => resolveBloodline(horse, horseMap, 1));
  }
  if (depth > 6) return "Unaffiliated";
  if (horse.bloodline) return horse.bloodline as Bloodline;

  // Foundation match by name on the horse itself
  for (const line of KNOWN_BLOODLINES) {
    if (horse.name === line || horse.sireName === line) return line;
  }

  // Walk up via in-game sire id
  const sireId = horse.pedigree?.sireId;
  if (sireId) {
<<<<<<< Updated upstream
    const sire = state.horseMap
      ? state.horseMap.get(sireId)
      : state.horses.find((h) => h.id === sireId);
    if (sire) return resolveBloodline(sire, state, depth + 1);
=======
    const sire = horseMap.get(sireId);
    if (sire) return resolveBloodline(sire, horseMap, depth + 1);
>>>>>>> Stashed changes
  }

  // Fall back through curated pedigree data via name chain
  let sireName: string | undefined = horse.pedigree?.sireName ?? horse.sireName;
  let safety = 0;
  while (sireName && safety++ < 6) {
    if ((KNOWN_BLOODLINES as readonly string[]).includes(sireName)) return sireName as Bloodline;
    const found = findHorseByName(sireName);
    if (!found?.sire) break;
    sireName = found.sire;
  }

  return "Unaffiliated";
}

// ============================================================================
// Coefficient of Inbreeding (COI) and inbreeding tier classification
// ============================================================================

// Compute Wright's F using the recorded pedigree IDs. Walks both sire and dam
// pedigrees to depth 8 with weighted generation contribution (near gens weighted
// more heavily), intersects the ancestor sets, and sums weight*(1/2)^(d_s+d_d+1)
// for each common ancestor. Distinct from the curated-pedigreeData version in
// breedingCompatibility — this one operates on the foal's snapshot, so it
// works for player-bred and NPC-bred lineages too.
/**
 * Compute COI from a pedigree snapshot.
 *
 * Uses Wright's coefficient of inbreeding formula to calculate the probability
 * that two alleles at a locus are identical by descent. Walks both sire and dam
 * pedigrees to depth 8 with weighted generation contribution.
 *
 * @param pedigree - The pedigree structure to analyze
 * @param maxDepth - Maximum pedigree depth to analyze (defaults to 8)
 * @returns COI value between 0 and 1
 *
 * @example
 * const coi = computeCoiFromSnapshot(horse.pedigree);
 */
export function computeCoiFromSnapshot(
  pedigree: Pedigree | undefined,
  maxDepth: number = 8,
): number {
  if (!pedigree) return 0;
  if (pedigree.sireId && pedigree.damId) {
    return cachedCoi(pedigree.sireId, pedigree.damId, () =>
      _computeCoiFromSnapshot(pedigree, maxDepth),
    );
  }
  return _computeCoiFromSnapshot(pedigree, maxDepth);
}

/**
 * Compute COI for a prospective mating between two horses.
 *
 * Creates a prospective pedigree structure and calculates the expected COI
 * for a foal from the proposed mating. Used for breeding compatibility checks.
 *
 * @param sire - The sire horse
 * @param dam - The dam horse
 * @param maxDepth - Maximum pedigree depth to analyze (defaults to 8)
 * @returns Expected COI value for the prospective foal
 *
 * @example
 * const coi = computeProspectiveCoi(sire, dam);
 */
export function computeProspectiveCoi(sire: Horse, dam: Horse, maxDepth: number = 8): number {
  const prospectivePedigree: any = {
    sireId: sire.id,
    damId: dam.id,
    sirePedigree: sire.pedigree,
    damPedigree: dam.pedigree,
  };
  return computeCoiFromSnapshot(prospectivePedigree, maxDepth);
}

function _computeCoiFromSnapshot(pedigree: Pedigree, maxDepth: number = 8): number {
  const sireDepths = new Map<string, number>();
  const damDepths = new Map<string, number>();
  walkPedigree(pedigree.sirePedigree, 1, maxDepth, sireDepths);
  walkPedigree(pedigree.damPedigree, 1, maxDepth, damDepths);
  // Include the parents themselves as depth-0 nodes (a sire bred to one of
  // his daughters: sire's id = depth 0 sire side, depth 1 dam side).
  if (pedigree.sireId) sireDepths.set(pedigree.sireId, 0);
  if (pedigree.damId) damDepths.set(pedigree.damId, 0);

  let coi = 0;
  for (const [id, ds] of sireDepths) {
    const dd = damDepths.get(id);
    if (dd === undefined) continue;
    // Weighted contribution: near generations have stronger impact
    const totalDepth = ds + dd;
    let weight = 1.0;
    if (totalDepth >= 7)
      weight = 0.25; // Distant generations (7-8)
    else if (totalDepth >= 4) weight = 0.5; // Middle generations (4-6)
    // Near generations (1-3) keep full weight (1.0)
    coi += weight * Math.pow(0.5, ds + dd + 1);
  }
  return coi;
}

function walkPedigree(
  p: Pedigree | undefined,
  depth: number,
  maxDepth: number,
  out: Map<string, number>,
) {
  if (!p || depth > maxDepth) return;
  if (p.sireId && (!out.has(p.sireId) || out.get(p.sireId)! > depth)) out.set(p.sireId, depth);
  if (p.damId && (!out.has(p.damId) || out.get(p.damId)! > depth)) out.set(p.damId, depth);
  walkPedigree(p.sirePedigree, depth + 1, maxDepth, out);
  walkPedigree(p.damPedigree, depth + 1, maxDepth, out);
}

// Classify a COI into the three breeder-recognized tiers.
// <2% → outcross (genetic diversity, hybrid vigor)
// 2-5% → linebreeding (mild duplication, balanced)
// >5% → close-inbreeding (high prepotency, depression risk)
/**
 * Classify a COI value into a breeder-recognized tier.
 *
 * Returns the inbreeding classification based on COI thresholds:
 * - <2%: outcross (genetic diversity, hybrid vigor)
 * - 2-5%: linebreeding (mild duplication, balanced)
 * - >5%: close-inbreeding (high prepotency, depression risk)
 *
 * @param coi - The COI value to classify
 * @returns Classification: "outcross", "linebreeding", or "close-inbreeding"
 *
 * @example
 * const tier = classifyCoi(0.03);
 * // Returns "linebreeding"
 */
export function classifyCoi(coi: number): "outcross" | "linebreeding" | "close-inbreeding" {
  if (coi < 0.02) return "outcross";
  if (coi < 0.05) return "linebreeding";
  return "close-inbreeding";
}

// Detect the canonical "X by Y" inbreeding pattern (e.g. 2x3, 3x3) — the
// generations at which a common ancestor appears in both sire and dam lines.
// Returns the closest pair found, or undefined if no duplication within 8 gens.
/**
 * Detect the canonical "X by Y" inbreeding pattern.
 *
 * Finds the closest common ancestor and returns the generation numbers at which
 * it appears in both sire and dam lines (e.g., 2x3 means ancestor appears at
 * generation 2 in sire line and generation 3 in dam line).
 *
 * @param pedigree - The pedigree structure to analyze
 * @returns Pattern with ancestorId, sireGen, and damGen, or undefined if no duplication
 *
 * @example
 * const pattern = detectInbreedingPattern(horse.pedigree);
 * // Returns { ancestorId: "...", sireGen: 2, damGen: 3 } for a 2x3 inbreeding
 */
export function detectInbreedingPattern(
  pedigree: Pedigree | undefined,
): { ancestorId: string; sireGen: number; damGen: number } | undefined {
  if (!pedigree) return undefined;
  const sireDepths = new Map<string, number>();
  const damDepths = new Map<string, number>();
  walkPedigree(pedigree.sirePedigree, 1, 8, sireDepths);
  walkPedigree(pedigree.damPedigree, 1, 8, damDepths);
  if (pedigree.sireId) sireDepths.set(pedigree.sireId, 0);
  if (pedigree.damId) damDepths.set(pedigree.damId, 0);

  let best: { ancestorId: string; sireGen: number; damGen: number } | undefined;
  for (const [id, ds] of sireDepths) {
    const dd = damDepths.get(id);
    if (dd === undefined) continue;
    const total = ds + dd;
    if (!best || total < best.sireGen + best.damGen) {
      best = { ancestorId: id, sireGen: ds + 1, damGen: dd + 1 };
    }
  }
  return best;
}

// ============================================================================
// Ancestral History Coefficient (AHC)
// ============================================================================

// AHC measures the *quality* of the inbreeding — whether the duplicated
// ancestors were themselves the product of successful inbreeding (i.e.
// lineages that have been "purged" of deleterious recessives). Approximated
// here as: average of all ancestors' own coefficientOfInbreeding values
// weighted by how often they appear, scaled by their racing success.
//
// Real research uses Monte-Carlo gene-dropping; we approximate cheaply by
// looking at parents' AHC and bumping it up when inbreeding survived without
// producing complications.
/**
 * Compute Ancestral History Coefficient (AHC).
 *
 * Measures the quality of inbreeding by evaluating whether duplicated ancestors
 * were themselves products of successful inbreeding (lineages "purged" of
 * deleterious recessives). Approximated using parents' AHC and racing success.
 *
 * @param pedigree - The pedigree structure to analyze
 * @param horseMap - Map of horse ID to horse object for O(1) lookup
 * @returns AHC value between 0 and 1
 *
 * @example
 * const ahc = computeAhc(horse.pedigree, horseMap);
 */
export function computeAhc(
  pedigree: Pedigree | undefined,
<<<<<<< Updated upstream
  state: Pick<GameState, "horses"> & { horseMap?: Map<string, Horse> },
): number {
  if (!pedigree) return 0;
  const sire = pedigree.sireId
    ? state.horseMap
      ? state.horseMap.get(pedigree.sireId)
      : state.horses.find((h) => h.id === pedigree.sireId)
    : undefined;
  const dam = pedigree.damId
    ? state.horseMap
      ? state.horseMap.get(pedigree.damId)
      : state.horses.find((h) => h.id === pedigree.damId)
    : undefined;
=======
  horseMap: Map<string, Horse>,
): number {
  if (!pedigree) return 0;
  const sire = pedigree.sireId ? horseMap.get(pedigree.sireId) : undefined;
  const dam = pedigree.damId ? horseMap.get(pedigree.damId) : undefined;
>>>>>>> Stashed changes
  if (!sire || !dam) return 0;

  // Parents' AHC propagates with decay; bumped by their own racing success
  // (career wins as a proxy for "this lineage produced sound runners").
  const parentAhc =
    ((sire.ancestralHistoryCoefficient ?? 0) + (dam.ancestralHistoryCoefficient ?? 0)) / 2;
  const winBonus = Math.min(0.05, (sire.careerWins + dam.careerWins) / 200);
  // If parents themselves were inbred and successful, the lineage is "proven".
  const provenSireBonus =
    (sire.coefficientOfInbreeding ?? 0) > 0.05 && sire.careerWins >= 3 ? 0.05 : 0;
  const provenDamBonus =
    (dam.coefficientOfInbreeding ?? 0) > 0.05 && dam.careerWins >= 3 ? 0.03 : 0;
  return Math.min(1, parentAhc * 0.9 + winBonus + provenSireBonus + provenDamBonus);
}

// ============================================================================
// Prepotency, depression, and heterosis modifiers applied at foal generation
// ============================================================================

// Returns multipliers applied to foal stats and ancillary fields based on
// the foal's COI and AHC. Implements the "calculated risk" tradeoff:
//   close inbreeding → prepotency (parent stats fixed) but durability/consistency hit
//   outcross → variance (less predictable) but longevity/health/trainability bonus
//   high AHC → reduces inbreeding penalty (the lineage is "proven")
export type FoalGenomeModifiers = {
  prepotency: number; // 0..1 — how much foal stats lean to parent average vs random
  depressionPenalty: number; // 0..1 — multiplier applied to durability/consistency
  vigorBonus: number; // 0..0.1 — additive to recovery and trainability
  longevityBonus: number; // 0..2 years — added to peakAge ceiling
  ffs1RiskMultiplier: number; // 1..2 — bumps if both parents carry FFS1 (handled at foaling separately)
};

/**
 * Compute genome modifiers based on COI and AHC.
 *
 * Returns modifiers applied to foal stats based on inbreeding level and
 * ancestral history. Implements the "calculated risk" tradeoff:
 * - Close inbreeding: high prepotency but depression penalty
 * - Linebreeding: moderate prepotency with small bonuses
 * - Outcross: low prepotency with vigor and longevity bonuses
 * - High AHC: reduces inbreeding penalties (lineage is "proven")
 *
 * @param coi - Coefficient of inbreeding
 * @param ahc - Ancestral history coefficient
 * @returns FoalGenomeModifiers with prepotency, penalties, and bonuses
 *
 * @example
 * const modifiers = computeGenomeModifiers(0.03, 0.5);
 */
export function computeGenomeModifiers(coi: number, ahc: number): FoalGenomeModifiers {
  const tier = classifyCoi(coi);
  // AHC reduces depression penalty by up to 50%
  const ahcRelief = ahc * 0.5;
  if (tier === "close-inbreeding") {
    const baseDepression = Math.min(0.3, (coi - 0.05) * 4); // 5% COI → 0; 12.5% COI → 0.3
    return {
      prepotency: 0.6 + Math.min(0.3, coi * 4),
      depressionPenalty: baseDepression * (1 - ahcRelief),
      vigorBonus: 0,
      longevityBonus: 0,
      ffs1RiskMultiplier: 1.5,
    };
  }
  if (tier === "linebreeding") {
    return {
      prepotency: 0.45,
      depressionPenalty: Math.max(0, (coi - 0.025) * 1.5) * (1 - ahcRelief),
      vigorBonus: 0.02,
      longevityBonus: 0.5,
      ffs1RiskMultiplier: 1.0,
    };
  }
  // Outcross: hybrid vigor
  return {
    prepotency: 0.3,
    depressionPenalty: 0,
    vigorBonus: 0.05,
    longevityBonus: 1.0,
    ffs1RiskMultiplier: 1.0,
  };
}

// Generation-pattern-aware Beyer dampener for race performance. 2x3 → ~5
// Beyer points off; 3x3 → ~2 off. Mirrors the empirical RPR study cited in
// the breeding research. Returns 0 for outcrosses.
/**
 * Calculate inbreeding performance dampener based on pattern.
 *
 * Returns Beyer point penalty based on inbreeding pattern closeness.
 * Mirrors empirical research showing that closer inbreeding patterns
 * (2x3, 3x3) correlate with reduced performance.
 *
 * @param pattern - Inbreeding pattern with sireGen and damGen
 * @returns Beyer point penalty (0 for outcrosses)
 *
 * @example
 * const penalty = inbreedingPerformanceDampener({ sireGen: 2, damGen: 3 });
 * // Returns 5 (2x3 pattern)
 */
export function inbreedingPerformanceDampener(
  pattern: { sireGen: number; damGen: number } | undefined,
): number {
  if (!pattern) return 0;
  const total = pattern.sireGen + pattern.damGen;
  if (total <= 4) return 5; // 2x2 or 2x3
  if (total <= 5) return 5; // 2x3
  if (total <= 6) return 2; // 3x3 or 2x4
  return 0;
}
