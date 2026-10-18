/**
 * campaignHistory.ts - Derives the player's campaign history (each race start since the
 * campaign start day) with its prize money, prestige, class wins and — when a daily
 * price snapshot exists — the horse's market value at the end of that race day.
 */
import type { Horse } from "@/domains/horse/simulation/types";
import type { TrackLedgerEntry } from "@/domains/history/simulation/trackLedger";
import { PLAYER_LEDGER_STABLE_ID } from "@/domains/history/simulation/trackLedger";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import {
  raceGoalClass,
  type GoalClass,
  type StableGoals,
} from "@/domains/stable/simulation/stableGoals";
import {
  journalOutcome,
  type JournalOutcome,
  type StrategyJournalEntry,
} from "@/domains/tactics/simulation/strategyJournal";

export interface CampaignHistoryRow {
  raceId: string;
  day: number;
  horseId: string;
  horseName: string;
  raceName: string;
  goalClass: GoalClass | null;
  position: number;
  fieldSize?: number;
  prize: number;
  /** Running prize total since the campaign started. */
  cumulativePrize: number;
  /** Horse's market value at the end of the race day; null when no daily snapshot exists. */
  value: number | null;
  /** Change vs the horse's latest snapshot before the race day; null when either side is missing. */
  valueDelta: number | null;
  /** Prize + valueDelta — the race's full net-worth impact; null when valueDelta is missing. */
  netDelta: number | null;
  /** Linked strategy-journal plan for this race, when one was journaled. */
  plan?: { text: string; outcome: JournalOutcome };
  /** Player prestige change from this race, null when unrecorded. */
  prestige: number | null;
  cumulativePrestige: number;
  /** True when the win counted toward an open class goal. */
  countedForGoal: boolean;
  /** Running wins in this row's class after this race. */
  classWinsAfter: number;
}

/** Per-horse daily price series (matches `RankingsHistory` and `HorseDailyProgress`). */
export type DailyPriceSeries = Record<string, readonly { day: number; price: number }[]>;

export function buildCampaignHistory(
  goals: Pick<StableGoals, "startDay" | "classGoals">,
  horses: Horse[],
  ledger: TrackLedgerEntry[],
  priceHistories?: DailyPriceSeries[],
  journal?: StrategyJournalEntry[],
  currentDay?: number,
): CampaignHistoryRow[] {
  const prestigeByRace = new Map<string, number>();
  for (const e of ledger) {
    const d = e.prestigeDeltas.find((p) => p.isPlayer || p.stableId === PLAYER_LEDGER_STABLE_ID);
    if (d) prestigeByRace.set(e.raceId, (prestigeByRace.get(e.raceId) ?? 0) + d.delta);
  }
  // Per-horse day → price map; earlier sources win on overlapping days.
  const priceByDay = new Map<string, Map<number, number>>();
  for (const source of priceHistories ?? []) {
    for (const [horseId, entries] of Object.entries(source)) {
      let map = priceByDay.get(horseId);
      if (!map) priceByDay.set(horseId, (map = new Map()));
      for (const e of entries) if (!map.has(e.day)) map.set(e.day, e.price);
    }
  }
  const valueAt = (horseId: string, day: number): number | null =>
    priceByDay.get(horseId)?.get(day) ?? null;
  const previousPrice = (horseId: string, day: number): number | null => {
    const map = priceByDay.get(horseId);
    if (!map) return null;
    let prev: number | null = null;
    let prevDay = -Infinity;
    for (const [d, price] of map) {
      if (d < day && d > prevDay) {
        prevDay = d;
        prev = price;
      }
    }
    return prev;
  };
  // raceId:horseId → journal entry; first match wins.
  const journalByRace = new Map<string, StrategyJournalEntry>();
  for (const j of journal ?? []) {
    if (j.raceId && !journalByRace.has(`${j.raceId}:${j.horseId}`)) {
      journalByRace.set(`${j.raceId}:${j.horseId}`, j);
    }
  }
  const horsesById = new Map(horses.map((h) => [h.id, h]));
  const raw: Omit<
    CampaignHistoryRow,
    "cumulativePrize" | "cumulativePrestige" | "countedForGoal" | "classWinsAfter"
  >[] = [];
  for (const h of horses) {
    if (!isPlayerOwned(h)) continue;
    for (const r of h.raceHistory ?? []) {
      if (r.day < goals.startDay) continue;
      const g = r.grade === "G1" || r.grade === "G2" || r.grade === "G3" ? r.grade : undefined;
      const value = valueAt(h.id, r.day);
      const prevPrice = previousPrice(h.id, r.day);
      const valueDelta = value !== null && prevPrice !== null ? value - prevPrice : null;
      const journalEntry = journalByRace.get(`${r.raceId}:${h.id}`);
      raw.push({
        raceId: r.raceId,
        day: r.day,
        horseId: h.id,
        horseName: h.name,
        raceName: r.raceName,
        goalClass: raceGoalClass({
          graded: g ? ({ grade: g } as never) : undefined,
          raceClass: r.raceClass as never,
        }),
        position: r.position,
        fieldSize: r.fieldSize,
        prize: r.purseEarned ?? 0,
        value,
        valueDelta,
        netDelta: valueDelta !== null ? (r.purseEarned ?? 0) + valueDelta : null,
        plan: journalEntry
          ? {
              text: journalEntry.plan,
              outcome: journalOutcome(
                journalEntry,
                horsesById.get(journalEntry.horseId)?.raceHistory,
                currentDay ?? 0,
              ),
            }
          : undefined,
        prestige: prestigeByRace.has(r.raceId) ? prestigeByRace.get(r.raceId)! : null,
      });
    }
  }
  raw.sort((a, b) => a.day - b.day || a.raceId.localeCompare(b.raceId));
  const wins: Record<GoalClass, number> = { G1: 0, G2: 0, G3: 0, Stakes: 0 };
  const seenPrestige = new Set<string>();
  let prize = 0;
  let prestige = 0;
  return raw.map((r) => {
    prize += r.prize;
    // A race with two player runners shares one ledger delta — count it once.
    let p = r.prestige;
    if (p !== null && seenPrestige.has(r.raceId)) p = 0;
    if (p !== null) seenPrestige.add(r.raceId);
    prestige += p ?? 0;
    let counted = false;
    if (r.goalClass && r.position === 1) {
      counted = wins[r.goalClass] < (goals.classGoals[r.goalClass] ?? 0);
      wins[r.goalClass]++;
    }
    return {
      ...r,
      prestige: p,
      cumulativePrize: prize,
      cumulativePrestige: prestige,
      countedForGoal: counted,
      classWinsAfter: r.goalClass ? wins[r.goalClass] : 0,
    };
  });
}
