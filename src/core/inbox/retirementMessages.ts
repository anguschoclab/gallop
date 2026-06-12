/**
 * core/inbox/retirementMessages.ts - Shared helpers for retirement/HOF commemorative inbox messages
 *
 * Provides top-horse detection and formatted message bodies for player retirements
 * and Hall of Fame inductions.
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import { formatCurrency } from "@/core/common/formatting";

/**
 * Returns true if a horse is considered "top" and deserves a commemorative inbox message on retirement.
 * Criteria: fame >= 60, or 1+ G1 win, or $250k+ lifetime earnings, or HOF-eligible.
 */
export function isTopHorse(horse: Horse): boolean {
  if (horse.fame >= 60) return true;
  if (horse.lifetimeEarnings >= 250_000) return true;
  const stats = getCareerStats(horse);
  if (stats.g1Wins >= 1) return true;
  return false;
}

/**
 * Returns true if a horse meets Hall of Fame eligibility criteria (fame >= 85, earnings >= $500k,
 * and 3+ G1 wins or 5+ graded wins).
 */
export function isHallOfFameEligible(horse: Horse): boolean {
  if (horse.fame < 85) return false;
  if (horse.lifetimeEarnings < 500_000) return false;
  const stats = getCareerStats(horse);
  return stats.g1Wins >= 3 || stats.gradedWins >= 5;
}

/**
 * Build a formatted body string for a retirement inbox message.
 */
export function buildRetirementBody(
  horse: Horse,
  destination: "pasture" | "stud",
  fee?: number,
): string {
  const stats = getCareerStats(horse);
  const recordParts: string[] = [];
  recordParts.push(`Career Record: ${stats.starts} starts, ${stats.wins} wins`);
  if (stats.g1Wins > 0) {
    recordParts.push(`${stats.g1Wins} G1 win${stats.g1Wins > 1 ? "s" : ""}`);
  }
  if (stats.gradedWins > stats.g1Wins) {
    recordParts.push(
      `${stats.gradedWins - stats.g1Wins} other graded win${stats.gradedWins - stats.g1Wins > 1 ? "s" : ""}`,
    );
  }
  recordParts.push(
    `Lifetime Earnings: ${formatCurrency(stats.earnings || horse.lifetimeEarnings)}`,
  );
  recordParts.push(`Fame: ${horse.fame}`);

  if (destination === "stud" && fee !== undefined) {
    recordParts.push(`Standing Fee: ${formatCurrency(fee)}`);
    return `${horse.name} has been retired to stud and is now available for breeding.\n\n${recordParts.join(" · ")}`;
  }

  return `${horse.name} has been retired to pasture after a distinguished career.\n\n${recordParts.join(" · ")}`;
}

/**
 * Build a formatted body string for a Hall of Fame induction inbox message.
 */
export function buildHallOfFameBody(horse: Horse, achievements: string[]): string {
  const stats = getCareerStats(horse);
  const parts: string[] = [];
  parts.push(`Achievements: ${achievements.join(", ")}`);
  parts.push(`Lifetime Earnings: ${formatCurrency(horse.lifetimeEarnings)}`);
  parts.push(`Career Record: ${stats.starts} starts, ${stats.wins} wins`);
  return `${horse.name} has been inducted into the Hall of Fame.\n\n${parts.join(" · ")}`;
}
