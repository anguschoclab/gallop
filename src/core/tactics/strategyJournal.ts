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
