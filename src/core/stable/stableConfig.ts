/**
 * stableConfig.ts - Stable personality configuration
 *
 * This file provides personality configurations affecting AI behavior,
 * enhanced with AI traits for learning, adaptation, and strategic planning.
 *
 * Dependencies: @/game/types (StablePersonality)
 * Related files: personalityModifiers.ts (uses config), ../ai/personalitySystem.ts (uses config)
 */

import type { StablePersonality } from "@/game/types";

/**
 * Personality configurations affecting AI behavior
 * Enhanced with AI traits for learning, adaptation, and strategic planning
 */
export const PERSONALITY_CONFIG: Record<
  StablePersonality,
  {
    description: string;
    raceEntryMod: number; // Multiplier for race entry frequency
    trainingMod: number; // Training slots used
    purseThresholdMod: number; // Purse attractiveness threshold
    gradedRaceBonus: number; // Extra appeal for graded races
    riskTolerance: number; // 0-1, affects horse selection
    youthPreference: number; // 0-1, preference for young horses (developer trait)
    geneticInsightMod: number; // 0-1, how much weight to give to hidden DNA potential
    specialistDistance?: number; // For specialist personality
    specialistSurface?: "Turf" | "Dirt" | "Synthetic";
    // AI Traits
    learningRate: number; // 0-1, how quickly NPC adapts to new information
    memoryDepth: number; // Number of past outcomes to remember
    adaptationSpeed: number; // 0-1, how quickly NPC changes strategy
    strategicHorizon: number; // Days ahead NPC plans
    competitiveAwareness: number; // 0-1, how much NPC tracks player/other NPC actions
    conservatism: number; // 0-1, tendency to stick with proven strategies
    innovation: number; // 0-1, willingness to try new approaches
    namingTheme:
      | "aggressive"
      | "conservative"
      | "developer"
      | "win-now"
      | "specialist"
      | "breeder"
      | "trader"
      | "prestige";
  }
