/**
 * famousStallions.ts - Famous stallion generation
 *
 * This file generates famous active stallions from real-world pedigree data,
 * mapping them to stables and assigning stud fees based on their achievements.
 *
 * Dependencies: ./types (Horse, Stable, StableTier), ./rng (Rng), @/core/horse/horseFactory (createHorseFromDNA), @/core/genetics/generation (generateResearchBasedGenotype), @/core/breeding/bruceLowe (rollProceduralFamily), @/core/breeding/populationGenetics (resolveBloodline), @/core/data/pedigreeData (activeStallions2020s), @/core/stable/stableQueries (mapStallionToStable)
 * Related files: npcStables.ts (uses famous stallions), breeding.ts (uses for breeding)
 */

import type { Horse, Stable, StableTier } from "@/platform/game/types";
import type { Rng } from "@/shared/common/rng";
import { createHorseFromDNA } from "@/domains/horse/simulation/horseFactory";
import { generateResearchBasedGenotype } from "@/domains/genetics/simulation/generation";
import { rollProceduralFamily } from "@/domains/breeding/simulation/bruceLowe";
import { resolveBloodline } from "@/domains/breeding/simulation/populationGenetics";
import { activeStallions2020s } from "@/shared/data/pedigreeData";
import { mapStallionToStable } from "@/domains/stable/simulation/stableQueries";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import { calculateRecommendedStudFee } from "@/domains/breeding/simulation/stallions";

/**
 * Generate famous active stallions from real-world pedigree data.
 *
 * Creates horse objects for famous stallions from the 2020s, mapping them to
 * stables and assigning stud fees based on their achievements. Uses research-based
 * genotype generation for realistic genetics.
 *
 * @param stables - Array of stable objects to assign stallions to
 * @param rng - Random number generator
 * @returns Array of famous stallion horse objects
 */
export function generateFamousStallions(stables: Stable[], rng: Rng): Horse[] {
  const famousStallions: Horse[] = [];
  const active = activeStallions2020s.filter((s) => s.currentStatus === "active");

  for (const data of active) {
    const stable = mapStallionToStable(data, stables, rng);
    const age = 2026 - (data.birthYear ?? 2020);
    const tier: StableTier =
      (data.studFee ?? 0) >= 100000 ? "elite" : (data.studFee ?? 0) >= 25000 ? "mid" : "budget";

    const genotype = generateResearchBasedGenotype(
      data.name,
      tier,
      data.dosageGroups,
      data.achievements,
    );
    const horse = createHorseFromDNA(genotype, rng, {
      name: data.name,
      age,
      gender: "horse",
      hemisphere: data.hemisphere ?? "Northern",
      ownership: makeNpcOwned(asNpcStableId("unowned")),
    });

    horse.sireName = data.sire || "Unknown";
    horse.damName = data.dam || "Unknown";
    horse.ownership = makeNpcOwned(asNpcStableId(stable.id as string));
    horse.bloodline = resolveBloodline(horse, new Map());
    horse.bruceLoweFamily = data.bruceLoweFamily ?? rollProceduralFamily(rng);
    horse.fame = Math.min(
      100,
      ((data.studFee ?? 0) >= 200000 ? 70 : (data.studFee ?? 0) >= 100000 ? 50 : 30) +
        (age - 4) * 2,
    );
    horse.stud = {
      atStud: true,
      // Some records carry no fee (0); price those from the horse itself
      // instead of standing a famous stallion for free.
      standingFee:
        data.studFee && data.studFee > 0
          ? data.studFee
          : calculateRecommendedStudFee(horse, stable?.tier ?? tier),
      bookSize: data.bookSize ?? 150,
      seasonBookings: 0,
      lifetimeFoals: 0,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      retiredOnDay: 1,
    };

    famousStallions.push(horse);
  }

  return famousStallions;
}
