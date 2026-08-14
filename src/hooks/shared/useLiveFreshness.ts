import { useEffect, useState } from "react";
import { STALE_DATA_THRESHOLD_MS } from "@/constants/raceBroadcastConstants";

export interface LiveFreshness {
  /** Human-readable relative time (e.g. "just now", "12s ago"). */
  timeAgo: string;
  /** True when the timestamp has not been refreshed within the stale threshold. */
  isStale: boolean;
  /** Number of whole seconds since the last update. */
  staleSeconds: number;
}

/**
 * Tracks a live timestamp and reports whether the data has gone stale.
 * The returned values update every second so the UI can flip from "Live"
 * to "Stale data" automatically.
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

  let timeAgo: string;
  if (seconds < 1) {
    timeAgo = "just now";
  } else if (seconds < 60) {
    timeAgo = `${seconds}s ago`;
  } else {
    timeAgo = `${Math.floor(seconds / 60)}m ago`;
  }

  return {
    timeAgo,
    isStale,
    staleSeconds: seconds,
  };
}
