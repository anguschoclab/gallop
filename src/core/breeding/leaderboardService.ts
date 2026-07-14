/**
 * leaderboardService.ts - Sire leaderboard computation
 *
 * Computes all 13 sire leaderboards in a single pass using a pre-indexed horsesBySire map.
 * All specialist leaderboards (turf, dirt, sprint, stayer, freshman, rising stars, regional)
 * are computed inline from accumulated stats — no O(N²) patterns or external function calls.
 *
 * Dependencies: @/game/types (Horse), @/core/horse/stats (getCareerStats), ./sireAnalytics (types only), ./leaderboardTypes (types only)
 * Related files: leaderboardPhase.ts (calls computeAllLeaderboards), leaderboardTypes.ts (type definitions)
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import type { SireAnalytics, SurfaceBias, DistancePreference } from "./sireAnalytics";
import type { Leaderboard, LeaderboardType, SireTrendData } from "./leaderboardTypes";

export function computeAllLeaderboards(
  horses: Horse[],
  industryMeanEarnings: number,
  currentDay: number,
  trendHistory?: SireTrendData[],
): Record<LeaderboardType, Leaderboard> {
  const stallions = horses.filter((h) => h.stud?.atStud);

  // Pre-index horses by sire (Bug 1 fix: use pedigree.sireId, not h.sireId)
  const horsesBySire = new Map<string, Horse[]>();
  for (const h of horses) {
    const sireId = h.pedigree?.sireId;
    if (sireId) {
      if (!horsesBySire.has(sireId)) horsesBySire.set(sireId, []);
      horsesBySire.get(sireId)!.push(h);
    }
  }

  // Per-stallion surface/distance stat accumulators
  const surfaceStats = new Map<
    string,
    { turfWins: number; turfStarts: number; dirtWins: number; dirtStarts: number; syntheticWins: number; syntheticStarts: number }
  >();
  const distanceStats = new Map<
    string,
    { sprintWins: number; sprintStarts: number; classicWins: number; classicStarts: number; stayerWins: number; stayerStarts: number }
  >();

  // Calculate analytics for all stallions ONCE
  const stallionAnalytics = new Map<string, SireAnalytics>();

  // First pass: Calculate basic metrics, AEI, and accumulate surface/distance stats
  for (const s of stallions) {
    const allFoals = horsesBySire.get(s.id) || [];
    // Bug 2 fix: filter to racing-age runners only (matches getRunnersBy semantics)
    const runners = allFoals.filter((h) => h.age >= 2 && h.raceHistory.length > 0);

    const totalProgenyEarnings = runners.reduce((sum, f) => {
      return sum + (f.lifetimeEarnings || 0);
    }, 0);
    const avgProgenyEarnings = runners.length > 0 ? totalProgenyEarnings / runners.length : 0;
    const aei = industryMeanEarnings > 0 ? (avgProgenyEarnings / industryMeanEarnings) * 100 : 0;

    // Accumulate surface and distance stats from runners
    let turfWins = 0, turfStarts = 0, dirtWins = 0, dirtStarts = 0;
    let syntheticWins = 0, syntheticStarts = 0;
    let sprintWins = 0, sprintStarts = 0, classicWins = 0, classicStarts = 0;
    let stayerWins = 0, stayerStarts = 0;

    for (const r of runners) {
      const cs = getCareerStats(r);
      turfWins += cs.turfWins; turfStarts += cs.turfStarts;
      dirtWins += cs.dirtWins; dirtStarts += cs.dirtStarts;
      syntheticWins += cs.syntheticWins; syntheticStarts += cs.syntheticStarts;
      sprintWins += cs.sprintWins; sprintStarts += cs.sprintStarts;
      classicWins += cs.classicWins; classicStarts += cs.classicStarts;
      stayerWins += cs.stayerWins; stayerStarts += cs.stayerStarts;
    }

    surfaceStats.set(s.id, { turfWins, turfStarts, dirtWins, dirtStarts, syntheticWins, syntheticStarts });
    distanceStats.set(s.id, { sprintWins, sprintStarts, classicWins, classicStarts, stayerWins, stayerStarts });

    // Phase 4: Compute surfaceBias inline (ported from getSireSurfaceBias)
    const surfaceBias: SurfaceBias = (() => {
      if (runners.length < 5) {
        if (s.bloodline) {
          const bl = s.bloodline.toLowerCase();
          if (bl.includes("northern dancer") || bl.includes("sadler's wells")) return "turf";
          if (bl.includes("mr. prospector") || bl.includes("storm cat")) return "dirt";
        }
        return "balanced";
      }
      const turfRate = turfStarts > 0 ? turfWins / turfStarts : 0;
      const dirtRate = dirtStarts > 0 ? dirtWins / dirtStarts : 0;
      const syntheticRate = syntheticStarts > 0 ? syntheticWins / syntheticStarts : 0;
      if (turfRate > 0.25 && turfRate > dirtRate * 1.5) return "turf";
      if (dirtRate > 0.25 && dirtRate > turfRate * 1.5) return "dirt";
      if (syntheticRate > 0.25) return "synthetic";
      return "balanced";
    })();

    // Phase 4: Compute distancePreference inline (ported from getSireDistancePreference)
    const distancePreference: DistancePreference = (() => {
      if (runners.length < 5) return "versatile";
      const sprintRate = sprintStarts > 0 ? sprintWins / sprintStarts : 0;
      const classicRate = classicStarts > 0 ? classicWins / classicStarts : 0;
      const stayerRate = stayerStarts > 0 ? stayerWins / stayerStarts : 0;
      if (sprintRate > 0.2 && sprintRate > classicRate * 1.3) return "sprint";
      if (stayerRate > 0.2 && stayerRate > classicRate * 1.3) return "stayer";
      if (classicRate > 0.15) return "classic";
      return "versatile";
    })();

    // Phase 5: Use stud record for lifetime stakes/G1 foals (includes historical foals)
    const lifetimeFoals = s.stud?.lifetimeFoals || 0;
    const lifetimeStakesFoals = s.stud?.lifetimeStakesFoals || 0;
    const lifetimeG1Foals = s.stud?.lifetimeG1Foals || 0;

    // progenyWinPercentage (ported from calculateProgenyWinPercentage)
    const progenyWinPercentage = lifetimeFoals > 0
      ? Math.round((lifetimeStakesFoals / lifetimeFoals) * 100 * 10) / 10
      : 0;

    stallionAnalytics.set(s.id, {
      stallionId: s.id,
      stallionName: s.name,
      aei: Math.round(aei * 10) / 10,
      ci: 0,
      classification: "unproven",
      surfaceBias,
      distancePreference,
      progenyWinPercentage,
      lifetimeFoals,
      lifetimeStakesFoals,
      lifetimeG1Foals,
      standingFee: s.stud?.standingFee || 0,
    });
  }

  // Second pass: Calculate CI and finalize classification
  const avgAei =
    stallions.length > 0
      ? Array.from(stallionAnalytics.values()).reduce((sum, a) => sum + a.aei, 0) / stallions.length
      : 0;

  for (const [, a] of stallionAnalytics) {
    a.ci = avgAei > 0 ? Math.round((a.aei / avgAei) * 1000) / 10 : 0;
    if (a.aei > 2.0 && a.ci > 1.0) a.classification = "elite";
    else if (a.aei > 1.5) a.classification = "premium";
    else if (a.aei > 1.0) a.classification = "solid";
    else if (a.aei > 0.5 && a.ci > 0.3) a.classification = "developing";
  }

  const getA = (sId: string) => stallionAnalytics.get(sId)!;

  const createLeaderboardRankings = (
    valueGetter: (analytics: SireAnalytics) => number,
    filterFn: (ranking: { metrics: SireAnalytics; value: number }) => boolean,
    leaderboardType: LeaderboardType,
    title: string,
    description: string,
  ): Leaderboard => {
    const rankings = stallions
      .map((s) => ({
        stallionId: s.id,
        stallionName: s.name,
        value: valueGetter(getA(s.id)),
        metrics: getA(s.id),
      }))
      .filter(filterFn)
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return { type: leaderboardType, title, description, lastUpdated: currentDay, rankings };
  };

  // ─── 8 specialist leaderboards ported inline ───

  // Turf specialists
  const turfRankings = stallions
    .map((s) => {
      const ss = surfaceStats.get(s.id)!;
      const turfRate = ss.turfStarts > 0 ? ss.turfWins / ss.turfStarts : 0;
      return { stallionId: s.id, stallionName: s.name, value: turfRate, metrics: getA(s.id) };
    })
    .filter((r) => r.metrics.surfaceBias === "turf" && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Dirt specialists
  const dirtRankings = stallions
    .map((s) => {
      const ss = surfaceStats.get(s.id)!;
      const dirtRate = ss.dirtStarts > 0 ? ss.dirtWins / ss.dirtStarts : 0;
      return { stallionId: s.id, stallionName: s.name, value: dirtRate, metrics: getA(s.id) };
    })
    .filter((r) => r.metrics.surfaceBias === "dirt" && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Sprint sires
  const sprintRankings = stallions
    .map((s) => {
      const ds = distanceStats.get(s.id)!;
      const sprintRate = ds.sprintStarts > 0 ? ds.sprintWins / ds.sprintStarts : 0;
      return { stallionId: s.id, stallionName: s.name, value: sprintRate, metrics: getA(s.id) };
    })
    .filter((r) => r.metrics.distancePreference === "sprint" && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Staying sires
  const stayerRankings = stallions
    .map((s) => {
      const ds = distanceStats.get(s.id)!;
      const stayerRate = ds.stayerStarts > 0 ? ds.stayerWins / ds.stayerStarts : 0;
      return { stallionId: s.id, stallionName: s.name, value: stayerRate, metrics: getA(s.id) };
    })
    .filter((r) => r.metrics.distancePreference === "stayer" && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Freshman watch
  const freshmanRankings = stallions
    .map((s) => {
      const foals = horsesBySire.get(s.id) || [];
      const racingAgeFoals = foals.filter((f) => f.age >= 2);
      const oldestFoalAge = foals.length > 0 ? Math.max(...foals.map((f) => f.age)) : 0;
      const isFreshman = oldestFoalAge <= 3 && racingAgeFoals.length > 0;
      return {
        stallionId: s.id,
        stallionName: s.name,
        value: getA(s.id).lifetimeStakesFoals,
        metrics: getA(s.id),
        isFreshman,
      };
    })
    .filter((r) => r.isFreshman)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ stallionId: r.stallionId, stallionName: r.stallionName, rank: i + 1, value: r.value, metrics: r.metrics }));

  // Rising stars
  let risingStarsRankings: { stallionId: string; stallionName: string; rank: number; value: number; metrics: SireAnalytics }[];
  if (!trendHistory || trendHistory.length === 0) {
    // Fallback: top 20 by lifetimeStakesFoals
    risingStarsRankings = stallions
      .map((s) => ({
        stallionId: s.id,
        stallionName: s.name,
        value: getA(s.id).lifetimeStakesFoals,
        metrics: getA(s.id),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  } else {
    risingStarsRankings = stallions
      .map((s) => {
        const history = trendHistory.filter((t) => t.stallionId === s.id);
        if (history.length < 2) return null;
        const recent = history[history.length - 1];
        const previous = history[history.length - 2];
        const aeiChange = recent.aei - previous.aei;
        const stakesGrowth = recent.stakesFoals - previous.stakesFoals;
        const trendScore = aeiChange * 10 + stakesGrowth * 5;
        return { stallionId: s.id, stallionName: s.name, value: trendScore, metrics: getA(s.id) };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // Regional leaderboards
  const makeRegional = (hemisphere: "Northern" | "Southern"): Leaderboard => {
    const rankings = stallions
      .filter((s) => s.hemisphere === hemisphere)
      .map((s) => ({
        stallionId: s.id,
        stallionName: s.name,
        value: getA(s.id).aei,
        metrics: getA(s.id),
      }))
      .filter((r) => r.metrics.lifetimeFoals >= 5)
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return {
      type: hemisphere === "Northern" ? "regional_north" : "regional_south",
      title: `${hemisphere} Hemisphere Rankings`,
      description: `Ranked by AEI for ${hemisphere.toLowerCase()} hemisphere sires`,
      lastUpdated: currentDay,
      rankings,
    };
  };

  return {
    overall: createLeaderboardRankings(
      (a) => a.aei,
      (r) => r.metrics.lifetimeFoals >= 5,
      "overall",
      "Overall Sire Rankings",
      "Ranked by AEI",
    ),
    ci: createLeaderboardRankings(
      (a) => a.ci,
      (r) => r.metrics.lifetimeFoals >= 5,
      "ci",
      "CI Rankings",
      "Ranked by CI",
    ),
    stakes_producers: createLeaderboardRankings(
      (a) => a.lifetimeStakesFoals,
      () => true,
      "stakes_producers",
      "Stakes Producers",
      "Ranked by Stakes winners",
    ),
    g1_producers: createLeaderboardRankings(
      (a) => a.lifetimeG1Foals,
      () => true,
      "g1_producers",
      "G1 Producers",
      "Ranked by G1 winners",
    ),
    turf_specialists: {
      type: "turf_specialists",
      title: "Turf Specialists",
      description: "Ranked by turf progeny win rate",
      lastUpdated: currentDay,
      rankings: turfRankings,
    },
    dirt_specialists: {
      type: "dirt_specialists",
      title: "Dirt Specialists",
      description: "Ranked by dirt progeny win rate",
      lastUpdated: currentDay,
      rankings: dirtRankings,
    },
    sprint_sires: {
      type: "sprint_sires",
      title: "Sprint Sires",
      description: "Ranked by sprint progeny win rate",
      lastUpdated: currentDay,
      rankings: sprintRankings,
    },
    staying_sires: {
      type: "staying_sires",
      title: "Staying Sires",
      description: "Ranked by staying progeny win rate",
      lastUpdated: currentDay,
      rankings: stayerRankings,
    },
    value_sires: createLeaderboardRankings(
      (a) => a.aei / ((a.standingFee || 1) / 1000),
      (r) => r.metrics.lifetimeFoals >= 5,
      "value_sires",
      "Value Sires",
      "AEI per $1,000 fee",
    ),
    freshman_watch: {
      type: "freshman_watch",
      title: "Freshman Watch",
      description: "First crop sires ranked by stakes winners",
      lastUpdated: currentDay,
      rankings: freshmanRankings,
    },
    rising_stars: {
      type: "rising_stars",
      title: "Rising Stars",
      description: "Sires with improving progeny performance",
      lastUpdated: currentDay,
      rankings: risingStarsRankings,
    },
    regional_north: makeRegional("Northern"),
    regional_south: makeRegional("Southern"),
  };
}
