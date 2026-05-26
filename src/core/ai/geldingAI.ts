/**
 * geldingAI.ts - Gelding AI system
 *
 * This file provides personality-driven gelding decision logic for NPC stables.
 * Gelding improves a horse's racing consistency (reduced noise) but permanently
 * removes its breeding capability.
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { hashStr } from "@/game/rng";

export interface GeldingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
}

/**
 * Create AI state for gelding decisions.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized gelding AI state
 */
export function createGeldingAIState(stable: Stable): GeldingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
  };
}

/**
 * Determine if an NPC stable should geld a horse.
 *
 * Rules:
 * 1. Must be a male horse (colt or horse) and not already gelded.
 * 2. Must not be standing at stud (sire career has not started/active).
 * 3. Age must be between 2 and 5 (prime training/racing age).
 * 4. Horse potential must be below the stable's personality-based threshold:
 *    - Breeder: potential < 70 (strongly prefers keeping stallions intact)
 *    - Aggressive: potential < 78 (actively gelds average/above-average to win now)
 *    - Conservative: potential < 75
 *    - Budget: potential < 74
 *    - Other: potential < 75
 * 5. Deterministic daily roll (1-in-30 stagger) to distribute decisions over time.
 *
 * @param aiState - Current gelding AI state
 * @param horse - The horse to evaluate
 * @param day - Current game day
 * @returns True if the stable should geld the horse
 */
export function shouldGeldHorse(
  aiState: GeldingAIState,
  horse: Horse,
  day: number,
): boolean {
  // Must be male and not already gelded
  if (horse.gender !== "colt" && horse.gender !== "horse") return false;
  if (horse.gelded) return false;

  // Must not be standing at stud
  if (horse.stud?.atStud) return false;

  // Must be between 2 and 5 years old (prime training/racing age)
  if (horse.age < 2 || horse.age > 5) return false;

  // Determine potential threshold based on stable personality
  const personality = aiState.personalityState.personality;
  let potentialThreshold = 75;
  if (personality === "breeder") {
    potentialThreshold = 70;
  } else if (personality === "aggressive") {
    potentialThreshold = 78;
  } else if (personality === "conservative") {
    potentialThreshold = 75;
  }

  // Horse potential must be below threshold (not an elite breeding prospect)
  if (horse.potential >= potentialThreshold) return false;

  // Deterministic daily roll (approx 3.3% chance per day, once every 30 days)
  // This spaces out gelding decisions dynamically over time
  const hash = Math.abs(hashStr(horse.id + "_gelding"));
  return (hash % 30) === (day % 30);
}
