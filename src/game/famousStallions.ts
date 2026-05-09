import type { Horse, Stable, StableTier } from "./types";
import type { Rng } from "./rng";
import { createHorseFromDNA } from "@/core/horse/horseFactory";
import { generateResearchBasedGenotype } from "@/core/genetics/generation";
import { rollProceduralFamily } from "@/core/breeding/bruceLowe";
import { resolveBloodline } from "@/core/breeding/populationGenetics";
import { activeStallions2020s } from "@/core/data/pedigreeData";
import { mapStallionToStable } from "@/core/stable/stableQueries";

export function generateFamousStallions(stables: Stable[], rng: Rng): Horse[] {
  const famousStallions: Horse[] = [];
  const active = activeStallions2020s.filter((s) => s.currentStatus === "active");

  for (const data of active) {
    const stable = mapStallionToStable(data, stables);
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
      owned: false,
    });

    horse.sireName = data.sire;
    horse.damName = data.dam;
    horse.stableId = stable.id;
    horse.bloodline = resolveBloodline(horse, { horses: [] });
    horse.bruceLoweFamily = data.bruceLoweFamily ?? rollProceduralFamily(rng);
    horse.fame = Math.min(
      100,
      ((data.studFee ?? 0) >= 200000 ? 70 : (data.studFee ?? 0) >= 100000 ? 50 : 30) +
        (age - 4) * 2,
    );
    horse.stud = {
      atStud: true,
      standingFee: data.studFee ?? 50000,
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
