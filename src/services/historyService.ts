import type { Race, Horse } from "@/game/types";
import type { SeasonRecord, HallOfFameEntry } from "@/core/history/historyTypes";
import { generateUUID } from "@/game/uuid";

export function recordRaceHistory(
  race: Race,
  result: Array<{ horseId: string; position: number; time: number }>,
  runners: any[],
  horses: Horse[],
  day: number
): SeasonRecord | null {
  // Only record G1 races in season history
  if (!race.graded || race.graded.grade !== "G1") return null;

  const winner = result.find(r => r.position === 1);
  if (!winner) return null;

  const winnerHorse = horses.find(h => h.id === winner.horseId);
  const runner = runners.find(r => r.horseId === winner.horseId);

  return {
    id: generateUUID(),
    year: Math.floor((day - 1) / 365) + 1,
    day,
    raceId: race.id,
    raceName: race.name,
    winnerId: winner.horseId,
    winnerName: winnerHorse?.name || "Unknown",
    winnerSilk: winnerHorse?.silk || "#666",
    time: winner.time,
    jockeyId: runner?.jockeyId || "unknown",
    jockeyName: runner?.jockeyName || "Unknown",
    grade: "G1",
    isPlayerOwned: winnerHorse?.owned || false,
  };
}

export function checkHallOfFameInduction(
  horse: Horse,
  day: number
): HallOfFameEntry | null {
  // Induction criteria:
  // 1. At least 3 G1 wins
  // 2. OR at least $1,000,000 in earnings
  
  const g1Wins = horse.raceHistory.filter(h => h.grade === "G1" && h.position === 1).length;
  const isInducted = g1Wins >= 3 || horse.lifetimeEarnings >= 1000000;

  if (isInducted) {
    return {
      horseId: horse.id,
      name: horse.name,
      inductionDay: day,
      inductionYear: Math.floor((day - 1) / 365) + 1,
      achievements: [
        g1Wins >= 3 ? `${g1Wins} Grade 1 Victories` : "",
        horse.lifetimeEarnings >= 1000000 ? `$${(horse.lifetimeEarnings / 1000000).toFixed(1)}M in Lifetime Earnings` : ""
      ].filter(Boolean),
      lifetimeEarnings: horse.lifetimeEarnings,
      lifetimeStarts: horse.careerStarts,
      lifetimeWins: horse.careerWins,
      g1Wins,
      bestBeyer: Math.max(...horse.raceHistory.map(h => h.beyer || 0), 0),
      silk: horse.silk,
      pedigree: {
        sireName: horse.sireName,
        damName: horse.damName,
      }
    };
  }

  return null;
}
