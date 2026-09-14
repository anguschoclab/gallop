/**
 * raceWins.ts - Player race wins and prize money derivation
 *
 * Derives all race victories achieved by the player's stable across active,
 * retired, and archived horses, extracting the purse payout for each win and
 * computing aggregate racing earnings metrics for the portfolio.
 *
 * Pure derivation only - no state mutation.
 *
 * Dependencies: @/core/horse/types, @/core/race/types, @/core/transactions/transactionTypes, @/core/horse/ownership, @/constants
 * Related files: src/routes/portfolio.tsx, src/components/portfolio/RaceWinsTable.tsx
 */

import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import type { Transaction } from "@/core/transactions/transactionTypes";
import type { Jockey } from "@/core/jockey/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT } from "@/constants";

export interface PlayerRaceWinRecord {
  id: string;
  day: number;
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  payout: number;
  purse?: number;
  grade?: "G1" | "G2" | "G3" | string;
  raceClass?: string;
  distance?: number;
  surface?: string;
  track?: string;
  beyer?: number;
  jockeyId?: string;
  jockeyName?: string;
}

export interface PlayerRaceWinsSummary {
  totalWins: number;
  totalEarnings: number;
  averagePayout: number;
  topPayout: number;
  gradedWins: number;
}

export interface DerivePlayerRaceWinsArgs {
  horses: Horse[];
  races?: Record<string, Race> | Race[];
  transactions?: Transaction[];
  jockeys?: Jockey[];
}

/**
 * Derives each race won by the player along with its prize money payout.
 *
 * Scans all horses (active and archived) for 1st-place race history entries,
 * filtering out races won by NPC stables, determining payouts, and correlating
 * with transaction records and race definitions.
 *
 * @param args - Arguments object containing horses, races, transactions, and jockeys.
 */
