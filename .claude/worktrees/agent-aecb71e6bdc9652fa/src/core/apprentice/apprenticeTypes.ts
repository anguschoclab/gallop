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
 * Get claim allowance for number of wins
 */
export function getClaimAllowance(wins: number): number {
  if (wins < 0) return 0;
  if (wins <= 4) return CLAIM_ALLOWANCE_TABLE[wins] ?? 0;
  return 0; // No allowance after 5 wins
}

/**
 * Get apprentice status from wins
 */
export function getApprenticeStatus(wins: number): ApprenticeStatus {
  if (wins < 5) return "apprentice";
  if (wins < 50) return "journeyman";
  return "senior";
}

/**
 * Check if jockey qualifies for apprentice allowance
 */
export function qualifiesForAllowance(wins: number): boolean {
  return wins < 5;
}

/**
 * Create apprentice progression tracking
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
 * Update apprentice progression after a win
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
 * Format apprentice status for display
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
 * Get weight allowance text for display
 */
export function formatWeightAllowance(allowance: number): string {
  if (allowance === 0) return "No allowance";
  return `${allowance} lbs`;
}
