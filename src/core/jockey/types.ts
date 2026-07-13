/**
 * jockey/types.ts - Jockey types
 *
 * This file provides types for jockeys including archetypes, stats, traits,
 * silk patterns, and jockey details.
 *
 * Dependencies: None
 * Related files: proceduralNaming.ts (provides name generation)
 */

export type JockeyArchetype = "front_runner" | "closer" | "clinical" | "finisher" | "versatile";

export type JockeyStats = {
  pacing: number;
  positioning: number;
  vigor: number;
  gateSkill: number;
  temperament: number;
};

export type JockeyTrait =
  "bullring_expert" | "hill_specialist" | "long_straight_pro" | "gate_master";

export type JockeySilkPattern =
  "solid" | "stripes" | "halves" | "quarters" | "chevron" | "diamond" | "star" | "sash" | "hoops";

export type JockeySilk = {
  pattern: JockeySilkPattern;
  primary: string;
  secondary: string;
  cap: string;
};

export type Jockey = {
  id: string;
  name: string;
  age: number;
  archetype: JockeyArchetype;
  stats: JockeyStats;
  potential: number;
  traits: JockeyTrait[];
  silk: JockeySilk;
  stableId?: string;
  contractUntil?: number;
  careerStarts: number;
  careerWins: number;
  fame: number;
  ridingFee: number;
  lastRaceDay?: number;

  // Imperial Expansion: Relationships & Affinity
  affinityMap: Record<string, number>; // horseId -> XP (The Hand)
  stableAffinity: number; // 0-100, baseline bonus for any horse in the same stable (Retainers)
  isApprentice: boolean; // Academy talent
  loyalty: number; // 0-100, resistance to poaching

  // Apprentice progression tracking
  apprenticeProgression?: import("@/core/apprentice/apprenticeTypes").ApprenticeProgression;
  // Jockey suspension (stewards inquiry outcome)
  suspendedUntil?: number;
};
