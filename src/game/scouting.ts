/**
 * scouting.ts - Scouting system for fog of war
 *
 * This file provides fog of war for NPC horse stats, where famous horses are well-known
 * and obscure horses require scouting with cost calculation and accuracy variance.
 *
 * Dependencies: ./types (Horse, HorseStats, ScoutReport, Stable, Rng), @/core/horse/stats (calculateOverallRating), @/core/genetics/phenotype (resolveCoatColor)
 * Related files: store.ts (uses scouting reports), market.ts (scouting affects market visibility)
 */

// Scouting System - Fog of war for NPC horse stats
// Famous horses are well-known; obscure horses require scouting

import type { Horse, HorseStats, ScoutReport, Stable, Rng } from "./types";
import { calculateOverallRating } from "@/core/horse/stats";
import { resolveCoatColor } from "@/core/genetics/phenotype";

// Scouting costs
const SCOUT_COST_BASE = 500;
const SCOUT_COST_PER_FAME = -2; // More famous = cheaper to scout (already known)
const SCOUT_COST_PER_REPUTATION = 5; // Higher stable rep = harder to get intel

// Fame thresholds for automatic visibility
const FAME_FULL_VISIBILITY = 70; // Stats fully visible
const FAME_PARTIAL_VISIBILITY = 40; // Some stats visible

// Scouting accuracy by tier
const ACCURACY_BASE = 0.8; // 80% base accuracy
const ACCURACY_VARIANCE = 0.15; // ±15% variance

/**
 * Calculate scouting cost for a horse.
 *
 * Cost varies based on horse fame (cheaper for famous horses) and stable reputation
 * (more expensive for high-reputation stables).
 *
 * @param horse - Horse to scout
 * @param stable - Stable owning the horse
 * @returns Scouting cost in dollars
 */
export function calculateScoutCost(horse: Horse, stable: Stable): number {
  let cost = SCOUT_COST_BASE;

  // More famous horses are cheaper to scout (info already circulates)
  cost += horse.fame * SCOUT_COST_PER_FAME;

  // High-reputation stables are harder to get intel on
  cost += stable.reputation * SCOUT_COST_PER_REPUTATION;

  // Minimum cost
  return Math.max(100, Math.round(cost));
}

/**
 * Determine which stats are automatically visible based on fame.
 *
 * Returns visible stat keys based on horse fame level. Famous horses show all stats,
 * somewhat known horses show 2 random stats, unknown horses show 1 stat hint.
 *
 * @param horse - Horse to check
 * @returns Array of visible stat keys
 */
export function getVisibleStats(horse: Horse): (keyof HorseStats)[] {
  // All horses show overall rating vaguely
  const visible: (keyof HorseStats)[] = [];

  if (horse.fame >= FAME_FULL_VISIBILITY) {
    // Famous horses - all stats visible
    return ["speed", "stamina", "acceleration", "consistency"];
  }

  if (horse.fame >= FAME_PARTIAL_VISIBILITY) {
    // Somewhat known horses - 2 random stats visible
    const stats: (keyof HorseStats)[] = ["speed", "stamina", "acceleration", "consistency"];
    // Deterministic based on horse ID for consistency
    const seed = horse.id.charCodeAt(0) + horse.id.charCodeAt(1);
    const idx1 = seed % 4;
    const idx2 = (seed + 2) % 4;
    visible.push(stats[idx1]);
    if (idx2 !== idx1) visible.push(stats[idx2]);
    return visible;
  }

  // Unknown horses - only one stat hint visible
  const seed = horse.id.charCodeAt(0);
  const stat: (keyof HorseStats)[] = ["speed", "stamina", "acceleration", "consistency"];
  return [stat[seed % 4]];
}

/**
 * Generate descriptive scouting notes based on horse state and report accuracy.
 *
 * @param horse - The horse being scouted
 * @param accuracy - The accuracy of the scouting report (0-1)
 * @returns Flavortext scouting notes string
 */
function generateScoutNotes(horse: Horse, accuracy: number): string {
  const notes: string[] = [];

  // Form assessment
  if (horse.form > 5) {
    notes.push("In excellent form - looks sharp in morning works.");
  } else if (horse.form > 2) {
    notes.push("Coming into form nicely.");
  } else if (horse.form < -3) {
    notes.push("Appears to be struggling - may need a confidence boost.");
  }

  // Energy level
  if (horse.energy > 80) {
    notes.push("Fresh and well-rested - ready to run a big race.");
  } else if (horse.energy < 50) {
    notes.push("Looks a bit leg-weary - recent racing may have taken its toll.");
  }

  // Age assessment
  if (horse.age === 2) {
    notes.push("Young prospect with room to improve.");
  } else if (horse.age >= 7) {
    notes.push("Veteran campaigner with plenty of experience.");
  }

  // Fame/reputation notes
  if (horse.fame > 60) {
    notes.push("Well-known runner - scout confirms the reputation.");
  } else if (horse.fame < 20) {
    notes.push("Virtual unknown - could be a surprise packet.");
  }

  // Accuracy affects confidence
  if (accuracy > 0.9) {
    notes.push("Scout highly confident in this assessment.");
  } else if (accuracy < 0.7) {
    notes.push("Some uncertainty in this report - limited viewing opportunities.");
  }

  return notes.join(" ") || "Basic scout report - limited information available.";
}

