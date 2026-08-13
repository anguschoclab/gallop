import type { Horse } from "./types";

export type HorseInsight = {
  label: string;
  value: string;
  context: string;
  type: "positive" | "neutral" | "negative";
};

export function getHorseInsight(horse: Horse): HorseInsight | null {
  const history = horse.raceHistory ?? [];
  if (history.length < 3) return null;

  // 1. Check for win streak
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

  // 1.1 Check for Bridesmaid (2nd place streak)
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

  // 1.25 Check for Model of Consistency (80%+ top-3 finish rate, min 5 starts)
  const starts = history.length;
  if (starts >= 5) {
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
  }

  // 1.55 Check for Bounce Candidate (last race beyer is >= 8 points higher than best previous beyer)
  if (history.length >= 3) {
    const chronologicalHistory = [...history].sort((a, b) => a.day - b.day);
    const lastRace = chronologicalHistory[chronologicalHistory.length - 1];

    if (typeof lastRace.beyer === "number") {
      let maxPreviousBeyer = -1;
      for (let i = 0; i < chronologicalHistory.length - 1; i++) {
        const race = chronologicalHistory[i];
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
    }
  }

  // 1.5 Check for Improving Form (trending up in last 3 starts)
  const recentBeyers = history
    .slice(-3)
    .map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");

  if (recentBeyers.length === 3) {
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
  }

  // 1.6 Check for Stakes Performance (Big Stage Performer / Stage Fright)
  let gradedRuns = 0;
  let gradedBeyerTotal = 0;
  let regularRuns = 0;
  let regularBeyerTotal = 0;

  for (const race of history) {
    if (typeof race.beyer === "number") {
      if (race.grade && ["G1", "G2", "G3"].includes(race.grade)) {
        gradedRuns++;
        gradedBeyerTotal += race.beyer;
      } else {
        regularRuns++;
        regularBeyerTotal += race.beyer;
      }
    }
  }

  if (gradedRuns >= 2 && regularRuns >= 3) {
    const gradedAvg = gradedBeyerTotal / gradedRuns;
    const regularAvg = regularBeyerTotal / regularRuns;

    if (gradedAvg >= regularAvg + 5) {
      return {
        label: "Big Stage Performer",
        value: "Elevates in Stakes Races",
        context: `Averages a ${Math.round(gradedAvg)} Beyer in Graded company vs ${Math.round(regularAvg)} in standard races`,
        type: "positive",
      };
    } else if (regularAvg >= gradedAvg + 8) {
      return {
        label: "Stage Fright",
        value: "Underperforms in Stakes",
        context: `Averages only ${Math.round(gradedAvg)} Beyer in Graded company vs ${Math.round(regularAvg)} in standard races`,
        type: "negative",
      };
    }
  }

  // 1.7 Check for Freshness / Layoff performance
  // Requires at least 2 runs off a layoff (>= 60 days) and 3 active runs (< 60 days)
  let freshRuns = 0;
  let freshBeyerTotal = 0;
  let activeRuns = 0;
  let activeBeyerTotal = 0;

  // The raceHistory is generally ordered by day (newest or oldest depending on where it's used,
  // but to be safe we sort a copy ascending by day to find gaps)
  const chronologicalHistory = [...history].sort((a, b) => a.day - b.day);

  for (let i = 0; i < chronologicalHistory.length; i++) {
    const race = chronologicalHistory[i];
    if (typeof race.beyer !== "number") continue;

    // First race of career is considered "fresh"
    let daysSinceLast = 90;
    if (i > 0) {
      daysSinceLast = race.day - chronologicalHistory[i - 1].day;
    }

    if (daysSinceLast >= 60) {
      freshRuns++;
      freshBeyerTotal += race.beyer;
    } else {
      activeRuns++;
      activeBeyerTotal += race.beyer;
    }
  }

  if (freshRuns >= 2 && activeRuns >= 3) {
    const freshAvg = freshBeyerTotal / freshRuns;
    const activeAvg = activeBeyerTotal / activeRuns;

    if (freshAvg >= activeAvg + 8) {
      return {
        label: "Fires Fresh",
        value: "Excels off a Layoff",
        context: `Averages an ${Math.round(freshAvg)} Beyer off a 60+ day break vs ${Math.round(activeAvg)} when racing actively`,
        type: "positive",
      };
    } else if (activeAvg >= freshAvg + 8) {
      return {
        label: "Needs Racing",
        value: "Improves with Activity",
        context: `Averages an ${Math.round(activeAvg)} Beyer when active vs ${Math.round(freshAvg)} off a layoff`,
        type: "neutral", // Not necessarily a bad thing, just a training note
      };
    }
  }

  // 1.8 Check for Play Style Success (Wire-to-wire)
  let wireToWireWins = 0;
  let closerWins = 0;

  for (const race of history) {
    if (race.position === 1 && race.pacePositions && race.pacePositions.length > 0) {
      const isWireToWire = race.pacePositions.every((p) => p === 1);
      if (isWireToWire) {
        wireToWireWins++;
      }

      const fSize = race.fieldSize ?? 8;
      const firstCall = race.pacePositions[0];
      if (firstCall > Math.max(4, fSize / 2)) {
        closerWins++;
      }
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

  // 1.9 Check for Closing Kick (absolute positions passed from first call)
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

  // 1.91 Check for Late Bloomer (firstCall > max(5, fieldSize * 0.65), fieldSize >= 6, min 2 such wins)
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
      if (isOffPace) {
        lateBloomerWins++;
      }
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

  // 1.92 Check for From the Clouds (firstCall > ceil(fieldSize/2), min 2 such wins)
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
      if (firstCall > Math.ceil(race.fieldSize / 2)) {
        closingWins++;
      }
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

  // 1.925 Check for Late Charge (closerWins from wire-to-wire section, looser threshold)
  if (closerWins >= 2) {
    return {
      label: "Late Charge",
      value: "Off-the-Pace Winner",
      context: `Has won ${closerWins} races when coming from the back half of the field`,
      type: "positive",
    };
  }

  // 1.93 Check for Surface Versatility (wins on 2+ surfaces)
  const winningSurfaces = new Set<string>();
  for (const race of history) {
    if (race.position === 1 && race.surface) {
      winningSurfaces.add(race.surface);
    }
  }

  if (winningSurfaces.size >= 2) {
    const surfacesArray = Array.from(winningSurfaces);
    if (surfacesArray.length >= 3) {
      return {
        label: "All-Surface Master",
        value: "Triple-Surface Winner",
        context: "Has recorded victories on Turf, Dirt, and Synthetic",
        type: "positive",
      };
    } else {
      return {
        label: "Dual-Surface Threat",
        value: "Multi-Surface Winner",
        context: `Has recorded victories on both ${surfacesArray[0]} and ${surfacesArray[1]}`,
        type: "positive",
      };
    }
  }

  // 2. Check for distance sweet spot (best average beyer by distance, min 3 races)
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

  // 3. Surface Affinity
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

  // 1.94 Check for Distance Versatility (spread between min and max winning distance >= 600m)
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
}
