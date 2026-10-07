/**
 * npcCompression.ts - Compress NPC horses to lightweight summaries for persistence.
 *
 * Instead of persisting full Horse objects for every NPC horse, we store a minimal
 * summary that captures identity (id, name, age, gender, stable) and a deterministic
 * seed. On load, the full Horse objects are regenerated from these summaries.
 */

import type {
  ActiveInjury,
  Horse,
  HorseGender,
  HorseRaceHistoryEntry,
  NpcCareerProgress,
} from "@/core/horse/types";
import type { Hemisphere } from "@/core/weather/trackClimate";
import type { Stable, StableTier } from "@/core/stable/types";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import { generateNpcHorse } from "@/core/horse/horseFactory";
import { calculateStartingFame } from "@/core/npc/horseGenHelpers";
import {
  shouldRetireAtStartup,
  calculateRecommendedStudFee,
  defaultStudParams,
} from "@/core/breeding/stallions";
import type { HorseId, NpcStableId } from "@/core/types/branded";

export interface NpcHorseSummary {
  id: HorseId;
  stableId: NpcStableId;
  name: string;
  age: number;
  gender: HorseGender;
  seed: number;
  tier: StableTier;
  isFamousStallion?: boolean;
  atStud?: boolean;
  standingFee?: number;
  retired: boolean;
  deceased: boolean;
  retiredOnDay?: number;
  fame: number;
  fanCount: number;
  lifetimeEarnings: number;
  careerStarts: number;
  careerWins: number;
  lifecycleStatus: "active" | "retired" | "deceased";
  /** Full race history — the source of truth for career stats and timelines. */
  raceHistory?: HorseRaceHistoryEntry[];
  /** Off-screen career bookkeeping — keeps cooldowns and stage across reloads. */
  careerTracker?: NpcCareerProgress;
  /** Milestone keys already announced — prevents re-announcement after reload. */
  careerMilestonesAnnounced?: string[];
  courseVisits?: Record<string, number>;
  hemisphere?: Hemisphere;
  gelded?: boolean;
  foalsProduced?: string[];
  distanceAptitude?: number;
  surfaceAptitude?: Record<"Turf" | "Dirt" | "Synthetic", number>;
  consignedSaleId?: string;
  activeInjury?: ActiveInjury;
  lastBeyer?: number;
  lastRaceDay?: number;
  /** Stud counters (only set when `atStud`). */
  seasonBookings?: number;
  lifetimeFoals?: number;
  lifetimeStakesFoals?: number;
  lifetimeG1Foals?: number;
}

/**
 * Compress NPC horses into lightweight summaries.
 *
 * Only horses that have a `stableId` (i.e. NPC-owned) are compressed.
 * Player-owned horses are persisted as full objects.
 *
 * @param stables - All NPC stables (for tier lookup)
 * @param horses - All horses in the game
 * @returns Array of NPC horse summaries
 */
export function compressNpcHorses(
  stables: Stable[],
  horses: Record<string, Horse>,
): NpcHorseSummary[] {
  const stableMap = new Map(stables.map((s) => [s.id, s]));
  const summaries: NpcHorseSummary[] = [];

  for (const horse of Object.values(horses)) {
    // Only compress NPC horses
    if (horse.ownership.type !== "npc") continue;
    const stable = stableMap.get(horse.ownership.stableId);
    if (!stable) continue;

    summaries.push({
      id: horse.id,
      stableId: horse.ownership.stableId,
      name: horse.name,
      age: horse.age,
      gender: horse.gender,
      seed: hashStr(horse.id),
      tier: stable.tier,
      isFamousStallion: horse.fame >= 80,
      atStud: horse.stud?.atStud,
      standingFee: horse.stud?.standingFee,
      retired: horse.lifecycleStatus === "retired",
      deceased: horse.lifecycleStatus === "deceased",
      retiredOnDay: horse.retiredOnDay,
      fame: horse.fame,
      fanCount: horse.fanCount,
      lifetimeEarnings: horse.lifetimeEarnings,
      careerStarts: horse.careerStarts,
      careerWins: horse.careerWins,
      lifecycleStatus: horse.lifecycleStatus,
      raceHistory: horse.raceHistory,
      careerTracker: horse.careerTracker,
      careerMilestonesAnnounced: horse.careerMilestonesAnnounced,
      courseVisits: horse.courseVisits,
      hemisphere: horse.hemisphere,
      gelded: horse.gelded,
      foalsProduced: horse.foalsProduced,
      distanceAptitude: horse.distanceAptitude,
      surfaceAptitude: horse.surfaceAptitude,
      consignedSaleId: horse.consignedSaleId,
      activeInjury: horse.activeInjury,
      lastBeyer: horse.lastBeyer,
      lastRaceDay: horse.lastRaceDay,
      seasonBookings: horse.stud?.seasonBookings,
      lifetimeFoals: horse.stud?.lifetimeFoals,
      lifetimeStakesFoals: horse.stud?.lifetimeStakesFoals,
      lifetimeG1Foals: horse.stud?.lifetimeG1Foals,
    });
  }

  return summaries;
}

