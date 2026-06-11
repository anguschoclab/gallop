/**
 * uiTokens.ts - Single source of truth for UI color tokens
 *
 * Centralizes all color mapping logic for grades, tiers, surfaces, conditions,
 * and reputation. Components should import from here instead of defining inline
 * switch statements.
 */

import type { LetterGrade } from "@/core/horse/grading";
import type { StableTier } from "@/core/stable/types";
import type { StaffTier } from "@/core/staff/staffTypes";
import type { TrackCondition } from "@/core/race/types";
import type { ReputationTier } from "@/core/reputation/reputationTypes";

/** Race grade color class (G1, G2, G3, etc.) */
export function gradeColor(grade: string): string {
  const gradeMap: Record<string, string> = {
    G1: "text-yellow-400",
    G2: "text-orange-400",
    G3: "text-red-400",
    Listed: "text-blue-400",
    Stakes: "text-purple-400",
    Allowance: "text-green-400",
    Maiden: "text-gray-400",
    Claiming: "text-pink-400",
  };
  return gradeMap[grade] || "text-gray-400";
}

/** Horse stat letter grade color class (S, A+, A, B+, etc.) */
export function statGradeColor(grade: LetterGrade): string {
  const gradeMap: Record<LetterGrade, string> = {
    S: "text-fame font-black animate-pulse",
    "A+": "text-gold font-bold",
    A: "text-gold font-bold",
    "B+": "text-success font-medium",
    B: "text-success font-medium",
    "C+": "text-warning",
    C: "text-warning",
    D: "text-destructive/80",
    F: "text-cream/20 italic",
  };
  return gradeMap[grade] || "text-gray-400";
}

/** Stable tier color class */
export function stableTierColor(tier: StableTier): string {
  const tierMap: Record<StableTier, string> = {
    elite: "text-yellow-400",
    mid: "text-blue-400",
    budget: "text-gray-400",
  };
  return tierMap[tier] || "text-gray-400";
}

/** Staff tier color class */
export function staffTierColor(tier: StaffTier): string {
  const tierMap: Record<StaffTier, string> = {
    elite: "text-yellow-400",
    mid: "text-blue-400",
    budget: "text-gray-400",
  };
  return tierMap[tier] || "text-gray-400";
}

/** Track condition color class */
export function conditionColor(condition: TrackCondition): string {
  const conditionMap: Record<TrackCondition, string> = {
    fast: "text-green-400",
    good: "text-green-300",
    yielding: "text-yellow-400",
    soft: "text-orange-400",
    heavy: "text-red-400",
  };
  return conditionMap[condition] || "text-gray-400";
}

/** Reputation tier color class */
export function reputationColor(tier: ReputationTier): string {
  const tierMap: Record<ReputationTier, string> = {
    legendary: "text-yellow-400",
    world_class: "text-orange-400",
    international: "text-red-400",
    national: "text-green-400",
    regional: "text-blue-400",
    local: "text-gray-400",
    unknown: "text-gray-500",
  };
  return tierMap[tier] || "text-gray-400";
}
