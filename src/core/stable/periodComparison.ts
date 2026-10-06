/**
 * periodComparison.ts - Compare the player's racing results across two day ranges:
 * wins, earnings, per-class starts/wins/places, and prestige movement.
 */
import type { PlayerRaceWinRecord } from "./raceWins";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";

export interface DayRange {
  from: number;
  to: number;
}

export interface ClassResult {
  starts: number;
  wins: number;
  prestige: number;
}

export interface PeriodStats {
  wins: number;
  earnings: number;
  gradedWins: number;
  starts: number;
  prestige: number;
  byClass: Record<string, ClassResult>;
}

export const inRange = (day: number, r: DayRange) =>
  day >= Math.min(r.from, r.to) && day <= Math.max(r.from, r.to);

export function classKey(grade?: string, raceClass?: string): string {
  return grade || raceClass || "Ungraded";
}

export function periodStats(
  wins: PlayerRaceWinRecord[],
  ledger: TrackLedgerEntry[],
  range: DayRange,
): PeriodStats {
  const out: PeriodStats = {
    wins: 0,
    earnings: 0,
    gradedWins: 0,
    starts: 0,
    prestige: 0,
    byClass: {},
  };
  const cls = (k: string) => (out.byClass[k] ??= { starts: 0, wins: 0, prestige: 0 });
  for (const w of wins) {
    if (!inRange(w.day, range)) continue;
    out.wins++;
    out.earnings += w.payout ?? 0;
    if (w.grade && /^G[123]$/.test(w.grade)) out.gradedWins++;
    cls(classKey(w.grade, w.raceClass)).wins++;
  }
  for (const e of ledger) {
    if (!inRange(e.day, range)) continue;
    const mine = e.prestigeDeltas.find((d) => d.isPlayer);
    if (!mine && !e.winnerIsPlayer) continue;
    out.starts++;
    out.prestige += mine?.delta ?? 0;
    const c = cls(classKey(e.grade, e.raceClass));
    c.starts++;
    c.prestige += mine?.delta ?? 0;
  }
  return out;
}

export function pctChange(a: number, b: number): number | null {
  if (a === 0) return b === 0 ? 0 : null;
  return ((b - a) / Math.abs(a)) * 100;
}