/**
 * Regenerate full Horse objects from NPC summaries.
 *
 * Uses a deterministic RNG seeded from the horse ID so the same horse always
 * regenerates with the same genotype and phenotype. Identity fields (id, name,
 * age, gender) are forced from the summary to ensure stability.
 *
 * @param summaries - Array of NPC horse summaries
 * @param stables - All NPC stables (for stable reference)
 * @returns Array of regenerated Horse objects
 */
export function regenerateNpcHorses(summaries: NpcHorseSummary[], stables: Stable[]): Horse[] {
  const stableMap = new Map(stables.map((s) => [s.id, s]));
  const horses: Horse[] = [];

  for (const summary of summaries) {
    const stable = stableMap.get(summary.stableId);
    if (!stable) continue;

    // Deterministic RNG from horse ID
    const rng = createRng(summary.seed);

    const horse = generateNpcHorse(stable, rng, undefined, undefined, {
      tier: summary.tier,
      forcedAge: summary.age,
      forcedGender: summary.gender,
      forcedName: summary.name,
    });

    // Force the ID to match the summary
    horse.id = summary.id;

    // Restore career stats
    horse.fame = summary.fame;
    horse.fanCount = summary.fanCount;
    horse.lifetimeEarnings = summary.lifetimeEarnings;
    horse.careerStarts = summary.careerStarts;
    horse.careerWins = summary.careerWins;
    horse.lifecycleStatus = summary.lifecycleStatus;
    horse.retiredOnDay = summary.retiredOnDay;

    // Restore career continuity and mutable runtime state. `raceHistory` is the
    // source of truth for career stats, timelines and milestone detection;
    // `careerTracker.lastOffscreenDay` keeps the off-screen start cooldown alive
    // so a reload never produces a burst of simulated starts.
    if (summary.raceHistory) horse.raceHistory = summary.raceHistory;
    if (summary.careerTracker) horse.careerTracker = summary.careerTracker;
    if (summary.careerMilestonesAnnounced) {
      horse.careerMilestonesAnnounced = [...summary.careerMilestonesAnnounced];
    }
    if (summary.courseVisits) horse.courseVisits = summary.courseVisits;
    if (summary.hemisphere) horse.hemisphere = summary.hemisphere;
    if (summary.gelded !== undefined) horse.gelded = summary.gelded;
    if (summary.foalsProduced) horse.foalsProduced = [...summary.foalsProduced];
    if (summary.distanceAptitude !== undefined) {
      horse.distanceAptitude = summary.distanceAptitude;
    }
    if (summary.surfaceAptitude) horse.surfaceAptitude = { ...summary.surfaceAptitude };
    if (summary.consignedSaleId) horse.consignedSaleId = summary.consignedSaleId;
    if (summary.activeInjury) horse.activeInjury = { ...summary.activeInjury };
    if (summary.lastBeyer !== undefined) horse.lastBeyer = summary.lastBeyer;
    if (summary.lastRaceDay !== undefined) horse.lastRaceDay = summary.lastRaceDay;

    // Restore stud career if applicable
    if (summary.atStud) {
      const { bookSize } = defaultStudParams(stable.tier);
      horse.stud = {
        atStud: true,
        standingFee: summary.standingFee ?? calculateRecommendedStudFee(horse, stable.tier),
        bookSize,
        seasonBookings: summary.seasonBookings ?? 0,
        lifetimeFoals: summary.lifetimeFoals ?? 0,
        lifetimeStakesFoals: summary.lifetimeStakesFoals ?? 0,
        lifetimeG1Foals: summary.lifetimeG1Foals ?? 0,
        retiredOnDay: summary.retiredOnDay,
      };
    }

    // Mark deceased horses
    if (summary.deceased) {
      horse.lifecycleStatus = "deceased";
    }

    horses.push(horse);
  }

  return horses;
}

/**
 * Split horses into player-owned (full persist) and NPC-owned (summary persist).
 *
 * @param stables - All NPC stables
 * @param horses - All horses in the game
 * @returns Object with playerHorses record and npcSummaries array
 */
export function splitHorsesForPersistence(
  stables: Stable[],
  horses: Record<string, Horse>,
): { playerHorses: Record<string, Horse>; npcSummaries: NpcHorseSummary[] } {
  const playerHorses: Record<string, Horse> = {};
  const stableIds = new Set(stables.map((s) => s.id));

  for (const [id, horse] of Object.entries(horses)) {
    if (horse.ownership.type === "npc" && stableIds.has(horse.ownership.stableId)) {
      // NPC horse - skip, will be summarized
      continue;
    }
    playerHorses[id] = horse;
  }

  const npcSummaries = compressNpcHorses(stables, horses);

  return { playerHorses, npcSummaries };
}

/**
 * Merge player horses and regenerated NPC horses back into a single record.
 *
 * @param playerHorses - Player-owned horses loaded from storage
 * @param npcHorses - Regenerated NPC horses
 * @returns Combined horse record keyed by ID
 */
export function mergeHorses(
  playerHorses: Record<string, Horse>,
  npcHorses: Horse[],
): Record<string, Horse> {
  const merged: Record<string, Horse> = { ...playerHorses };
  for (const horse of npcHorses) {
    merged[horse.id] = horse;
  }
  return merged;
}