/**
 * Perform a scouting action on a horse.
 *
 * Returns a ScoutReport with revealed stats based on accuracy. Higher accuracy
 * reveals more stats with less error. Includes genetic insight at high accuracy.
 *
 * @param horse - Horse to scout
 * @param stable - Stable owning the horse
 * @param day - Current game day
 * @param playerCash - Player's available cash
 * @param rng - Random number generator
 * @returns Scout result with success status, report, cost, and message
 */
export function scoutHorse(
  horse: Horse,
  stable: Stable,
  day: number,
  playerCash: number,
  rng: Rng,
): { success: boolean; report?: ScoutReport; cost: number; message: string } {
  const cost = calculateScoutCost(horse, stable);

  // Check if player can afford
  if (playerCash < cost) {
    return {
      success: false,
      cost: 0,
      message: `Insufficient funds. Scouting costs $${cost.toLocaleString()}.`,
    };
  }

  // Already fully scouted this day
  if (horse.lastScoutedDay === day) {
    return {
      success: false,
      cost: 0,
      message: `${horse.name} was already scouted today.`,
    };
  }

  // Calculate accuracy
  const accuracy = Math.max(
    0.5,
    Math.min(0.99, ACCURACY_BASE + (rng.next() - 0.5) * ACCURACY_VARIANCE * 2),
  );

  // Determine which stats get revealed
  // Higher accuracy = more stats revealed
  const statCount = accuracy > 0.9 ? 4 : accuracy > 0.75 ? 3 : accuracy > 0.6 ? 2 : 1;
  const stats: (keyof HorseStats)[] = ["speed", "stamina", "acceleration", "consistency"];

  // Randomly select which stats (deterministic based on horse+day for consistency)
  const seed = horse.id.charCodeAt(0) + day;
  const selectedStats: (keyof HorseStats)[] = [];
  for (let i = 0; i < statCount; i++) {
    selectedStats.push(stats[(seed + i) % 4]);
  }

  // Generate revealed stats with some error based on accuracy
  const revealedStats: Partial<HorseStats> = {};
  for (const stat of selectedStats) {
    const trueValue = horse.stats[stat];
    // Add error based on (1 - accuracy)
    const error = Math.round((1 - accuracy) * 10); // Up to ±5 stat points at low accuracy
    const direction = (seed + stat.length) % 2 === 0 ? 1 : -1;
    revealedStats[stat] = Math.max(1, Math.min(100, trueValue + error * direction));
  }

  // Genetic Insight (High-accuracy only)
  let geneticInsight: ScoutReport["geneticInsight"];
  if (accuracy > 0.85) {
    const g = horse.genotype;
    if (g) {
      const abilityMarkers: string[] = [];
      if (g.preferences) {
        if (g.preferences.climbing[0] + g.preferences.climbing[1] >= 8)
          abilityMarkers.push("Strong Climbing Marker");
        if (g.preferences.cornering[0] + g.preferences.cornering[1] >= 8)
          abilityMarkers.push("Agile Cornering Marker");
      }

      // Hidden color carrier (e.g. non-gray horse carrying gray allele)
      let hiddenColorCarrier: string | undefined;
      if (horse.coatColor !== "gray" && (g.color.gray[0] === 1 || g.color.gray[1] === 1)) {
        hiddenColorCarrier = "Gray Allele Carrier";
      }

      geneticInsight = {
        distanceMarker: `Genetic bias for ${horse.distanceAptitude}m`,
        surfaceMarker:
          Object.entries(horse.surfaceAptitude).find(([_, v]) => v === 1.0)?.[0] +
          " Affinity Marker",
        hiddenColorCarrier,
        abilityMarkers,
      };
    }
  }

  const report: ScoutReport = {
    horseId: horse.id,
    stableId: stable.id,
    day,
    accuracy,
    revealedStats,
    notes: generateScoutNotes(horse, accuracy),
    geneticInsight,
  };

  return {
    success: true,
    report,
    cost,
    message: `Scout report on ${horse.name} completed for $${cost.toLocaleString()}.`,
  };
}

/**
 * Get displayable stats for a horse (combining known info + scout reports).
 *
 * Combines auto-visible stats based on fame with recent scout reports to determine
 * what stats are visible and their confidence level. Provides overall estimate if not
 * fully known.
 *
 * @param horse - Horse to check
 * @param scoutReports - Array of scout reports
 * @param currentDay - Current game day
 * @returns Object with displayable stats, confidence level, and overall estimate
 */
