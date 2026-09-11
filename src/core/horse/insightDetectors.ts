/**
 * insightDetectors.ts - Individual insight detectors for getHorseInsight
 *
 * Each detector is a small pure function that checks a specific condition
 * and returns a HorseInsight or null. Detectors are registered in priority
 * order in the INSIGHT_DETECTORS array. The coordinator (getHorseInsight)
 * iterates the array and returns the first non-null result.
 *
 * Dependencies: @/core/horse/types (Horse), @/core/horse/insights (HorseInsight)
 * Related files: src/core/horse/insights.ts (coordinator)
 */

import type { Horse } from "./types";
import type { HorseInsight } from "./insights";

export type InsightDetector = (horse: Horse) => HorseInsight | null;

// 1. Check for win streak (Red Hot)
export const detectWinStreak: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let currentWinStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].position === 1) currentWinStreak++;
    else break;
  }
  if (currentWinStreak >= 3) {
    return {
      label: "Red Hot",
      value: `${currentWinStreak} Race Win Streak`,
      context: "Currently on an active winning streak",
      type: "positive",
    };
  }
  return null;
};

// 1.1 Check for Bridesmaid (2nd place streak)
export const detectBridesmaid: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let currentPlaceStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].position === 2) currentPlaceStreak++;
    else break;
  }
  if (currentPlaceStreak >= 3) {
    return {
      label: "Bridesmaid",
      value: `${currentPlaceStreak} Consecutive 2nd Place Finishes`,
      context: "Consistently close but struggling to break through for a win",
      type: "neutral",
    };
  }
  return null;
};

// 1.25 Check for Model of Consistency (80%+ top-3 finish rate, min 5 starts)
export const detectConsistency: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const starts = history.length;
  if (starts < 5) return null;
  let top3Count = 0;
  for (const race of history) {
    if (race.position >= 1 && race.position <= 3) top3Count++;
  }
  const rate = top3Count / starts;
  if (rate >= 0.8) {
    return {
      label: "Model of Consistency",
      value: `${Math.round(rate * 100)}% In The Money`,
      context: `Finished top 3 in ${top3Count} of ${starts} career starts`,
      type: "positive",
    };
  }
  return null;
};

// 1.55 Check for Bounce Candidate (last race beyer >= 8 points higher than best previous)
export const detectBounceCandidate: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  if (history.length < 3) return null;
  const chronological = [...history].sort((a, b) => a.day - b.day);
  const lastRace = chronological[chronological.length - 1];
  if (typeof lastRace.beyer !== "number") return null;
  let maxPreviousBeyer = -1;
  for (let i = 0; i < chronological.length - 1; i++) {
    const race = chronological[i];
    if (typeof race.beyer === "number" && race.beyer > maxPreviousBeyer) {
      maxPreviousBeyer = race.beyer;
    }
  }
  if (maxPreviousBeyer > 0 && lastRace.beyer >= maxPreviousBeyer + 8) {
    return {
      label: "Regression Risk",
      value: "Bounce Candidate",
      context: `Ran a massive new top Beyer (${lastRace.beyer}, +${lastRace.beyer - maxPreviousBeyer} pts) last time out and may regress`,
      type: "negative",
    };
  }
  return null;
};

// 1.5 Check for Improving Form (trending up in last 3 starts)
export const detectImprovingForm: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const recentBeyers = history
    .slice(-3)
    .map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");
  if (recentBeyers.length !== 3) return null;
  if (recentBeyers[2] > recentBeyers[1] && recentBeyers[1] > recentBeyers[0]) {
    const improvement = recentBeyers[2] - recentBeyers[0];
    if (improvement >= 5) {
      return {
        label: "Trending Up",
        value: "Improving Form",
        context: `Beyer figures have increased consistently over last 3 starts (+${improvement} pts)`,
        type: "positive",
      };
    }
  }
  return null;
};

