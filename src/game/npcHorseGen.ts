import type { Horse, Stable, StableTier } from "./types";
import type { Rng } from "./rng";
import {
  createHorseFromDNA,
  generateNpcHorse as _generateNpcHorse,
} from "@/core/horse/horseFactory";
import { generateResearchBasedGenotype } from "@/core/genetics/generation";
import { rand } from "@/core/common/random";
import {
  shouldRetireAtStartup,
  initialStandingFee,
  defaultStudParams,
} from "@/core/breeding/stallions";
import { rollProceduralFamily } from "@/core/breeding/bruceLowe";
import { resolveBloodline } from "@/core/breeding/populationGenetics";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { activeStallions2020s } from "@/core/data/pedigreeData";
import { mapStallionToStable } from "./npcStables";

// ─── Internal helpers ─────────────────────────────────────────────────────────

type AgeCategory = "2yo" | "prime" | "veteran" | "breeding";

function rollAgeCategory(rng: Rng): AgeCategory {
  const r = rng.next();
  if (r < 0.3) return "2yo";
  if (r < 0.7) return "prime";
  if (r < 0.9) return "veteran";
  return "breeding";
}

function getAgeFromCategory(cat: AgeCategory, rng: Rng): number {
  switch (cat) {
    case "2yo":
      return 2;
    case "prime":
      return rng.next() < 0.5 ? 3 : 4;
    case "veteran":
      return rng.next() < 0.5 ? 5 : 6;
    case "breeding":
      return rand(7, 10, rng);
  }
}

function calculateStartingFame(tier: StableTier, age: number, rng: Rng): number {
  const base =
    tier === "elite" ? rand(20, 40, rng) : tier === "mid" ? rand(10, 25, rng) : rand(0, 15, rng);
  return Math.min(100, base + (age - 2) * 3);
}

// ─── Stable horse generation ──────────────────────────────────────────────────

export function generateStableHorses(
  stable: Stable,
  rng: Rng,
  usedNames: Set<string>,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
): Horse[] {
  const horses: Horse[] = [];

  let aiState = npcAIManager?.stableStates.get(stable.id);
  if (aiState && !aiState.horseGenAI) {
    aiState.horseGenAI = createHorseGenAIState(stable);
  }

  let targetCount: number;
  if (!stable.isMajor) {
    targetCount = 10;
  } else {
    switch (stable.tier) {
      case "elite":
        targetCount = rand(30, 40, rng);
        break;
      case "mid":
        targetCount = rand(20, 30, rng);
        break;
      default:
        targetCount = rand(15, 25, rng);
        break;
    }
  }

  const cats: Record<AgeCategory, number> = { "2yo": 0, prime: 0, veteran: 0, breeding: 0 };

  if (aiState?.horseGenAI) {
    for (let age = 2; age <= 10; age++) {
      if (shouldGenerateHorseOfAge(aiState.horseGenAI, age, stable)) {
        const key: AgeCategory =
          age === 2 ? "2yo" : age <= 4 ? "prime" : age <= 6 ? "veteran" : "breeding";
        cats[key]++;
      }
    }
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    if (total < targetCount) cats.prime += targetCount - total;
    else if (total > targetCount) cats.prime = Math.max(0, cats.prime - (total - targetCount));
  } else {
    cats["2yo"] = Math.floor(targetCount * 0.3);
    cats.prime = Math.floor(targetCount * 0.4);
    cats.veteran = Math.floor(targetCount * 0.2);
    cats.breeding = Math.floor(targetCount * 0.1);
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    cats.prime += targetCount - total;
  }

  for (const [cat, count] of Object.entries(cats) as [AgeCategory, number][]) {
    for (let i = 0; i < count; i++) {
      const age = getAgeFromCategory(cat, rng);
      const horse = _generateNpcHorse(stable, rng, npcAIManager, currentDay, { forcedAge: age });
      horse.fame = calculateStartingFame(stable.tier, age, rng);

      if (aiState?.horseGenAI && currentDay !== undefined) {
        recordHorseGeneration(aiState.horseGenAI, horse, stable, currentDay);
      }
      horses.push(horse);
    }
  }

  return horses;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateAllNpcHorses(
  stables: Stable[],
  rng: Rng,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  famousStallions?: Horse[],
): { stables: Stable[]; horses: Horse[]; usedNames: Set<string> } {
  const updatedStables: Stable[] = [];
  const allHorses: Horse[] = [];
  const usedNames = new Set<string>();

  const stallionsByStable = new Map<string, Horse[]>();
  if (famousStallions) {
    for (const s of famousStallions) {
      usedNames.add(s.name.toLowerCase());
      if (s.stableId) {
        if (!stallionsByStable.has(s.stableId)) stallionsByStable.set(s.stableId, []);
        stallionsByStable.get(s.stableId)!.push(s);
      }
      allHorses.push(s);
    }
  }

  for (const stable of stables) {
    const stableFamous = stallionsByStable.get(stable.id) ?? [];
    const horses = generateStableHorses(stable, rng, usedNames, npcAIManager, currentDay);
    horses.push(...stableFamous);

    for (const horse of horses) {
      if (famousStallions?.some((fs) => fs.id === horse.id)) continue;
      if (shouldRetireAtStartup(horse, stable)) {
        const { bookSize } = defaultStudParams(stable.tier);
        horse.stud = {
          atStud: true,
          standingFee: initialStandingFee(horse, stable.tier),
          bookSize,
          seasonBookings: 0,
          lifetimeFoals: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          retiredOnDay: 1,
        };
      }
    }

    updatedStables.push({ ...stable, horses: horses.map((h) => h.id) });
    allHorses.push(...horses);
  }

  return { stables: updatedStables, horses: allHorses, usedNames };
}

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

export function calculateNpcHorseValue(horse: Horse, stableTier: StableTier): number {
  const overall =
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) /
    4;
  const ageMod = horse.age <= 3 ? 1.3 : horse.age >= 7 ? 0.5 : 0.9;
  const fameMod = 1 + horse.fame / 200;
  const tierMod = stableTier === "elite" ? 1.5 : stableTier === "mid" ? 1.2 : 1.0;
  return Math.round((overall * 100 * ageMod * fameMod * tierMod) / 100) * 100;
}

export function getStudFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "horse" && horse.gender !== "colt") return 0;
  if (horse.age < 4) return 0;
  return calculateNpcHorseValue(horse, stable.tier);
}

export function getBroodmareFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "mare" && horse.gender !== "filly") return 0;
  if (horse.age < 3) return 0;
  return Math.round(calculateNpcHorseValue(horse, stable.tier) * 0.3);
}
