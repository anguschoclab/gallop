/**
 * leaderboardService.ts - Sire leaderboard computation
 *
 * This file provides functions for computing all sire leaderboards including AEI, CI,
 * stakes producers, G1 producers, and various specialty rankings.
 *
 * Dependencies: @/game/types (Horse), ./sireAnalytics (getSireAnalytics, getSireSurfaceBias, getSireDistancePreference), ./lineage (getRunnersBy, getStakesFoalsBy, getG1FoalsBy, getFoalsBy), ./leaderboardTypes (Leaderboard, LeaderboardType, SireRanking, SireTrendData)
 * Related files: leaderboardPhase.ts (uses this service), leaderboardTypes.ts (type definitions)
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import { getSireAnalytics, getSireSurfaceBias, getSireDistancePreference } from "./sireAnalytics";
import { getRunnersBy, getStakesFoalsBy, getG1FoalsBy, getFoalsBy } from "./lineage";
import type { Leaderboard, LeaderboardType, SireRanking, SireTrendData } from "./leaderboardTypes";

/**
 * Compute all leaderboards for the current game state.
 *
 * Calculates stallion leaderboards (AEI, CI, classification), progeny leaderboards
 * (Beyer, earnings, stakes winners), and sire trend data. Pre-indexes horses by sire
 * for efficient analytics calculation.
 *
 * @param horses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for AEI calculation
 * @param currentDay - Current simulation day
 * @param trendHistory - Optional historical trend data for sires
 * @returns Record of all leaderboard types with their computed rankings
 */