// 1.6 Check for Stakes Performance (Big Stage Performer / Stage Fright)
export const detectStakesPerformance: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let gradedRuns = 0;
  let gradedBeyerTotal = 0;
  let regularRuns = 0;
  let regularBeyerTotal = 0;
  for (const race of history) {
    if (typeof race.beyer !== "number") continue;
    if (race.grade && ["G1", "G2", "G3"].includes(race.grade)) {
      gradedRuns++;
      gradedBeyerTotal += race.beyer;
    } else {
      regularRuns++;
      regularBeyerTotal += race.beyer;
    }
  }
  if (gradedRuns < 2 || regularRuns < 3) return null;
  const gradedAvg = gradedBeyerTotal / gradedRuns;
  const regularAvg = regularBeyerTotal / regularRuns;
  if (gradedAvg >= regularAvg + 5) {
    return {
      label: "Big Stage Performer",
      value: "Elevates in Stakes Races",
      context: `Averages a ${Math.round(gradedAvg)} Beyer in Graded company vs ${Math.round(regularAvg)} in standard races`,
      type: "positive",
    };
  }
  if (regularAvg >= gradedAvg + 8) {
    return {
      label: "Stage Fright",
      value: "Underperforms in Stakes",
      context: `Averages only ${Math.round(gradedAvg)} Beyer in Graded company vs ${Math.round(regularAvg)} in standard races`,
      type: "negative",
    };
  }
  return null;
};

// 1.7 Check for Freshness / Layoff performance
export const detectFreshness: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const chronological = [...history].sort((a, b) => a.day - b.day);
  let freshRuns = 0;
  let freshBeyerTotal = 0;
  let activeRuns = 0;
  let activeBeyerTotal = 0;
  for (let i = 0; i < chronological.length; i++) {
    const race = chronological[i];
    if (typeof race.beyer !== "number") continue;
    let daysSinceLast = 90;
    if (i > 0) {
      daysSinceLast = race.day - chronological[i - 1].day;
    }
    if (daysSinceLast >= 60) {
      freshRuns++;
      freshBeyerTotal += race.beyer;
    } else {
      activeRuns++;
      activeBeyerTotal += race.beyer;
    }
  }
  if (freshRuns < 2 || activeRuns < 3) return null;
  const freshAvg = freshBeyerTotal / freshRuns;
  const activeAvg = activeBeyerTotal / activeRuns;
  if (freshAvg >= activeAvg + 8) {
    return {
      label: "Fires Fresh",
      value: "Excels off a Layoff",
      context: `Averages an ${Math.round(freshAvg)} Beyer off a 60+ day break vs ${Math.round(activeAvg)} when racing actively`,
      type: "positive",
    };
  }
  if (activeAvg >= freshAvg + 8) {
    return {
      label: "Needs Racing",
      value: "Improves with Activity",
      context: `Averages an ${Math.round(activeAvg)} Beyer when active vs ${Math.round(freshAvg)} off a layoff`,
      type: "neutral",
    };
  }
  return null;
};

// 1.8 Check for Play Style Success (Tactical Versatility / Catch Me If You Can)
export const detectPlayStyle: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let wireToWireWins = 0;
  let closerWins = 0;
  for (const race of history) {
    if (race.position === 1 && race.pacePositions && race.pacePositions.length > 0) {
      const isWireToWire = race.pacePositions.every((p) => p === 1);
      if (isWireToWire) wireToWireWins++;
      const fSize = race.fieldSize ?? 8;
      const firstCall = race.pacePositions[0];
      if (firstCall > Math.max(4, fSize / 2)) closerWins++;
    }
  }
  if (wireToWireWins >= 1 && closerWins >= 1) {
    return {
      label: "Tactical Versatility",
      value: "Can Win from Anywhere",
      context: `Has demonstrated the ability to win both wire-to-wire and from off the pace`,
      type: "positive",
    };
  }
  if (wireToWireWins >= 2) {
    return {
      label: "Catch Me If You Can",
      value: "Wire-to-Wire Winner",
      context: `Has led from start to finish in ${wireToWireWins} career wins`,
      type: "positive",
    };
  }
  return null;
};

