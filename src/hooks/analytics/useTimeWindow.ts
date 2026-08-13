/**
 * useTimeWindow.ts - Global (cross-chart) analytics time window.
 *
 * Module-level store so every analytics chart set on any screen reads and
 * writes the same "last N weeks" value. Persisted to localStorage.
 */
import { useEffect, useState } from "react";
import type { TimeWindowWeeks } from "@/core/analytics/timeWindow";

const STORAGE_KEY = "gallop.analytics.timeWindowWeeks";
const DEFAULT_WEEKS: TimeWindowWeeks = 12;

let current: TimeWindowWeeks = DEFAULT_WEEKS;
let loaded = false;
const listeners = new Set<(w: TimeWindowWeeks) => void>();

function load(): TimeWindowWeeks {
  if (loaded || typeof window === "undefined") return current;
  loaded = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw === null ? NaN : Number(raw);
  if (!Number.isNaN(parsed)) current = parsed as TimeWindowWeeks;
  return current;
}

export function setTimeWindowWeeks(weeks: TimeWindowWeeks): void {
  current = weeks;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(weeks));
    } catch {
      /* storage unavailable — keep in-memory value */
    }
  }
  for (const l of listeners) l(weeks);
}

export function useTimeWindow(): {
  weeks: TimeWindowWeeks;
  setWeeks: (w: TimeWindowWeeks) => void;
} {
  const [weeks, setWeeks] = useState<TimeWindowWeeks>(current);

  useEffect(() => {
    const stored = load();
    if (stored !== weeks) setWeeks(stored);
    const listener = (w: TimeWindowWeeks) => setWeeks(w);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { weeks, setWeeks: setTimeWindowWeeks };
}
