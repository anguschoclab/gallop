/**
 * careerArcTypes.ts - Career arc state type
 *
 * Tracks a horse's narrative career arc stage transitions for news generation.
 *
 * Dependencies: None
 * Related files: src/services/narrative/careerArcGenerator.ts (uses this type)
 */

export interface CareerArcState {
  horseId: string;
  stage: "none" | "rising_star" | "contender" | "champion_or_bust" | "complete";
  stage1Day?: number;
  stage2Day?: number;
  stage3Day?: number;
  consecutiveLosses: number;
}