export function derivePlayerRaceWins(args: DerivePlayerRaceWinsArgs): PlayerRaceWinRecord[] {
  const { horses, races, transactions, jockeys } = args;

  // Build fast lookup for races
  const raceMap = new Map<string, Race>();
  if (races) {
    const raceList = Array.isArray(races) ? races : Object.values(races);
    for (const r of raceList) {
      if (r?.id) raceMap.set(r.id, r);
    }
  }

  // Build fast lookup for jockeys
  const jockeyMap = new Map<string, string>();
  if (jockeys) {
    for (const j of jockeys) {
      if (j?.id) jockeyMap.set(j.id, j.name);
    }
  }

  // Build fast lookup for prize money transactions
  const prizeTxMap = new Map<string, number>();
  if (transactions) {
    for (const tx of transactions) {
      if (tx.subcategory === "prize_money" && tx.amount > 0) {
        if (tx.raceId && tx.horseId) {
          prizeTxMap.set(`${tx.raceId}:${tx.horseId}`, tx.amount);
        }
        if (tx.raceId && !prizeTxMap.has(tx.raceId)) {
          prizeTxMap.set(tx.raceId, tx.amount);
        }
      }
    }
  }

  const wins: PlayerRaceWinRecord[] = [];
  const seenWinKeys = new Set<string>();

  for (const horse of horses) {
    for (const entry of horse.raceHistory ?? []) {
      if (entry.position !== 1) continue;

      // If stableId is explicitly set to an NPC stable, this race was won
      // before or after player ownership.
      const isNpcWin =
        entry.stableId && entry.stableId !== "player" && entry.stableId !== "__player__";
      if (isNpcWin) continue;

      // Verify that this was a player victory:
      // Either horse is player-owned, stableId is player, or there is a matching prize transaction.
      const hasPrizeTx =
        prizeTxMap.has(`${entry.raceId}:${horse.id}`) || prizeTxMap.has(entry.raceId);
      const isPlayerWin =
        isPlayerOwned(horse) ||
        entry.stableId === "player" ||
        entry.stableId === "__player__" ||
        hasPrizeTx;

      if (!isPlayerWin) continue;

      const raceObj = entry.raceId ? raceMap.get(entry.raceId) : undefined;
      const totalPurse = entry.purse ?? raceObj?.purse;

      // Determine payout
      let payout = entry.purseEarned ?? 0;
      if (payout <= 0 && hasPrizeTx) {
        payout = prizeTxMap.get(`${entry.raceId}:${horse.id}`) ?? prizeTxMap.get(entry.raceId) ?? 0;
      }
      if (payout <= 0 && totalPurse && totalPurse > 0) {
        const isGraded = Boolean(entry.grade || raceObj?.graded);
        const split = isGraded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
        payout = Math.round(totalPurse * split[0]);
      }

      const day = entry.day ?? raceObj?.day ?? 0;
      const raceId = entry.raceId || `race-${day}`;
      const winKey = `${raceId}:${horse.id}`;
      if (seenWinKeys.has(winKey)) continue;
      seenWinKeys.add(winKey);

      const jockeyId = entry.jockeyId;
      const jockeyName = jockeyId ? jockeyMap.get(jockeyId) : undefined;

      wins.push({
        id: `${raceId}-${horse.id}-${day}`,
        day,
        raceId,
        raceName: entry.raceName || raceObj?.name || "Race",
        horseId: horse.id,
        horseName: horse.name,
        payout,
        purse: totalPurse,
        grade: entry.grade || raceObj?.graded?.grade,
        raceClass: entry.raceClass || raceObj?.raceClass,
        distance: entry.distance ?? raceObj?.distance,
        surface: entry.surface || raceObj?.graded?.surface,
        track: raceObj?.graded?.track,
        beyer: entry.beyer,
        jockeyId,
        jockeyName,
      });
    }
  }

  // Check for any 1st-place prize money transactions where horse raceHistory might be incomplete
  if (transactions) {
    for (const tx of transactions) {
      if (
        tx.subcategory === "prize_money" &&
        tx.amount > 0 &&
        tx.raceId &&
        tx.description.toLowerCase().includes("1st")
      ) {
        const horseId = tx.horseId || "unknown-horse";
        const winKey = `${tx.raceId}:${horseId}`;
        if (!seenWinKeys.has(winKey)) {
          seenWinKeys.add(winKey);
          const raceObj = raceMap.get(tx.raceId);
          const horseObj = horses.find((h) => h.id === tx.horseId);
          wins.push({
            id: `${tx.raceId}-${horseId}-${tx.day}`,
            day: tx.day,
            raceId: tx.raceId,
            raceName: raceObj?.name || tx.description.replace(/^Prize money: 1st in\s+/i, ""),
            horseId,
            horseName: horseObj?.name ?? "Player Horse",
            payout: tx.amount,
            grade: raceObj?.graded?.grade,
            raceClass: raceObj?.raceClass,
            distance: raceObj?.distance,
            surface: raceObj?.graded?.surface,
            track: raceObj?.graded?.track,
          });
        }
      }
    }
  }

  // Sort by day descending (newest wins first)
  return wins.sort((a, b) => b.day - a.day);
}

/**
 * Calculates aggregate summary metrics for a list of player race wins.
 *
 * @param wins - List of player race win records.
 */
export function playerRaceWinsSummary(wins: PlayerRaceWinRecord[]): PlayerRaceWinsSummary {
  const totalWins = wins.length;
  const totalEarnings = wins.reduce((acc, w) => acc + w.payout, 0);
  const averagePayout = totalWins > 0 ? Math.round(totalEarnings / totalWins) : 0;
  const topPayout = wins.reduce((max, w) => Math.max(max, w.payout), 0);
  const gradedWins = wins.filter((w) => Boolean(w.grade)).length;

  return {
    totalWins,
    totalEarnings,
    averagePayout,
    topPayout,
    gradedWins,
  };
}
