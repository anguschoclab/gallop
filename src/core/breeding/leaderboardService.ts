import type { Horse } from "@/game/types";
import { getSireAnalytics, getSireSurfaceBias, getSireDistancePreference } from "./sireAnalytics";
import { getRunnersBy, getStakesFoalsBy, getG1FoalsBy, getFoalsBy } from "./lineage";
import type { Leaderboard, LeaderboardType, SireRanking, SireTrendData } from "./leaderboardTypes";

/**
 * Compute all leaderboards for the current game state
 */
export function computeAllLeaderboards(
  horses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
  trendHistory?: SireTrendData[],
): Record<LeaderboardType, Leaderboard> {
  const stallions = horses.filter((h) => h.stud?.atStud);

  return {
    overall: computeOverallLeaderboard(stallions, horses, industryMeanEarnings, currentDay),
    ci: computeCiLeaderboard(stallions, horses, industryMeanEarnings, currentDay),
    stakes_producers: computeStakesLeaderboard(stallions, horses, currentDay),
    g1_producers: computeG1Leaderboard(stallions, horses, currentDay),
    turf_specialists: computeTurfLeaderboard(stallions, horses, currentDay),
    dirt_specialists: computeDirtLeaderboard(stallions, horses, currentDay),
    sprint_sires: computeSprintLeaderboard(stallions, horses, currentDay),
    staying_sires: computeStayingLeaderboard(stallions, horses, currentDay),
    value_sires: computeValueLeaderboard(stallions, horses, industryMeanEarnings, currentDay),
    freshman_watch: computeFreshmanLeaderboard(stallions, horses, currentDay),
    rising_stars: computeRisingStarsLeaderboard(stallions, horses, currentDay, trendHistory),
    regional_north: computeRegionalLeaderboard(stallions, horses, "Northern", currentDay),
    regional_south: computeRegionalLeaderboard(stallions, horses, "Southern", currentDay),
  };
}

/**
 * Overall leaderboard ranked by AEI
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
 * CI leaderboard ranked by Comparable Index
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
 * Stakes producers leaderboard
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
 * G1 producers leaderboard
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
 * Turf specialists leaderboard
 */
function computeTurfLeaderboard(
  stallions: Horse[],
  allHorses: Horse[],
  currentDay: number,
): Leaderboard {
  const rankings = stallions
    .map((s) => {
      const runners = getRunnersBy({ horses: allHorses }, s.id);
      let turfWins = 0,
        turfStarts = 0;

      for (const foal of runners) {
        for (const race of foal.raceHistory) {
          if (race.surface === "Turf") {
            turfStarts++;
            if (race.position === 1) turfWins++;
          }
        }
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
 * Dirt specialists leaderboard
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
 * Sprint sires leaderboard
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
 * Staying sires leaderboard
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
 * Value sires leaderboard (AEI per $1,000 of fee)
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
 * Freshman watch leaderboard (first crop sires)
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
 * Rising stars leaderboard (trending upward)
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
 * Fallback for rising stars when no trend history exists
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
 * Regional leaderboard by hemisphere
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
