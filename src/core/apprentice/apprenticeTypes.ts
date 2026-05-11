/**
 * apprenticeTypes.ts - Jockey apprentice claim allowances system
 *
 * This file provides type definitions and functions for jockey apprentice claim allowances,
 * including status levels, claim allowance configurations, progression tracking, and
 * weight allowance calculations based on win count.
 *
 * Dependencies: None (self-contained types and functions)
 * Related files: index.ts (re-exports types and functions)
 */

// Apprentice Types - Jockey apprentice claim allowances system

/**
 * Apprentice status level
 */
export type ApprenticeStatus = "none" | "apprentice" | "journeyman" | "senior";

/**
 * Claim allowance configuration
 */
export interface ClaimAllowance {
  status: ApprenticeStatus;
  wins: number;
  allowance: number; // Weight allowance in pounds
  maxWinsBeforeGraduation: number;
}

/**
 * Apprentice progression
 */
export interface ApprenticeProgression {
  jockeyId: string;
  status: ApprenticeStatus;
  careerWins: number;
  apprenticeWins: number;
  startDate: number;
  graduationDate?: number;
}

/**
 * Claim allowance table by wins
 */
export const CLAIM_ALLOWANCE_TABLE: Record<number, number> = {
  0: 10, // 0 wins: 10 pound allowance
  1: 7, // 1 win: 7 pound allowance
  2: 5, // 2 wins: 5 pound allowance
  3: 3, // 3 wins: 3 pound allowance
  4: 1, // 4 wins: 1 pound allowance
};

/**
 * Get claim allowance for number of wins.
 *
 * Returns the weight allowance in pounds based on the apprentice's win count.
 * Allowance decreases as wins increase, ending after 5 wins.
 *
 * @param wins - Number of wins
 * @returns Weight allowance in pounds
 */
export function getClaimAllowance(wins: number): number {
  if (wins < 0) return 0;
  if (wins <= 4) return CLAIM_ALLOWANCE_TABLE[wins] ?? 0;
  return 0; // No allowance after 5 wins
}

/**
 * Get apprentice status from wins.
 *
 * Returns the apprentice status level based on total career wins.
 * Apprentice: <5 wins, Journeyman: 5-49 wins, Senior: 50+ wins.
 *
 * @param wins - Number of wins
 * @returns Apprentice status level
 */
export function getApprenticeStatus(wins: number): ApprenticeStatus {
  if (wins < 5) return "apprentice";
  if (wins < 50) return "journeyman";
  return "senior";
}

/**
 * Check if jockey qualifies for apprentice allowance.
 *
 * Returns true if the jockey has fewer than 5 wins and qualifies
 * for apprentice weight allowance.
 *
 * @param wins - Number of wins
 * @returns True if jockey qualifies for allowance
 */
export function qualifiesForAllowance(wins: number): boolean {
  return wins < 5;
}

/**
 * Create apprentice progression tracking.
 *
 * Initializes a new apprentice progression object for tracking
 * jockey development and graduation status.
 *
 * @param jockeyId - ID of the jockey
 * @param startDate - Start date of apprenticeship
 * @returns New apprentice progression object
 */
export function createApprenticeProgression(
  jockeyId: string,
  startDate: number,
): ApprenticeProgression {
  return {
    jockeyId,
    status: "apprentice",
    careerWins: 0,
    apprenticeWins: 0,
    startDate,
  };
}

/**
 * Update apprentice progression after a win.
 *
 * Updates career wins, apprentice wins (if applicable), and checks
 * for graduation to journeyman or senior status.
 *
 * @param progression - Current apprentice progression
 * @param isApprenticeRace - Whether the race was an apprentice race
 * @returns Updated apprentice progression
 */
export function updateApprenticeProgression(
  progression: ApprenticeProgression,
  isApprenticeRace: boolean,
): ApprenticeProgression {
  const newProgression = { ...progression };
  newProgression.careerWins += 1;

  if (isApprenticeRace && progression.status === "apprentice") {
    newProgression.apprenticeWins += 1;
  }

  // Check for graduation
  if (progression.status === "apprentice" && progression.apprenticeWins >= 5) {
    newProgression.status = "journeyman";
    newProgression.graduationDate = new Date().getTime();
  }

  // Check for journeyman to senior
  if (progression.status === "journeyman" && progression.careerWins >= 50) {
    newProgression.status = "senior";
  }

  return newProgression;
}

/**
 * Format apprentice status for display.
 *
 * Returns a human-readable label for the apprentice status.
 *
 * @param status - Apprentice status to format
 * @returns Formatted status label
 */
export function formatApprenticeStatus(status: ApprenticeStatus): string {
  const labels: Record<ApprenticeStatus, string> = {
    none: "Not an Apprentice",
    apprentice: "Apprentice",
    journeyman: "Journeyman",
    senior: "Senior Jockey",
  };
  return labels[status];
}

/**
 * Get weight allowance text for display.
 *
 * Returns a human-readable string for the weight allowance.
 *
 * @param allowance - Weight allowance in pounds
 * @returns Formatted allowance text
 */
export function formatWeightAllowance(allowance: number): string {
  if (allowance === 0) return "No allowance";
  return `${allowance} lbs`;
}