// 1.9 Check for Closing Kick (absolute positions passed from first call)
export const detectClosingKick: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let maxPositionsPassed = 0;
  for (const race of history) {
    if (race.position === 1 && race.pacePositions && race.pacePositions.length > 0) {
      const firstCall = race.pacePositions[0];
      const positionsPassed = firstCall - 1;
      if (positionsPassed >= 6 && positionsPassed > maxPositionsPassed) {
        maxPositionsPassed = positionsPassed;
      }
    }
  }
  if (maxPositionsPassed >= 6) {
    return {
      label: "Closing Kick",
      value: "Deep Closer",
      context: `Has won a race after passing ${maxPositionsPassed} horses from the first call`,
      type: "positive",
    };
  }
  return null;
};

// 1.91 Check for Late Bloomer (firstCall > max(5, fieldSize * 0.65), fieldSize >= 6, min 2 such wins)
export const detectLateBloomer: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let lateBloomerWins = 0;
  for (const race of history) {
    if (
      race.position === 1 &&
      race.pacePositions &&
      race.pacePositions.length > 0 &&
      race.fieldSize &&
      race.fieldSize >= 6
    ) {
      const firstCall = race.pacePositions[0];
      const isOffPace = firstCall > Math.max(5, race.fieldSize * 0.65);
      if (isOffPace) lateBloomerWins++;
    }
  }
  if (lateBloomerWins >= 2) {
    return {
      label: "Late Bloomer",
      value: "Off-the-Pace Winner",
      context: `Has won from the back of the pack in ${lateBloomerWins} career races`,
      type: "positive",
    };
  }
  return null;
};

// 1.92 Check for From the Clouds (firstCall > ceil(fieldSize/2), min 2 such wins)
export const detectFromTheClouds: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let closingWins = 0;
  for (const race of history) {
    if (
      race.position === 1 &&
      race.pacePositions &&
      race.pacePositions.length > 0 &&
      race.fieldSize != null &&
      race.fieldSize >= 4
    ) {
      const firstCall = race.pacePositions[0];
      if (firstCall > Math.ceil(race.fieldSize / 2)) closingWins++;
    }
  }
  if (closingWins >= 2) {
    return {
      label: "From the Clouds",
      value: "Deep Closing Winner",
      context: `Has rallied from the back half of the pack to win ${closingWins} career races`,
      type: "positive",
    };
  }
  return null;
};

// 1.925 Check for Late Charge (closerWins from wire-to-wire section, looser threshold)
export const detectLateCharge: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let closerWins = 0;
  for (const race of history) {
    if (race.position === 1 && race.pacePositions && race.pacePositions.length > 0) {
      const fSize = race.fieldSize ?? 8;
      const firstCall = race.pacePositions[0];
      if (firstCall > Math.max(4, fSize / 2)) closerWins++;
    }
  }
  if (closerWins >= 2) {
    return {
      label: "Late Charge",
      value: "Off-the-Pace Winner",
      context: `Has won ${closerWins} races when coming from the back half of the field`,
      type: "positive",
    };
  }
  return null;
};

// 1.93 Check for Surface Versatility (wins on 2+ surfaces)
export const detectSurfaceVersatility: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const winningSurfaces = new Set<string>();
  for (const race of history) {
    if (race.position === 1 && race.surface) {
      winningSurfaces.add(race.surface);
    }
  }
  if (winningSurfaces.size < 2) return null;
  const surfacesArray = Array.from(winningSurfaces);
  if (surfacesArray.length >= 3) {
    return {
      label: "All-Surface Master",
      value: "Triple-Surface Winner",
      context: "Has recorded victories on Turf, Dirt, and Synthetic",
      type: "positive",
    };
  }
  return {
    label: "Dual-Surface Threat",
    value: "Multi-Surface Winner",
    context: `Has recorded victories on both ${surfacesArray[0]} and ${surfacesArray[1]}`,
    type: "positive",
  };
};

