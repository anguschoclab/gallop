import type { Horse, Pregnancy, RunningStyle, Pedigree, HorseGender } from "./types";
import { inheritDNA, TRAIT_VALUES } from "./geneticsEngine";
import { createHorseFromDNA } from "./horseGen";
import { createRng, hashStr, type Rng } from "./rng";

// Build a foal's pedigree snapshot from the parents at conception. We carry
// each parent's recorded pedigree forward, so a foal effectively encodes
// 3 generations: foal → parents (full Horse refs) → grandparents (Pedigree).
function buildFoalPedigree(sire: Horse, dam: Horse): Pedigree {
  return {
    sireId: sire.id,
    damId: dam.id,
    sireName: sire.name,
    damName: dam.name,
    sirePedigree: sire.pedigree,
    damPedigree: dam.pedigree,
  };
}

const STYLES: RunningStyle[] = ["E", "EP", "P", "S"];

function inheritRunningStyle(
  sire: RunningStyle | undefined,
  dam: RunningStyle | undefined,
  rng: Rng
): RunningStyle {
  // 60% chance to copy a parent (50/50 sire vs dam), 40% chance the foal
  // mutates one slot toward an adjacent style or picks fresh. This keeps
  // pedigree influence visible without locking lineages into one tactic.
  const r = rng.next();
  if (r < 0.3 && sire) return sire;
  if (r < 0.6 && dam) return dam;
  return rng.pick(STYLES);
}


function rollTrait(avg: number, rng: Rng): "excellent" | "good" | "fair" | "poor" {
  const roll = avg + rng.range(-1, 1);
  if (roll >= 3.5) return "excellent";
  if (roll >= 2.5) return "good";
  if (roll >= 1.5) return "fair";
  return "poor";
}

function inheritGeneticTrait(
  sireTrait: string | undefined,
  damTrait: string | undefined,
  rng: Rng
): "excellent" | "good" | "fair" | "poor" {
  const s = TRAIT_VALUES[sireTrait || "fair"] || 2;
  const d = TRAIT_VALUES[damTrait || "fair"] || 2;
  return rollTrait((s + d) / 2, rng);
}

export type FoalOutcome =
  | { kind: "live"; foal: Horse; transmission: boolean }
  | { kind: "complication"; type: "stillborn" | "unable to stand" | "early loss" | "mid loss" | "lethal recessive" | "twin reduction (single survivor)" };

// Mare-age complication scaling: under 14 stays at 3% baseline; older mares
// climb 1.5pp per year, capped at 25%. Mirrors real-world reproductive
// outcomes — 18yo mares are dramatically riskier than 6yo.
function complicationRate(damAge: number): number {
  return Math.min(0.25, 0.03 + Math.max(0, damAge - 14) * 0.015);
}

// True if both parents carry a recessive lethal allele on the same gene.
// Used at the day-60 checkpoint: 25% of the foals from such a pairing are
// homozygous and don't survive gestation.
function bothCarry(sire: Horse | undefined, dam: Horse | undefined, gene: "csnb" | "hypp" | "olws"): boolean {
  return !!(sire?.geneticMarkers?.lethalCarriers?.[gene] && dam?.geneticMarkers?.lethalCarriers?.[gene]);
}

// Pure (given a Pregnancy id-derived RNG) generation of one foaling outcome.
// Models four checkpoints folded into a single call (since the caller invokes
// this once at the dueDay):
//   1. Twin conception (5%) — auto-reduces to a single foal.
//   2. Day 14 early loss — base rate scaled by mare age.
//   3. Day 60 mid-gestation loss — includes lethal-recessive screen.
//   4. Term complication — stillborn / unable to stand.
// All mutations to dam/foal are returned via the foal object; the caller is
// responsible for updating dam state and persisting.
export function resolveFoaling(
  pregnancy: Pregnancy,
  sire: Horse | undefined,
  dam: Horse | undefined
): FoalOutcome {
  const rng = createRng(hashStr(pregnancy.id) ^ (pregnancy.reBreedingAttempts ?? 0));
  const damAge = dam?.age ?? 5;
  const baseComplication = complicationRate(damAge);

  // 1. Twin conception — flavor only; auto-reduces but adds a small loss
  //    risk on top of the day-14 roll.
  const twins = rng.next() < 0.05;

  // 2. Day-14 early loss — 4% baseline, mare-age scaled. Twins double the
  //    early-loss risk (mirrors real-world post-reduction loss rate).
  const earlyLoss = (twins ? 0.08 : 0.04) + Math.max(0, (damAge - 14) * 0.005);
  if (rng.next() < earlyLoss) {
    return { kind: "complication", type: "early loss" };
  }

  // 3. Day-60 lethal-recessive screen. If both parents carry the same lethal
  //    allele, 25% of conceptions are homozygous and lost. CSNB is also
  //    triggered if both parents are leopard-complex dominant (existing
  //    in-code marker).
  for (const gene of ["csnb", "hypp", "olws"] as const) {
    if (bothCarry(sire, dam, gene) && rng.next() < 0.25) {
      return { kind: "complication", type: "lethal recessive" };
    }
  }
  if (
    sire?.geneticMarkers?.leopardComplex === "dominant" &&
    dam?.geneticMarkers?.leopardComplex === "dominant" &&
    rng.next() < 0.25
  ) {
    return { kind: "complication", type: "lethal recessive" };
  }

  // 3b. Day-60 generic mid-gestation loss — 2% baseline.
  const midLoss = 0.02 + Math.max(0, (damAge - 14) * 0.005);
  if (rng.next() < midLoss) {
    return { kind: "complication", type: "mid loss" };
  }

  // 4. Term complication — original stillborn/unable-to-stand roll, now
  //    age-scaled.
  if (rng.next() < baseComplication) {
    return { kind: "complication", type: rng.next() < 0.5 ? "stillborn" : "unable to stand" };
  }

  // DNA Inheritance
  if (sire && dam) {
    const inheritedDNA = inheritDNA(sire.genotype, dam.genotype, rng);
    
    // Create foal from inherited DNA
    const foal = createHorseFromDNA(inheritedDNA, rng, {
      name: "Unnamed Foal",
      age: 0,
      hemisphere: dam.hemisphere,
      owned: dam.owned,
    });

    foal.sireName = pregnancy.sireName;
    foal.damName = pregnancy.damName;
    foal.pedigree = buildFoalPedigree(sire, dam);
    foal.bruceLoweFamily = dam.bruceLoweFamily;
    if (dam.stableId) foal.stableId = dam.stableId;

    // 1% covering-sickness transmission roll
    const transmission = rng.next() < 0.01;
    return { kind: "live", foal, transmission };
  }

  // Fallback if parents are missing (should not happen in normal play)
  return { kind: "complication", type: "early loss" };
}
