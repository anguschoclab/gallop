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

/**
 * Record actual results for any journal plans whose race has now been run.
 * @param list
 * @param horses
 * @param cash
 * @param day
 */
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

export type PlanDimension =
  "ridingStyle" | "earlyPosition" | "moveTiming" | "aggression" | "source";

export interface PlanEffectivenessRow {
  key: string;
  runs: number;
  wins: number;
  places: number;
  winRate: number;
  placeRate: number;
  avgFinish: number;
  prizeMoney: number;
  /** 0-100, shrunk toward the journal average for small samples. */
  score: number;
}

function dimensionKey(e: StrategyJournalEntry, dim: PlanDimension): string {
  switch (dim) {
    case "ridingStyle":
      return e.ridingStyle ?? "Custom plan";
    case "earlyPosition":
      return e.earlyPosition ?? "Custom plan";
    case "moveTiming":
      return e.moveTiming ?? "Custom plan";
    case "aggression":
      if (e.aggressiveness === undefined) return "Custom plan";
      return e.aggressiveness < 40
        ? "Patient (0-39)"
        : e.aggressiveness < 70
          ? "Balanced (40-69)"
          : "Aggressive (70-100)";
    case "source":
      return e.ridingStyle ? "Race Advisor plan" : "Custom plan";
  }
}

const PRIOR_RUNS = 3;

function rawScore(winRate: number, placeRate: number, finishQuality: number) {
  return 100 * (0.6 * winRate + 0.3 * placeRate + 0.1 * finishQuality);
}

/**
 * How often each plan type wins, from journal entries that have a recorded result.
 * @param list
 * @param dim
 */
export function planEffectiveness(
  list: StrategyJournalEntry[] | undefined,
  dim: PlanDimension,
): PlanEffectivenessRow[] {
  const runs = (list ?? []).filter((e) => e.result);
  if (runs.length === 0) return [];
  const quality = (e: StrategyJournalEntry) => {
    const f = e.result!.fieldSize ?? 0;
    return f > 1 ? 1 - (e.result!.position - 1) / (f - 1) : e.result!.position === 1 ? 1 : 0;
  };
  const overall = rawScore(
    runs.filter((e) => e.result!.position === 1).length / runs.length,
    runs.filter((e) => e.result!.position <= 3).length / runs.length,
    runs.reduce((s, e) => s + quality(e), 0) / runs.length,
  );
  const groups = new Map<string, StrategyJournalEntry[]>();
  for (const e of runs) {
    const k = dimensionKey(e, dim);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([key, es]) => {
      const n = es.length;
      const wins = es.filter((e) => e.result!.position === 1).length;
      const places = es.filter((e) => e.result!.position <= 3).length;
      const raw = rawScore(wins / n, places / n, es.reduce((s, e) => s + quality(e), 0) / n);
      return {
        key,
        runs: n,
        wins,
        places,
        winRate: wins / n,
        placeRate: places / n,
        avgFinish: es.reduce((s, e) => s + e.result!.position, 0) / n,
        prizeMoney: es.reduce((s, e) => s + e.result!.prizeMoney, 0),
        score: Math.round((raw * n + overall * PRIOR_RUNS) / (n + PRIOR_RUNS)),
      };
    })
    .sort((a, b) => b.score - a.score || b.runs - a.runs);
}
