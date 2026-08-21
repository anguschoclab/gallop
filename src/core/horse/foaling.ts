/**
 * foaling.ts - Foaling resolution logic
 *
 * Extracted from horseFactory.ts for modularity.
 *
 * Dependencies: @/game/types (Horse, Pregnancy, GameState), @/core/common/rng (createRng, hashStr), @/core/genetics/inheritance (inheritDNA), @/core/horse/foalDevelopment (createDefaultFoalDevelopmentArc), @/core/breeding/bruceLowe (resolveBruceLoweFamily, rollProceduralFamily), @/core/breeding/populationGenetics (computeCoiFromSnapshot, computeAhc, computeGenomeModifiers), @/core/horse/naming/nameGenerator (generateProceduralHorseName, NamingContext), ./horseFactory (createHorseFromDNA, ensurePhenotypeResolved, resolvePhenotype), @/constants
 */

import type { Horse, Pregnancy, GameState } from "@/game/types";
import { createRng, hashStr } from "@/core/common/rng";
import { inheritDNA } from "@/core/genetics/inheritance";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import { rollProceduralFamily, resolveBruceLoweFamily } from "@/core/breeding/bruceLowe";
import {
  computeCoiFromSnapshot,
  computeAhc,
  computeGenomeModifiers,
} from "@/core/breeding/populationGenetics";
import {
  generateProceduralHorseName,
  type NamingContext,
} from "@/core/horse/naming/nameGenerator.ts";
import {
  FOALING_AGE_RISK_THRESHOLD,
  FOALING_AGE_RISK_MULTIPLIER,
  FOALING_BASE_COMPLICATION_RATE,
  LETHAL_RECESSIVE_CHANCE,
  TWIN_REDUCTION_CHANCE,
} from "@/constants";
import { createHorseFromDNA, ensurePhenotypeResolved, resolvePhenotype } from "./horseFactory";
import { isPlayerOwned } from "@/core/horse/ownership";

/**
 * Represents the outcome of a foaling event.
 */
export type FoalOutcome =
  | { kind: "live"; foal: Horse; transmission: boolean }
  | { kind: "complication"; type: "stillborn" | "twins" | "injury"; foal?: Horse };

/**
 * Resolves a pregnancy into a live foal or complication.
 *
 * Handles genetic inheritance from sire and dam, complication checks
 * (age-based risks, lethal recessives, rare events), and foal creation.
 * Uses a deterministic RNG seeded by the pregnancy ID.
 *
 * @param pregnancy - The pregnancy record to resolve
 * @param sire - The sire horse (must have genotype)
 * @param dam - The dam horse (must have genotype)
 * @param namingContext - Optional context for name generation
 * @param newDay - Optional game day when foaling occurs
 * @param state - Optional game state with horses for ancestor lookup
 * @returns Either a live foal or a complication
 * @throws {Error} If sire or dam is missing genotype
 */
export function resolveFoaling(
  pregnancy: Pregnancy,
  sire: Horse,
  dam: Horse,
  namingContext?: Partial<NamingContext>,
  newDay?: number,
  state?: Pick<GameState, "horses">,
): { kind: "live"; foal: Horse; transmission?: boolean } | { kind: "complication"; type: string } {
  const rng = createRng(hashStr(pregnancy.id));

  sire = ensurePhenotypeResolved(sire);
  dam = ensurePhenotypeResolved(dam);

  if (!sire.genotype || !dam.genotype) {
    throw new Error(
      `Cannot resolve foaling: missing genotype for ${!sire.genotype ? "sire" : "dam"}`,
    );
  }

  // --- Complication Checks ---
  const ageRisk = Math.max(0, (dam.age - FOALING_AGE_RISK_THRESHOLD) * FOALING_AGE_RISK_MULTIPLIER);
  const baseRoll = rng.next();
  if (baseRoll < FOALING_BASE_COMPLICATION_RATE + ageRisk) {
    const types = ["stillborn", "unable to stand", "early loss", "mid loss"];
    return { kind: "complication", type: types[Math.floor(rng.next() * types.length)] };
  }

  const sMarkers = sire.geneticMarkers?.lethalCarriers;
  const dMarkers = dam.geneticMarkers?.lethalCarriers;
  if (sMarkers && dMarkers) {
    if (
      (sMarkers.csnb && dMarkers.csnb) ||
      (sMarkers.hypp && dMarkers.hypp) ||
      (sMarkers.olws && dMarkers.olws)
    ) {
      if (rng.next() < LETHAL_RECESSIVE_CHANCE) {
        return { kind: "complication", type: "lethal recessive" };
      }
    }
  }

  if (rng.next() < TWIN_REDUCTION_CHANCE) {
    return { kind: "complication", type: "twin reduction (single survivor)" };
  }

  const genotype = inheritDNA(sire.genotype, dam.genotype, rng);

  const foal = createHorseFromDNA(genotype, rng, {
    age: 0,
    gender: rng.next() < 0.5 ? "colt" : "filly",
    owned: dam.owned,
    stableId: dam.stableId,
    createdAtDay: newDay,
  });
  foal.bredByPlayer = isPlayerOwned(dam);
  if (typeof newDay === "number") {
    foal.birthDay = newDay;
  }
  foal.developmentArc = createDefaultFoalDevelopmentArc(foal.birthDay);

  foal.pedigree = {
    horseId: foal.id,
    name: "Foal",
    generation: 0,
    sireId: sire.id,
    damId: dam.id,
    sireName: sire.name,
    damName: dam.name,
    sirePedigree: sire.pedigree,
    damPedigree: dam.pedigree,
  };

  if (state) {
    foal.bruceLoweFamily = resolveBruceLoweFamily(foal, state);
  } else {
    foal.bruceLoweFamily = dam.bruceLoweFamily ?? rollProceduralFamily(rng);
  }

  foal.name = generateProceduralHorseName(
    {
      sireName: sire.name,
      damName: dam.name,
      region: namingContext?.region,
      namingTheme: namingContext?.namingTheme,
      existingNames: namingContext?.existingNames ?? new Set(),
    },
    rng,
    { strategy: "hybrid" },
  );

  foal.pedigree.name = foal.name;

  const coi = computeCoiFromSnapshot(foal.pedigree);
  foal.coefficientOfInbreeding = coi;

  if (state) {
    const horseMap = new Map(Object.values(state.horses).map((h) => [h.id, h]));
    const ahc = computeAhc(foal.pedigree, horseMap);
    foal.ancestralHistoryCoefficient = ahc;

    const modifiers = computeGenomeModifiers(coi, ahc);
    foal.genomeModifiers = modifiers;

    if (foal.stats) {
      foal.stats.consistency = Math.max(
        1,
        Math.round(foal.stats.consistency * modifiers.depressionPenalty),
      );
    }
    if (foal.recoveryRate !== undefined) {
      foal.recoveryRate = Math.min(2.0, foal.recoveryRate + modifiers.vigorBonus);
    }
    if (foal.trainability !== undefined) {
      foal.trainability = Math.min(2.0, foal.trainability + modifiers.vigorBonus);
    }
    if (foal.peakAge !== undefined) {
      foal.peakAge = Math.round(foal.peakAge + modifiers.longevityBonus);
    }
  } else {
    foal.ancestralHistoryCoefficient = 0;
    foal.genomeModifiers = computeGenomeModifiers(coi, 0);
  }

  const resolvedFoal = resolvePhenotype(foal);

  return { kind: "live", foal: resolvedFoal };
}
