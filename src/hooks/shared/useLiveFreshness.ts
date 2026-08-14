import { useEffect, useState } from "react";
import {
  STALE_DATA_THRESHOLD_MS,
  FRESHNESS_WARNING_THRESHOLD_MS,
} from "@/constants/raceBroadcastConstants";

export type FreshnessLevel = "fresh" | "warning" | "stale";

export interface LiveFreshness {
  /** Human-readable relative time (e.g. "just now", "12s ago", "1m ago"). */
  timeAgo: string;
  /** Exact relative time in seconds (e.g. "0s ago", "1s ago", "12s ago", "60s ago"). */
  exactSecondsAgo: string;
  /** True when the timestamp has not been refreshed within the stale threshold. */
  isStale: boolean;
  /** Number of whole seconds since the last update. */
  staleSeconds: number;
  /** Color-coded freshness level: green (fresh), yellow (warning), red (stale). */
  level: FreshnessLevel;
}

/**
 * Tracks a live timestamp and reports whether the data is fresh, slowing, or stale.
 * The returned values update every second so the UI can shift from green -> yellow -> red
 * automatically as time passes without a new update.
 */
export function useLiveFreshness(timestamp: number = Date.now()): LiveFreshness {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const elapsed = Math.max(0, now - timestamp);
  const seconds = Math.floor(elapsed / 1000);
  const isStale = elapsed > STALE_DATA_THRESHOLD_MS;

  let level: FreshnessLevel;
  if (elapsed <= FRESHNESS_WARNING_THRESHOLD_MS) {
    level = "fresh";
  } else if (elapsed <= STALE_DATA_THRESHOLD_MS) {
    level = "warning";
  } else {
    level = "stale";
  }

  let timeAgo: string;
  if (seconds < 1) {
    timeAgo = "just now";
  } else if (seconds < 60) {
    timeAgo = `${seconds}s ago`;
  } else {
    timeAgo = `${Math.floor(seconds / 60)}m ago`;
  }

  const exactSecondsAgo = `${seconds}s ago`;

  return {
    timeAgo,
    exactSecondsAgo,
    isStale,
    staleSeconds: seconds,
    level,
  };
}
