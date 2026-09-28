import type { Jockey, Horse, HorseRaceHistoryEntry } from "@/game/types";

export type JockeyInsight = {
  label: string;
  value: string;
  context: string;
  type: "positive" | "neutral" | "negative";
};

export function getJockeyInsight(
  jockey: Jockey,
  horses: Record<string, Horse>,
): JockeyInsight | null {
  const entries: { horse: Horse; entry: HorseRaceHistoryEntry }[] = [];

  for (const horse of Object.values(horses)) {
    for (const entry of horse.raceHistory ?? []) {
      if (entry.jockeyId === jockey.id) {
        entries.push({ horse, entry });
      }
    }
  }

  if (entries.length < 5) return null;

  // Insight 1: Favorite Mount (Most wins with a specific horse, min 3 wins)
  const winsByHorse = new Map<string, { horse: Horse; wins: number; starts: number }>();

  for (const { horse, entry } of entries) {
    const stats = winsByHorse.get(horse.id) || { horse, wins: 0, starts: 0 };
    stats.starts++;
    if (entry.position === 1) {
      stats.wins++;
    }
    winsByHorse.set(horse.id, stats);
  }

  let favoriteMount: { horse: Horse; wins: number; starts: number } | null = null;
  for (const stats of winsByHorse.values()) {
    if (stats.wins >= 3) {
      if (!favoriteMount || stats.wins > favoriteMount.wins) {
        favoriteMount = stats;
      }
    }
  }

  // Check for Perfect Partnership: jockey greatly elevates the horse compared to other riders
  let bestPartnership = null;

  for (const stats of winsByHorse.values()) {
    if (
      stats.starts >= 3 &&
      stats.wins >= 2 &&
      stats.horse.careerStarts != null &&
      stats.horse.careerWins != null
    ) {
      const jockeyWinRate = stats.wins / stats.starts;
      const otherStarts = stats.horse.careerStarts - stats.starts;
      const otherWins = stats.horse.careerWins - stats.wins;

      if (otherStarts >= 3) {
        const otherWinRate = otherWins / otherStarts;

        if (jockeyWinRate >= otherWinRate + 0.4) {
          const improvement = jockeyWinRate - otherWinRate;
          const currentBestImprovement = bestPartnership
            ? bestPartnership.wins / bestPartnership.starts - bestPartnership.otherWinRate
            : -1;

          if (improvement > currentBestImprovement) {
            bestPartnership = { ...stats, otherWinRate };
          }
        }
      }
    }
  }

  if (bestPartnership) {
    const jockeyWinPct = Math.round((bestPartnership.wins / bestPartnership.starts) * 100);
    const otherWinPct = Math.round(bestPartnership.otherWinRate * 100);
    return {
      label: "Perfect Partnership",
      value: `Elevates ${bestPartnership.horse.name}`,
      context: `Wins ${jockeyWinPct}% of the time aboard this horse, compared to ${otherWinPct}% for other riders`,
      type: "positive",
    };
  }

  if (favoriteMount) {
    return {
      label: "Favorite Mount",
      value: favoriteMount.horse.name,
      context: `Has won ${favoriteMount.wins} races in ${favoriteMount.starts} starts aboard this horse`,
      type: "positive",
    };
  }

  // Insight 2: Big Race Rider (Good win rate in Graded races)
  let gradedStarts = 0;
  let gradedWins = 0;
  for (const { entry } of entries) {
    if (entry.grade && (entry.grade === "G1" || entry.grade === "G2" || entry.grade === "G3")) {
      gradedStarts++;
      if (entry.position === 1) gradedWins++;
    }
  }

  if (gradedStarts >= 5 && gradedWins / gradedStarts >= 0.25) {
    return {
      label: "Big Race Rider",
      value: "Stakes Specialist",
      context: `Has won ${Math.round((gradedWins / gradedStarts) * 100)}% of their ${gradedStarts} Graded stakes mounts`,
      type: "positive",
    };
  }

  // Insight 3: Iron Rider (High number of starts)
  if (entries.length >= 50) {
    return {
      label: "Iron Rider",
      value: "Veteran Experience",
      context: `Has ridden in ${entries.length} career races`,
      type: "positive",
    };
  }

  return null;
}