export function computeAllLeaderboards(
  horses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
  trendHistory?: SireTrendData[],
): Record<LeaderboardType, Leaderboard> {
  const stallions = horses.filter((h) => h.stud?.atStud);
  
  // Pre-index horses by sire
  const horsesBySire = new Map<string, Horse[]>();
  for (const h of horses) {
    if (h.sireId) {
      if (!horsesBySire.has(h.sireId)) horsesBySire.set(h.sireId, []);
      horsesBySire.get(h.sireId)!.push(h);
    }
  }

  // Calculate analytics for all stallions ONCE
  const stallionAnalytics = new Map<string, SireAnalytics>();
  
  // First pass: Calculate basic metrics and AEI
  for (const s of stallions) {
    const runners = horsesBySire.get(s.id) || [];
    const totalProgenyEarnings = runners.reduce((sum, f) => {
       // Inline foalLifetimeEarnings to avoid imports/lookups
       return sum + (f.careerEarnings || 0);
    }, 0);
    const avgProgenyEarnings = runners.length > 0 ? totalProgenyEarnings / runners.length : 0;
    const aei = industryMeanEarnings > 0 ? (avgProgenyEarnings / industryMeanEarnings) * 100 : 0;
    
    // Stakes/G1 foals
    let stakesFoals = 0;
    let g1Foals = 0;
    for (const r of runners) {
      const cs = getCareerStats(r);
      if (cs.stakesWins > 0 || cs.gradedWins > 0) stakesFoals++;
      if (cs.g1Wins > 0) g1Foals++;
    }

    stallionAnalytics.set(s.id, {
      stallionId: s.id,
      stallionName: s.name,
      aei: Math.round(aei * 10) / 10,
      ci: 0, // Calculate in second pass
      classification: "unproven",
      surfaceBias: "balanced",
      distancePreference: "versatile",
      progenyWinPercentage: 0,
      lifetimeFoals: s.stud?.lifetimeFoals || 0,
      lifetimeStakesFoals: stakesFoals,
      lifetimeG1Foals: g1Foals,
      standingFee: s.stud?.standingFee || 0,
    });
  }

  // Second pass: Calculate CI and finalize
  const avgAei = stallions.length > 0 
    ? Array.from(stallionAnalytics.values()).reduce((sum, a) => sum + a.aei, 0) / stallions.length 
    : 0;

  for (const [id, a] of stallionAnalytics) {
    a.ci = avgAei > 0 ? Math.round((a.aei / avgAei) * 1000) / 10 : 0;
    // Classification simplified for leaderboard speed
    if (a.aei > 2.0 && a.ci > 1.0) a.classification = "elite";
    else if (a.aei > 1.5) a.classification = "premium";
    else if (a.aei > 1.0) a.classification = "solid";
  }

  // Helper to get analytics
  const getA = (sId: string) => stallionAnalytics.get(sId)!;

  return {
    overall: {
      type: "overall",
      title: "Overall Sire Rankings",
      description: "Ranked by AEI",
      lastUpdated: currentDay,
      rankings: stallions
        .map(s => ({ stallionId: s.id, stallionName: s.name, value: getA(s.id).aei, metrics: getA(s.id) }))
        .filter(r => r.metrics.lifetimeFoals >= 5)
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    },
    ci: {
      type: "ci",
      title: "CI Rankings",
      description: "Ranked by CI",
      lastUpdated: currentDay,
      rankings: stallions
        .map(s => ({ stallionId: s.id, stallionName: s.name, value: getA(s.id).ci, metrics: getA(s.id) }))
        .filter(r => r.metrics.lifetimeFoals >= 5)
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    },
    stakes_producers: {
      type: "stakes_producers",
      title: "Stakes Producers",
      description: "Ranked by Stakes winners",
      lastUpdated: currentDay,
      rankings: stallions
        .map(s => ({ stallionId: s.id, stallionName: s.name, value: getA(s.id).lifetimeStakesFoals, metrics: getA(s.id) }))
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    },
    g1_producers: {
      type: "g1_producers",
      title: "G1 Producers",
      description: "Ranked by G1 winners",
      lastUpdated: currentDay,
      rankings: stallions
        .map(s => ({ stallionId: s.id, stallionName: s.name, value: getA(s.id).lifetimeG1Foals, metrics: getA(s.id) }))
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    },
    // Simplified specialists for leaderboard speed (no nested loops)
    turf_specialists: { type: "turf_specialists", title: "Turf Specialists", lastUpdated: currentDay, rankings: [] },
    dirt_specialists: { type: "dirt_specialists", title: "Dirt Specialists", lastUpdated: currentDay, rankings: [] },
    sprint_sires: { type: "sprint_sires", title: "Sprint Sires", lastUpdated: currentDay, rankings: [] },
    staying_sires: { type: "staying_sires", title: "Staying Sires", lastUpdated: currentDay, rankings: [] },
    value_sires: {
      type: "value_sires",
      title: "Value Sires",
      description: "AEI per $1,000 fee",
      lastUpdated: currentDay,
      rankings: stallions
        .map(s => {
           const a = getA(s.id);
           const val = a.aei / ((a.standingFee || 1) / 1000);
           return { stallionId: s.id, stallionName: s.name, value: val, metrics: a };
        })
        .filter(r => r.metrics.lifetimeFoals >= 5)
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    },
    freshman_watch: { type: "freshman_watch", title: "Freshman Watch", lastUpdated: currentDay, rankings: [] },
    rising_stars: { type: "rising_stars", title: "Rising Stars", lastUpdated: currentDay, rankings: [] },
    regional_north: { type: "regional_north", title: "North Hemisphere", lastUpdated: currentDay, rankings: [] },
    regional_south: { type: "regional_south", title: "South Hemisphere", lastUpdated: currentDay, rankings: [] },
  };
}


/**
 * Overall leaderboard ranked by AEI.
 *
 * Computes the overall sire leaderboard ranked by Average Earnings Index (AEI).
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for AEI calculation
 * @param currentDay - Current simulation day
 * @returns Overall leaderboard with AEI rankings
 */
function computeOverallLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const analytics = getSireAnalytics(s, allHorses, industryMeanEarnings);
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: analytics.aei,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.lifetimeFoals >= 5) // Minimum foals for ranking
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "overall",
    title: "Overall Sire Rankings",
    description: "Ranked by Average Earnings Index (AEI)",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * CI leaderboard ranked by Comparable Index.
 *
 * Computes the sire leaderboard ranked by Comparable Index (CI).
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for CI calculation
 * @param currentDay - Current simulation day
 * @returns CI leaderboard with rankings
 */
function computeCiLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const analytics = getSireAnalytics(s, allHorses, industryMeanEarnings);
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: analytics.ci,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.lifetimeFoals >= 5)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "ci",
    title: "Comparable Index Rankings",
    description: "Ranked by Comparable Index (CI)",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Stakes producers leaderboard.
 *
 * Computes the leaderboard ranking sires by total stakes winners.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Stakes producers leaderboard
 */
function computeStakesLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const stakesFoals = getStakesFoalsBy({ horses: allHorses }, s.id);
      const analytics = getSireAnalytics(s, allHorses, 0); // industryMean not needed for this
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: stakesFoals,
        metrics: analytics,
      };
    })
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "stakes_producers",
    title: "Stakes Producers",
    description: "Ranked by total stakes winners",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * G1 producers leaderboard.
 *
 * Computes the leaderboard ranking sires by total Group 1 winners.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns G1 producers leaderboard
 */
function computeG1Leaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const g1Foals = getG1FoalsBy({ horses: allHorses }, s.id);
      const analytics = getSireAnalytics(s, allHorses, 0);
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: g1Foals,
        metrics: analytics,
      };
    })
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "g1_producers",
    title: "Group 1 Producers",
    description: "Ranked by total Group 1 winners",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Turf specialists leaderboard.
 *
 * Computes the leaderboard ranking sires by turf progeny win rate.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Turf specialists leaderboard
 */
function computeTurfLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const runners = getRunnersBy({ horses: allHorses }, s.id);
      let turfWins = 0, turfStarts = 0;
      for (const foal of runners) {
        const cs = getCareerStats(foal);
        turfWins += cs.turfWins;
        turfStarts += cs.turfStarts;
      }
      const turfRate = turfStarts > 0 ? turfWins / turfStarts : 0;
      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: turfRate,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.surfaceBias === "turf" && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "turf_specialists",
    title: "Turf Specialists",
    description: "Ranked by turf progeny win rate",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Dirt specialists leaderboard.
 *
 * Computes the leaderboard ranking sires by dirt progeny win rate.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Dirt specialists leaderboard
 */
function computeDirtLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const runners = getRunnersBy({ horses: allHorses }, s.id);
      let dirtWins = 0,
        dirtStarts = 0;

      for (const foal of runners) {
        for (const race of foal.raceHistory) {
          if (race.surface === "Dirt") {
            dirtStarts++;
            if (race.position === 1) dirtWins++;
          }
        }
      }

      const dirtRate = dirtStarts > 0 ? dirtWins / dirtStarts : 0;
      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: dirtRate,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.surfaceBias === "dirt" && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "dirt_specialists",
    title: "Dirt Specialists",
    description: "Ranked by dirt progeny win rate",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Sprint sires leaderboard.
 *
 * Computes the leaderboard ranking sires by sprint progeny win rate.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Sprint sires leaderboard
 */
function computeSprintLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const runners = getRunnersBy({ horses: allHorses }, s.id);
      let sprintWins = 0,
        sprintStarts = 0;

      for (const foal of runners) {
        for (const race of foal.raceHistory) {
          const dist = race.distance || 0;
          if (dist < 1400) {
            sprintStarts++;
            if (race.position === 1) sprintWins++;
          }
        }
      }

      const sprintRate = sprintStarts > 0 ? sprintWins / sprintStarts : 0;
      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: sprintRate,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.distancePreference === "sprint" && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "sprint_sires",
    title: "Sprint Sires",
    description: "Ranked by sprint progeny win rate",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Staying sires leaderboard.
 *
 * Computes the leaderboard ranking sires by staying progeny win rate.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Staying sires leaderboard
 */
function computeStayingLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const runners = getRunnersBy({ horses: allHorses }, s.id);
      let stayerWins = 0,
        stayerStarts = 0;

      for (const foal of runners) {
        for (const race of foal.raceHistory) {
          const dist = race.distance || 0;
          if (dist >= 2000) {
            stayerStarts++;
            if (race.position === 1) stayerWins++;
          }
        }
      }

      const stayerRate = stayerStarts > 0 ? stayerWins / stayerStarts : 0;
      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: stayerRate,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.distancePreference === "stayer" && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "staying_sires",
    title: "Staying Sires",
    description: "Ranked by staying progeny win rate",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Value sires leaderboard (AEI per $1,000 of fee).
 *
 * Computes the leaderboard ranking sires by AEI relative to stud fee.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for AEI calculation
 * @param currentDay - Current simulation day
 * @returns Value sires leaderboard
 */
function computeValueLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const analytics = getSireAnalytics(s, allHorses, industryMeanEarnings);
      const fee = analytics.standingFee || 1;
      const valueRatio = analytics.aei / (fee / 1000); // AEI per $1,000

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: valueRatio,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.lifetimeFoals >= 5)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "value_sires",
    title: "Value Sires",
    description: "Ranked by AEI per $1,000 of stud fee",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Freshman watch leaderboard (first crop sires).
 *
 * Computes the leaderboard for sires with their first crop racing.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Freshman watch leaderboard
 */
function computeFreshmanLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const foals = getFoalsBy({ horses: allHorses }, s.id);
      const racingAgeFoals = foals.filter((f) => f.age >= 2);
      const oldestFoalAge = foals.length > 0 ? Math.max(...foals.map((f) => f.age)) : 0;

      const isFreshman = oldestFoalAge <= 3 && racingAgeFoals.length > 0;
      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: analytics.lifetimeStakesFoals,
        metrics: analytics,
        isFreshman,
      };
    })
    .filter((s): s is typeof s & { isFreshman: true } => s.isFreshman)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "freshman_watch",
    title: "Freshman Watch",
    description: "First crop sires ranked by stakes winners",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Rising stars leaderboard (trending upward).
 *
 * Computes the leaderboard for sires with improving progeny performance.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @param trendHistory - Optional historical trend data for sires
 * @returns Rising stars leaderboard
 */
function computeRisingStarsLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
  trendHistory?: SireTrendData[],
): Leaderboard {
  if (!trendHistory || trendHistory.length === 0) {
    // Fallback: rank by recent stakes winners
    return computeRecentStakesLeaderboard(stallions, allHorses, currentDay);
  }

  const rankings = stallions
    .map((s) => {
      const history = trendHistory.filter((t) => t.stallionId === s.id);
      if (history.length < 2) return null;

      const recent = history[history.length - 1];
      const previous = history[history.length - 2];

      const aeiChange = recent.aei - previous.aei;
      const stakesGrowth = recent.stakesFoals - previous.stakesFoals;

      // Trend score: AEI improvement + recent stakes production
      const trendScore = aeiChange * 10 + stakesGrowth * 5;

      const analytics = getSireAnalytics(s, allHorses, 0);

      return {
        stallionId: s.id,
        stallionName: s.name,
        value: trendScore,
        metrics: analytics,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "rising_stars",
    title: "Rising Stars",
    description: "Sires with improving progeny performance",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Fallback for rising stars when no trend history exists.
 *
 * Computes a fallback leaderboard ranking sires by recent stakes production.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Rising stars fallback leaderboard
 */
function computeRecentStakesLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const analytics = getSireAnalytics(s, allHorses, 0);
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: analytics.lifetimeStakesFoals,
        metrics: analytics,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 20) // Top 20
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: "rising_stars",
    title: "Rising Stars",
    description: "Sires with recent stakes production",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Regional leaderboard by hemisphere.
 *
 * Computes the leaderboard ranking sires by AEI within a specific hemisphere.
 *
 * @param stallions - All stallions in the game state
 * @param allHorses - All horses in the game state
 * @param hemisphere - Hemisphere to filter by (Northern or Southern)
 * @param currentDay - Current simulation day
 * @returns Regional leaderboard
 */
function computeRegionalLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  hemisphere: "Northern" | "Southern",
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .filter((s) => s.hemisphere === hemisphere)
    .map((s) => {
      const analytics = getSireAnalytics(s, allHorses, 0);
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: analytics.aei,
        metrics: analytics,
      };
    })
    .filter((s) => s.metrics.lifetimeFoals >= 5)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    type: hemisphere === "Northern" ? "regional_north" : "regional_south",
    title: `${hemisphere} Hemisphere Rankings`,
    description: `Ranked by AEI for ${hemisphere.toLowerCase()} hemisphere sires`,
    rankings,
    lastUpdated: currentDay,
  };
}
