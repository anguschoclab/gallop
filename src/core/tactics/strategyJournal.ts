/**
 * strategyJournal.ts - Player race-plan journal: plans, outcomes and reflections.
 * Outcomes are derived from the horse's raceHistory, never stored twice.
 */
import type { HorseRaceHistoryEntry } from "@/core/horse/types";

export const STRATEGY_JOURNAL_MAX = 500;

export interface StrategyJournalEntry {
  id: string;
  createdDay: number;
  horseId: string;
  horseName: string;
  raceId?: string;
  raceName?: string;
  raceDay?: number;
  ridingStyle?: string;
  earlyPosition?: string;
  moveTiming?: string;
  aggressiveness?: number;
  confidence?: number;
  plan: string;
  reflection?: string;
  /** Filled in automatically once the race is run. */
  result?: {
    position: number;
    fieldSize?: number;
    prizeMoney: number;
    beyer?: number;
    /** Stable cash balance right after the result landed. */
    cashAfter: number;
    filledDay: number;
  };
}

/** Record actual results for any journal plans whose race has now been run. */
export function fillJournalOutcomes(
  list: StrategyJournalEntry[] | undefined,
  horses: Record<string, { raceHistory?: HorseRaceHistoryEntry[] } | undefined>,
  cash: number,
  day: number,
): StrategyJournalEntry[] | undefined {
  if (!list?.length) return list;
  let changed = false;
  const next = list.map((e) => {
    if (e.result || !e.raceId) return e;
    const run = horses[e.horseId]?.raceHistory?.find((h) => h.raceId === e.raceId);
    if (!run) return e;
    changed = true;
    return {
      ...e,
      result: {
        position: run.position,
        fieldSize: run.fieldSize,
        prizeMoney: run.purseEarned ?? 0,
        beyer: run.beyer,
        cashAfter: Math.round(cash),
        filledDay: day,
      },
    };
  });
  return changed ? next : list;
}

export type NewJournalEntry = Omit<StrategyJournalEntry, "id">;

export function addJournalEntry(
  list: StrategyJournalEntry[] | undefined,
  entry: NewJournalEntry,
): StrategyJournalEntry[] {
  const id = `sj-${entry.createdDay}-${entry.horseId}-${(list?.length ?? 0) + 1}-${Math.floor(Math.random() * 1e6)}`;
  return [{ ...entry, id }, ...(list ?? [])].slice(0, STRATEGY_JOURNAL_MAX);
}

export function updateJournalEntry(
  list: StrategyJournalEntry[] | undefined,
  id: string,
  patch: Partial<StrategyJournalEntry>,
): StrategyJournalEntry[] {
  return (list ?? []).map((e) => (e.id === id ? { ...e, ...patch, id } : e));
}

export function removeJournalEntry(list: StrategyJournalEntry[] | undefined, id: string) {
  return (list ?? []).filter((e) => e.id !== id);
}

export type JournalOutcome =
  | { status: "pending" }
  | { status: "no-race" }
  | { status: "missing" }
  | { status: "run"; position: number; fieldSize?: number; earned: number; beyer?: number };

export function journalOutcome(
  entry: StrategyJournalEntry,
  history: HorseRaceHistoryEntry[] | undefined,
  currentDay: number,
): JournalOutcome {
  if (!entry.raceId) return { status: "no-race" };
  if (entry.result)
    return {
      status: "run",
      position: entry.result.position,
      fieldSize: entry.result.fieldSize,
      earned: entry.result.prizeMoney,
      beyer: entry.result.beyer,
    };
  const run = history?.find((h) => h.raceId === entry.raceId);
  if (run)
    return {
      status: "run",
      position: run.position,
      fieldSize: run.fieldSize,
      earned: run.purseEarned ?? 0,
      beyer: run.beyer,
    };
  if (entry.raceDay !== undefined && entry.raceDay >= currentDay) return { status: "pending" };
  return { status: "missing" };
}