> = {
  aggressive: {
    description: "High-risk, high-reward strategy. Enters many races and spends freely.",
    raceEntryMod: 1.5,
    trainingMod: 8,
    purseThresholdMod: 0.7,
    gradedRaceBonus: 20,
    riskTolerance: 0.8,
    youthPreference: 0.3,
    geneticInsightMod: 0.4,
    learningRate: 0.7,
    memoryDepth: 30,
    adaptationSpeed: 0.8,
    strategicHorizon: 7,
    competitiveAwareness: 0.6,
    conservatism: 0.3,
    innovation: 0.7,
    namingTheme: "aggressive",
  },
  conservative: {
    description: "Careful, methodical approach. Selective entries and cost-conscious.",
    raceEntryMod: 0.7,
    trainingMod: 4,
    purseThresholdMod: 1.3,
    gradedRaceBonus: 10,
    riskTolerance: 0.3,
    youthPreference: 0.5,
    geneticInsightMod: 0.6,
    learningRate: 0.4,
    memoryDepth: 90,
    adaptationSpeed: 0.3,
    strategicHorizon: 30,
    competitiveAwareness: 0.8,
    conservatism: 0.9,
    innovation: 0.2,
    namingTheme: "conservative",
  },
  developer: {
    description: "Focuses on young horses and long-term growth. Patient with 2-3 year olds.",
    raceEntryMod: 0.9,
    trainingMod: 6,
    purseThresholdMod: 1.0,
    gradedRaceBonus: 15,
    riskTolerance: 0.5,
    youthPreference: 0.9,
    geneticInsightMod: 0.95,
    learningRate: 0.6,
    memoryDepth: 60,
    adaptationSpeed: 0.4,
    strategicHorizon: 60,
    competitiveAwareness: 0.5,
    conservatism: 0.6,
    innovation: 0.5,
    namingTheme: "developer",
  },
  "win-now": {
    description: "Targets immediate results with proven horses. Ages 4-6 preferred.",
    raceEntryMod: 1.3,
    trainingMod: 7,
    purseThresholdMod: 0.9,
    gradedRaceBonus: 25,
    riskTolerance: 0.6,
    youthPreference: 0.1,
    geneticInsightMod: 0.1,
    learningRate: 0.5,
    memoryDepth: 20,
    adaptationSpeed: 0.6,
    strategicHorizon: 14,
    competitiveAwareness: 0.7,
    conservatism: 0.4,
    innovation: 0.4,
    namingTheme: "win-now",
  },
  specialist: {
    description: "Focuses on specific distances or surfaces. Becomes expert in niche.",
    raceEntryMod: 1.0,
    trainingMod: 6,
    purseThresholdMod: 1.1,
    gradedRaceBonus: 15,
    riskTolerance: 0.5,
    youthPreference: 0.4,
    geneticInsightMod: 0.5,
    specialistDistance: 1600, // Default, will be randomized
    specialistSurface: "Turf",
    learningRate: 0.6,
    memoryDepth: 45,
    adaptationSpeed: 0.5,
    strategicHorizon: 21,
    competitiveAwareness: 0.5,
    conservatism: 0.7,
    innovation: 0.3,
    namingTheme: "specialist",
  },
  breeder: {
    description: "Values broodmares and breeding stock. Keeps quality mares.",
    raceEntryMod: 0.8,
    trainingMod: 5,
    purseThresholdMod: 1.2,
    gradedRaceBonus: 12,
    riskTolerance: 0.4,
    youthPreference: 0.5,
    geneticInsightMod: 0.8,
    learningRate: 0.5,
    memoryDepth: 90,
    adaptationSpeed: 0.3,
    strategicHorizon: 90,
    competitiveAwareness: 0.6,
    conservatism: 0.8,
    innovation: 0.4,
    namingTheme: "breeder",
  },
  trader: {
    description: "Buys and sells frequently. Targets claiming races and bargains.",
    raceEntryMod: 1.2,
    trainingMod: 5,
    purseThresholdMod: 0.8,
    gradedRaceBonus: 5,
    riskTolerance: 0.7,
    youthPreference: 0.4,
    geneticInsightMod: 0.3,
    learningRate: 0.8,
    memoryDepth: 15,
    adaptationSpeed: 0.9,
    strategicHorizon: 7,
    competitiveAwareness: 0.9,
    conservatism: 0.2,
    innovation: 0.8,
    namingTheme: "trader",
  },
  prestige: {
    description: "Targets graded stakes and prestigious races. Reputation over profit.",
    raceEntryMod: 1.1,
    trainingMod: 7,
    purseThresholdMod: 0.6,
    gradedRaceBonus: 35,
    riskTolerance: 0.6,
    youthPreference: 0.3,
    geneticInsightMod: 0.85,
    learningRate: 0.5,
    memoryDepth: 60,
    adaptationSpeed: 0.4,
    strategicHorizon: 45,
    competitiveAwareness: 0.8,
    conservatism: 0.7,
    innovation: 0.5,
    namingTheme: "prestige",
  },
};

/**
 * Configuration for stable generation
 * Adjust these to change how many named stables spawn per tier
 * Updated to accommodate expanded stallion roster (~522 stallions) and larger stable pools
 */
export const STABLE_CONFIG = {
  elite: { count: 12, reputationRange: [90, 98] as [number, number] },
  mid: { count: 26, reputationRange: [70, 86] as [number, number] },
  budget: { count: 10, reputationRange: [50, 65] as [number, number] },
  /**
   * Regional named yards drawn from SECONDARY_POOL. Split across mid/budget
   * tiers so the world has many credible trading partners, not a few giants.
   */
  secondary: {
    count: 32,
    midShare: 0.4,
    midReputationRange: [62, 78] as [number, number],
    budgetReputationRange: [42, 62] as [number, number],
  },
  filler: { count: 80 },
};