// 2. Check for distance sweet spot (best average beyer by distance, min 3 races)
export const detectDistanceSpecialist: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const distanceStats = new Map<number, { runs: number; totalBeyer: number; wins: number }>();
  for (const race of history) {
    if (race.distance != null && typeof race.beyer === "number") {
      const stats = distanceStats.get(race.distance) || { runs: 0, totalBeyer: 0, wins: 0 };
      stats.runs++;
      stats.totalBeyer += race.beyer;
      if (race.position === 1) stats.wins++;
      distanceStats.set(race.distance, stats);
    }
  }
  let bestDistance: number | null = null;
  let bestAvgBeyer = 0;
  let bestDistanceRuns = 0;
  for (const [distance, stats] of distanceStats.entries()) {
    if (stats.runs >= 3) {
      const avg = stats.totalBeyer / stats.runs;
      if (avg > bestAvgBeyer) {
        bestAvgBeyer = avg;
        bestDistance = distance;
        bestDistanceRuns = stats.runs;
      }
    }
  }
  if (bestDistance !== null && bestAvgBeyer > 0) {
    return {
      label: "Distance Specialist",
      value: `${bestDistance}m`,
      context: `Best performance average (Beyer ${Math.round(bestAvgBeyer)}) across ${bestDistanceRuns} starts`,
      type: "positive",
    };
  }
  return null;
};

// 3. Surface Affinity
export const detectSurfaceAffinity: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  const surfaceStats = new Map<string, { runs: number; totalBeyer: number; wins: number }>();
  for (const race of history) {
    if (race.surface && typeof race.beyer === "number") {
      const stats = surfaceStats.get(race.surface) || { runs: 0, totalBeyer: 0, wins: 0 };
      stats.runs++;
      stats.totalBeyer += race.beyer;
      if (race.position === 1) stats.wins++;
      surfaceStats.set(race.surface, stats);
    }
  }
  let bestSurface: string | null = null;
  let bestSurfaceBeyer = 0;
  let bestSurfaceRuns = 0;
  for (const [surface, stats] of surfaceStats.entries()) {
    if (stats.runs >= 3) {
      const avg = stats.totalBeyer / stats.runs;
      if (avg > bestSurfaceBeyer) {
        bestSurfaceBeyer = avg;
        bestSurface = surface;
        bestSurfaceRuns = stats.runs;
      }
    }
  }
  if (bestSurface !== null && bestSurfaceBeyer > 0) {
    return {
      label: "Surface Affinity",
      value: bestSurface,
      context: `Best performance average (Beyer ${Math.round(bestSurfaceBeyer)}) across ${bestSurfaceRuns} starts`,
      type: "positive",
    };
  }
  return null;
};

// 1.94 Check for Distance Versatility (spread between min and max winning distance >= 600m)
export const detectDistanceVersatility: InsightDetector = (horse) => {
  const history = horse.raceHistory ?? [];
  let minWinDist: number | null = null;
  let maxWinDist: number | null = null;
  for (const race of history) {
    if (race.position === 1 && race.distance != null) {
      if (minWinDist === null || race.distance < minWinDist) minWinDist = race.distance;
      if (maxWinDist === null || race.distance > maxWinDist) maxWinDist = race.distance;
    }
  }
  if (minWinDist !== null && maxWinDist !== null) {
    const spread = maxWinDist - minWinDist;
    if (spread >= 600) {
      return {
        label: "Distance Versatility",
        value: "Range Specialist",
        context: `Has recorded victories spanning from ${minWinDist}m to ${maxWinDist}m`,
        type: "positive",
      };
    }
  }
  return null;
};

/**
 * Registry of all insight detectors in priority order.
 * The coordinator (getHorseInsight) iterates this array and returns
 * the first non-null result.
 */
export const INSIGHT_DETECTORS: readonly InsightDetector[] = [
  detectWinStreak,
  detectBridesmaid,
  detectConsistency,
  detectBounceCandidate,
  detectImprovingForm,
  detectStakesPerformance,
  detectFreshness,
  detectPlayStyle,
  detectClosingKick,
  detectLateBloomer,
  detectFromTheClouds,
  detectLateCharge,
  detectSurfaceVersatility,
  detectDistanceSpecialist,
  detectSurfaceAffinity,
  detectDistanceVersatility,
];
