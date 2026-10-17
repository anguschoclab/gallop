/**
 * periodComparison.ts - Compare the player's racing results across two day ranges:
 * wins, earnings, per-class starts/wins/places, and prestige movement.
 */
import type { Horse } from "@/core/horse/types";
import type { Transaction } from "@/core/transactions/transactionTypes";
import { buildPrizeTxMap, isPlayerRaceEntry, type PlayerRaceWinRecord } from "./raceWins";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";
import { raceGoalClass, type StableGoals } from "./stableGoals";
import type { Race } from "@/core/race/types";

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
  includedRaces?: PeriodRace[],
): PeriodStats {
  const starts = includedRaces && new Set(includedRaces.map((r) => `${r.raceId}:${r.horseId}`));
  const raceIds = includedRaces && new Set(includedRaces.map((r) => r.raceId));
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
    if (starts && !starts.has(`${w.raceId}:${w.horseId}`)) continue;
    out.wins++;
    out.earnings += w.payout ?? 0;
    if (w.grade && /^G[123]$/.test(w.grade)) out.gradedWins++;
    cls(classKey(w.grade, w.raceClass)).wins++;
  }
  for (const e of ledger) {
    if (!inRange(e.day, range)) continue;
    if (raceIds && !raceIds.has(e.raceId)) continue;
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

export interface PeriodRace {
  day: number;
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  position: number;
  fieldSize?: number;
  prize: number;
  grade?: string;
  raceClass?: string;
}

/**
 * Lists every race the player's stable started within a day range —
 * all placings, not just wins — sorted by prize descending then day
 * descending. Attribution mirrors `derivePlayerRaceWins`: player-era entries
 * survive on horses that were later sold (matched via `stableId` stamps and
 * prize-money transactions), while entries stamped to an NPC stable are
 * excluded even if the horse is player-owned today.
 *
 * @param horses - Horses whose race histories are scanned for in-range starts.
 * @param range - Day range to filter entries.
 * @param transactions - Optional transactions used to attribute entries via prize money.
 */
export function periodRaces(
  horses: Horse[],
  range: DayRange,
  transactions?: Transaction[],
): PeriodRace[] {
  const prizeTxMap = buildPrizeTxMap(transactions);
  const out: PeriodRace[] = [];
  for (const horse of horses) {
    for (const entry of horse.raceHistory ?? []) {
      if (!inRange(entry.day ?? 0, range)) continue;
      if (!isPlayerRaceEntry(horse, entry, prizeTxMap)) continue;
      const raceId = entry.raceId ?? "";
      let prize = entry.purseEarned ?? 0;
      if (prize <= 0 && raceId) {
        prize = prizeTxMap.get(`${raceId}:${horse.id}`) ?? prizeTxMap.get(raceId) ?? 0;
      }
      out.push({
        day: entry.day ?? 0,
        raceId,
        raceName: entry.raceName || "Race",
        horseId: horse.id,
        horseName: horse.name,
        position: entry.position,
        fieldSize: entry.fieldSize,
        prize,
        grade: entry.grade,
        raceClass: entry.raceClass,
      });
    }
  }
  return out.sort((a, b) => b.prize - a.prize || b.day - a.day);
}

export function pctChange(a: number, b: number): number | null {
  if (a === 0) return b === 0 ? 0 : null;
  return ((b - a) / Math.abs(a)) * 100;
}

export type CampaignHistoryFilter = "all" | "campaign" | "goal-wins";

/**
 * Filter attributed period starts, preserving their date and ownership boundaries.
 * @param races
 * @param filter
 * @param goals
 */
export function filterPeriodCampaignRaces(
  races: PeriodRace[],
  filter: CampaignHistoryFilter,
  goals: Pick<StableGoals, "startDay" | "classGoals"> | undefined,
): PeriodRace[] {
  if (filter === "all") return races;
  if (!goals) return [];
  return races.filter((r) => {
    if (r.day < goals.startDay) return false;
    if (filter === "campaign") return true;
    const goalClass = raceGoalClass({ raceClass: (r.grade || r.raceClass) as Race["raceClass"] });
    return r.position === 1 && goalClass !== null && (goals.classGoals[goalClass] ?? 0) > 0;
  });
}