export function getDisplayableStats(
  horse: Horse,
  scoutReports: ScoutReport[],
  currentDay: number,
): {
  stats: Partial<HorseStats>;
  confidence: "full" | "high" | "medium" | "low" | "unknown";
  overallEstimate?: number;
} {
  // Check for recent scout report (within last 30 days)
  const recentReport = scoutReports
    .filter((r) => r.horseId === horse.id && currentDay - r.day <= 30)
    .sort((a, b) => b.day - a.day)[0];

  // Determine confidence level
  let confidence: "full" | "high" | "medium" | "low" | "unknown";
  if (horse.fame >= FAME_FULL_VISIBILITY || recentReport?.accuracy > 0.9) {
    confidence = "full";
  } else if (horse.fame >= FAME_PARTIAL_VISIBILITY || recentReport?.accuracy > 0.75) {
    confidence = "high";
  } else if (recentReport) {
    confidence = recentReport.accuracy > 0.6 ? "medium" : "low";
  } else {
    confidence = "unknown";
  }

  // Get auto-visible stats based on fame
  const autoVisible = getVisibleStats(horse);

  // Combine auto-visible with scouted stats
  const displayStats: Partial<HorseStats> = {};

  // Add auto-visible stats (may be slightly fuzzy for low fame)
  for (const stat of autoVisible) {
    if (horse.fame >= FAME_FULL_VISIBILITY) {
      displayStats[stat] = horse.stats[stat];
    } else {
      // Low fame = fuzzy numbers (±3)
      // Deterministic fuzz based on horse ID for UI consistency
      const seed = horse.id.charCodeAt(0) + horse.id.length;
      const fuzz = (seed % 7) - 3;
      displayStats[stat] = Math.max(1, Math.min(100, horse.stats[stat] + fuzz));
    }
  }

  // Override with scout report if available
  if (recentReport) {
    Object.assign(displayStats, recentReport.revealedStats);
  }

  // Calculate overall estimate if we don't have all stats
  let overallEstimate: number | undefined;
  const statKeys = Object.keys(displayStats) as (keyof HorseStats)[];
  if (statKeys.length < 4) {
    // Estimate based on fame and what we know
    const knownAvg =
      statKeys.length > 0
        ? statKeys.reduce((sum, k) => sum + (displayStats[k] || 0), 0) / statKeys.length
        : 50;
    // Fame-adjusted estimate
    const fameAdjustment = (horse.fame - 50) / 5; // -10 to +10 based on fame
    overallEstimate = Math.round(knownAvg + fameAdjustment);
  }

  return { stats: displayStats, confidence, overallEstimate };
}

/**
 * Get scout status indicator for UI.
 *
 * Returns icon, label, color, and scout availability based on confidence level.
 *
 * @param horse - Horse to check
 * @param scoutReports - Array of scout reports
 * @param currentDay - Current game day
 * @returns Object with icon, label, color, and canScout flag
 */
export function getScoutStatus(
  horse: Horse,
  scoutReports: ScoutReport[],
  currentDay: number,
): {
  icon: string;
  label: string;
  color: string;
  canScout: boolean;
} {
  const { confidence } = getDisplayableStats(horse, scoutReports, currentDay);

  switch (confidence) {
    case "full":
      return { icon: "👁️", label: "Fully Scouted", color: "text-success", canScout: false };
    case "high":
      return { icon: "🔍", label: "Well Known", color: "text-info", canScout: true };
    case "medium":
      return { icon: "🔎", label: "Partially Known", color: "text-warning", canScout: true };
    case "low":
      return { icon: "❓", label: "Little Known", color: "text-warning", canScout: true };
    case "unknown":
      return { icon: "❓", label: "Unknown", color: "text-destructive", canScout: true };
  }
}

/**
 * Get intel summary string for a horse.
 *
 * Returns a human-readable summary of what is known about the horse.
 *
 * @param horse - Horse to check
 * @param scoutReports - Array of scout reports
 * @param currentDay - Current game day
 * @returns Intel summary string
 */
export function getIntelSummary(
  horse: Horse,
  scoutReports: ScoutReport[],
  currentDay: number,
): string {
  const { stats, confidence, overallEstimate } = getDisplayableStats(
    horse,
    scoutReports,
    currentDay,
  );

  const statCount = Object.keys(stats).length;

  if (confidence === "full") {
    const ovr = calculateOverallRating(horse);
    return `OVR ${ovr} - All stats known`;
  }

  if (statCount > 0) {
    const knownStats = Object.keys(stats).join(", ");
    return `OVR ~${overallEstimate} - ${knownStats} known (${confidence})`;
  }

  if (horse.fame > 30) {
    return `Reputation precedes them - needs scouting for details`;
  }

  return `Complete unknown - scout recommended`;
}
