import { useEffect, useState } from "react";

/**
 * Formats a timestamp as a relative string that updates every second.
 * Useful for live indicators (e.g. "just now", "2s ago").
 */
export function useTimeAgo(timestamp: number): string {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
