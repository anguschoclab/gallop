import type { Horse, Pregnancy, RunningStyle, Pedigree, HorseGender } from "./types";
import { inheritDNA } from "./geneticsEngine";
import { createHorseFromDNA } from "./horseGen";
import { createRng, hashStr, type Rng } from "./rng";
import {
  computeCoiFromSnapshot,
  classifyCoi,
  computeGenomeModifiers,
  computeAhc,
  resolveBloodline,
} from "@/core/breeding/populationGenetics";
import { clamp } from "./math";

export type FoalOutcome =
  | { kind: "live"; foal: Horse; transmission: boolean }
  | {
      kind: "complication";
      type:
        | "stillborn"
        | "unable to stand"
        | "early loss"
        | "mid loss"
        | "late loss"
        | "lethal recessive"
        | "FFS1 lethal"
        | "low fertility"
        | "twin reduction (single survivor)";
    };

// Mare-age complication scaling: under 14 stays at 3% baseline; older mares
// climb 1.5pp per year, capped at 25%. Mirrors real-world reproductive
// outcomes — 18yo mares are dramatically riskier than 6yo.
function complicationRate(damAge: number): number {
  return Math.min(0.25, 0.03 + Math.max(0, damAge - 14) * 0.015);
}

// True if both parents carry a recessive lethal allele on the same gene.
// Used at the day-60 checkpoint: 25% of the foals from such a pairing are
// homozygous and don't survive gestation.
function bothCarry(
  sire: Horse | undefined,
  dam: Horse | undefined,
  gene: "csnb" | "hypp" | "olws" | "ffs1",
): boolean {
  return !!(
    sire?.geneticMarkers?.lethalCarriers?.[gene] && dam?.geneticMarkers?.lethalCarriers?.[gene]
  );
}

// Build a foal's pedigree snapshot. Inherits parent pedigrees (depth-1) so
// the foal carries 3 generations: itself → parents → grandparents.
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
  dam: Horse | undefined,
): FoalOutcome {
  const rng = createRng(hashStr(pregnancy.id) ^ (pregnancy.reBreedingAttempts ?? 0));
  const damAge = dam?.age ?? 5;
  // Foaling-ease modulates term complication; lower = easier mare.
  const baseComplication = complicationRate(damAge) * (dam?.foalingEase ?? 1.0);

  // 0. Conception — combined sire & mare fertility. Mare-fertility ~ 0.7-0.99,
  //    stallion ~ 0.7-0.95. We model conception as the product of both.
  const sireFertility = sire?.fertility ?? 0.92;
  const mareFertility = dam?.fertility ?? 0.92;
  if (rng.next() > sireFertility * mareFertility) {
    return { kind: "complication", type: "low fertility" };
  }

  // 1. Twin conception — flavor only; auto-reduces but adds a small loss
  //    risk on top of the day-14 roll.
  const twins = rng.next() < 0.05;

  // Compute pedigree-aware genome modifiers up front: COI tier classifies the
  // mating, and the modifiers are reused below to bias loss rates and stat
  // adjustments. Skipped if the foal pedigree can't be built.
  const foalPedigree: Pedigree | undefined = sire && dam ? buildFoalPedigree(sire, dam) : undefined;
  const coi = foalPedigree ? computeCoiFromSnapshot(foalPedigree) : 0;
  const ahc = foalPedigree && sire && dam ? computeAhc(foalPedigree, { horses: [sire, dam] }) : 0;
  const genomeMods = computeGenomeModifiers(coi, ahc);

  // 2. Day-14 early loss — 4% baseline, mare-age scaled. Twins double the
  //    early-loss risk. FFS1 homozygous embryos are typically lost very
  //    early in gestation; both-carrier parents → much higher day-14 risk.
  const ffs1Pair = bothCarry(sire, dam, "ffs1");
  const ffs1Risk = ffs1Pair ? 0.25 * genomeMods.ffs1RiskMultiplier : 0;
  if (ffs1Pair && rng.next() < ffs1Risk) {
    return { kind: "complication", type: "FFS1 lethal" };
  }
  const earlyLoss = (twins ? 0.08 : 0.04) + Math.max(0, (damAge - 14) * 0.005);
  if (rng.next() < earlyLoss) {
    return { kind: "complication", type: "early loss" };
  }

  // 3. Day-60 lethal-recessive screen. If both parents carry the same lethal
  //    allele, 25% of conceptions are homozygous and lost.
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

  // 3c. Day-100 mid-to-late pregnancy loss — modulated by COI per the RVC
  //     research. Outcrossed pregnancies are very low-risk here; close
  //     inbreeding doubles the rate and is the main "purging event" mechanism.
  const lateLossBase = 0.015;
  const lateLoss = lateLossBase * (1 + Math.min(2, coi * 20));
  if (rng.next() < lateLoss) {
    return { kind: "complication", type: "late loss" };
  }

  // 4. Term complication — age + foaling-ease modulated.
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
    foal.pedigree = foalPedigree;
    foal.bruceLoweFamily = dam.bruceLoweFamily;
    if (dam.stableId) foal.stableId = dam.stableId;

    // --- Population-genetics modifiers applied to the foal's resolved fields ---
    foal.coefficientOfInbreeding = coi;
    foal.inbreedingTier = classifyCoi(coi);
    foal.ancestralHistoryCoefficient = ahc;
    foal.prepotency = genomeMods.prepotency;
    // Inbreeding depression: durability/consistency hit; outcross hybrid vigor
    // bumps recovery and trainability slightly. Never push below floor values.
    if (genomeMods.depressionPenalty > 0) {
      foal.injuryProneness = clamp(
        foal.injuryProneness * (1 + genomeMods.depressionPenalty),
        0,
        0.5,
      );
      foal.stats.consistency = clamp(
        Math.round(foal.stats.consistency * (1 - genomeMods.depressionPenalty * 0.3)),
        1,
        100,
      );
    }
    if (genomeMods.vigorBonus > 0) {
      foal.recoveryRate = clamp(foal.recoveryRate * (1 + genomeMods.vigorBonus), 0.5, 1.5);
      foal.trainability = clamp(foal.trainability * (1 + genomeMods.vigorBonus), 0.4, 1.5);
    }
    foal.peakAge = Math.min(8, foal.peakAge + genomeMods.longevityBonus);

    // Bloodline tag — resolve from sire's line if not set, otherwise inherit
    if (!foal.bloodline && sire) {
      foal.bloodline = resolveBloodline(sire, { horses: [sire, dam] });
    } else if (sire) {
      foal.bloodline = sire.bloodline;
    }

    // 1% covering-sickness transmission roll
    const transmission = rng.next() < 0.01;
    return { kind: "live", foal, transmission };
  }

  // Fallback if parents are missing (should not happen in normal play)
  return { kind: "complication", type: "early loss" };
}
