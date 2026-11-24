/**
 * raceResultsLedger.ts - Per-start results for the player's horses
 *
 * Joins each player horse's race record with the cash ledger (entry fees) and
 * the manager reputation log so every start shows its finish, prize money,
 * net cash effect and prestige change. Pure; no store access.
 */

import type { Horse } from "@/domains/horse/simulation/types";
import type { Transaction } from "@/domains/transactions/model/transactionTypes";
import type { ReputationEvent } from "@/domains/reputation/model/reputationTypes";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";

export type RaceResultRow = {
  key: string;
  day: number;
  raceId: string;
  raceName: string;
  grade?: string;
  horseId: string;
  horseName: string;
  position: number;
  fieldSize?: number;
  prize: number;
  entryFee: number;
  /** Riding fee plus the jockey's cut of any prize money. */
  jockeyFee: number;
  /** Prize money minus entry fee and jockey fees. */
  cashNet: number;
  /** Sum of reputation changes recorded for this start. */
  prestige: number;
};

export type RaceResultsSummary = {
  starts: number;
  wins: number;
  places: number;
  prize: number;
  entryFees: number;
  jockeyFees: number;
  cashNet: number;
  prestige: number;
};

export function buildRaceResults(args: {
  horses: Horse[];
  transactions: Transaction[];
  reputationEvents: ReputationEvent[];
}): RaceResultRow[] {
  const fees = new Map<string, number>();
  const jockeyFees = new Map<string, number>();
  for (const tx of args.transactions) {
    if (!tx.raceId) continue;
    const k = `${tx.raceId}|${tx.horseId ?? ""}`;
    if (tx.subcategory === "entry_fee") {
      fees.set(k, (fees.get(k) ?? 0) + Math.abs(tx.amount));
    } else if (tx.subcategory === "jockey_fee") {
      jockeyFees.set(k, (jockeyFees.get(k) ?? 0) + Math.abs(tx.amount));
    }
  }
  const rows: RaceResultRow[] = [];
  for (const horse of args.horses) {
    if (!isPlayerOwned(horse)) continue;
    for (const r of horse.raceHistory ?? []) {
      if (r.offscreen) continue;
      const prize = Math.max(0, r.purseEarned ?? 0);
      const entryFee = fees.get(`${r.raceId}|${horse.id}`) ?? 0;
      const jockeyFee = jockeyFees.get(`${r.raceId}|${horse.id}`) ?? 0;
      const prestige = args.reputationEvents
        .filter((e) => e.raceId === r.raceId && (!e.horseId || e.horseId === horse.id))
        .reduce((sum, e) => sum + e.amount, 0);
      rows.push({
        key: `${r.raceId}|${horse.id}`,
        day: r.day,
        raceId: r.raceId,
        raceName: r.raceName,
        grade: r.grade,
        horseId: horse.id,
        horseName: horse.name,
        position: r.position,
        fieldSize: r.fieldSize,
        prize,
        entryFee,
        jockeyFee,
        cashNet: prize - entryFee - jockeyFee,
        prestige,
      });
    }
  }
  return rows.sort((a, b) => b.day - a.day || a.position - b.position);
}

export function summarizeRaceResults(rows: RaceResultRow[]): RaceResultsSummary {
  return rows.reduce<RaceResultsSummary>(
    (s, r) => ({
      starts: s.starts + 1,
      wins: s.wins + (r.position === 1 ? 1 : 0),
      places: s.places + (r.position <= 3 ? 1 : 0),
      prize: s.prize + r.prize,
      entryFees: s.entryFees + r.entryFee,
      jockeyFees: s.jockeyFees + r.jockeyFee,
      cashNet: s.cashNet + r.cashNet,
      prestige: s.prestige + r.prestige,
    }),
    {
      starts: 0,
      wins: 0,
      places: 0,
      prize: 0,
      entryFees: 0,
      jockeyFees: 0,
      cashNet: 0,
      prestige: 0,
    },
  );
}
