import { generateNpcHorse as _generateNpcHorse, createHorseFromDNA } from "@/core/horse/horseFactory";
import { generateDeterministicGenotype } from "@/core/genetics/generation";
import { getTargetHorseCountForTier, mapStallionToStable } from "@/game/npcStables";
import { activeStallions2020s } from "@/core/data/pedigreeData";
import type { Horse, Stable } from "@/game/types";
import { type Rng, createRng } from "@/game/rng";
import { calculateNpcHorseValue } from "@/core/horse/pricing";

/**
 * Shim for generateNpcHorse to support both old and new signatures
 * Old: (stableId, tier, age?, gender?, hemisphere?, rng)
 * New: (stable, rng, npcAIManager?, currentDay?, opts?)
 */
export function generateNpcHorse(
  stableOrId: any,
  rngOrTier: any,
  npcAIManagerOrAge?: any,
  currentDayOrGender?: any,
  optsOrHemisphere?: any,
  rngIn?: any,
): Horse {
  if (typeof stableOrId === "string") {
    const stable = { id: stableOrId, tier: rngOrTier || "mid" } as any;
    const rng = rngIn || optsOrHemisphere || currentDayOrGender || npcAIManagerOrAge || createRng(stableOrId);
    const opts = { forcedAge: typeof npcAIManagerOrAge === "number" ? npcAIManagerOrAge : undefined };
    const h = _generateNpcHorse(stable, rng, undefined, 1, opts);
    if (typeof currentDayOrGender === "string") h.gender = currentDayOrGender as any;
    if (typeof optsOrHemisphere === "string") h.hemisphere = optsOrHemisphere as any;
    return h;
  }
  return _generateNpcHorse(stableOrId, rngOrTier, npcAIManagerOrAge, currentDayOrGender, optsOrHemisphere);
}

/**
 * Generate all NPC horses for the initial game state
 */
export function generateAllNpcHorses(
  stables: Stable[],
  rng?: Rng,
  npcAIManager?: any,
  currentDay: number = 1,
  famousStallions: Horse[] = [],
) {
  const _rng = rng || {
    next: () => Math.random(),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    range: (min: number, max: number) => Math.random() * (max - min) + min,
    pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
  } as any;
  const allHorses: Horse[] = [...famousStallions];
  const usedNames = new Set<string>(famousStallions.map(h => h.name.toLowerCase()));

  const updatedStables = stables.map((stable) => {
    const targetCount = getTargetHorseCountForTier(stable.tier, stable.isMajor, _rng);
    const existingStallions = famousStallions.filter(h => h.stableId === stable.id);
    const currentCount = existingStallions.length;
    const needed = Math.max(0, targetCount - currentCount);

    const stableHorseIds: string[] = [...existingStallions.map(h => h.id)];
    
    for (let i = 0; i < needed; i++) {
      const horse = _generateNpcHorse(stable, _rng, npcAIManager, currentDay);
      // Ensure unique name
      let name = horse.name;
      let counter = 1;
      while (usedNames.has(name.toLowerCase())) {
        name = `${horse.name} ${counter++}`;
      }
      horse.name = name;
      usedNames.add(name.toLowerCase());
      
      allHorses.push(horse);
      stableHorseIds.push(horse.id);
    }

    return {
      ...stable,
      horses: stableHorseIds,
    };
  });

  return { 
    stables: updatedStables, 
    horses: allHorses, 
    usedNames: Array.from(usedNames) 
  };
}

/**
 * Generate famous real-world stallions and assign them to NPC stables
 */
export function generateFamousStallions(stables: Stable[], rng: Rng): Horse[] {
  const horses: Horse[] = [];
  for (const pedigreeInfo of activeStallions2020s) {
    const stable = mapStallionToStable(pedigreeInfo, stables);
    const genotype = generateDeterministicGenotype(pedigreeInfo.name, "elite", rng);
    const horse = createHorseFromDNA(genotype, rng, {
      name: pedigreeInfo.name,
      age: rng.int(8, 15),
      gender: "horse",
      stableId: stable.id,
    });
    
    horse.stud = {
      standingFee: pedigreeInfo.studFee || 25000,
      seasonBookings: 0,
      maxSeasonBookings: 50,
      retired: false,
    };
    
    horses.push(horse);
  }
  return horses;
}

/**
 * Generate a set of horses for a single stable
 */
export function generateStableHorses(stable: Stable, rng?: Rng): Horse[] {
  const _rng = rng || {
    next: () => Math.random(),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    range: (min: number, max: number) => Math.random() * (max - min) + min,
    pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
  } as any;
  const count = getTargetHorseCountForTier(stable.tier, stable.isMajor, _rng);
  return Array.from({ length: count }, () => _generateNpcHorse(stable, _rng));
}

export { calculateNpcHorseValue };

/**
 * Get stud fee for a horse if eligible
 */
export function getStudFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "horse" && horse.gender !== "stallion") return 0;
  if (horse.age < 4) return 0;
  return horse.stud?.standingFee || 0;
}

/**
 * Get broodmare fee for a horse if eligible
 */
export function getBroodmareFee(horse: Horse, stable: Stable): number {
  if (horse.gender !== "mare" && horse.gender !== "filly") return 0;
  if (horse.age < 3) return 0;
  const val = calculateNpcHorseValue(horse, stable.tier);
  return Math.round(val * 0.3);
}
