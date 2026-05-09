import type { RaceSnapshot, HorseSnapshot } from "@/core/race/engine/raceSnapshotTypes";

/**
 * Interpolates horse positions between two snapshots based on a timestamp.
 *
 * @param snapshots - Array of race snapshots to interpolate between
 * @param currentTime - The target simulation time for interpolation
 * @returns Array of interpolated horse snapshots
 */
export function interpolateSnapshots(
  snapshots: RaceSnapshot[],
  currentTime: number
): HorseSnapshot[] {
  if (snapshots.length === 0) return [];
  if (currentTime <= snapshots[0].t) return snapshots[0].horses;
  if (currentTime >= snapshots[snapshots.length - 1].t) return snapshots[snapshots.length - 1].horses;

  // Find the two snapshots to interpolate between
  const nextIndex = snapshots.findIndex(s => s.t > currentTime);
  if (nextIndex === -1) return snapshots[snapshots.length - 1].horses;

  const prev = snapshots[nextIndex - 1];
  const next = snapshots[nextIndex];
  const alpha = (currentTime - prev.t) / (next.t - prev.t);

  return prev.horses.map(prevHorse => {
    const nextHorse = next.horses.find(h => h.horseId === prevHorse.horseId);
    if (!nextHorse) return prevHorse;

    return {
      horseId: prevHorse.horseId,
      position: prevHorse.position + (nextHorse.position - prevHorse.position) * alpha,
      lane: prevHorse.lane + (nextHorse.lane - prevHorse.lane) * alpha,
      velocity: prevHorse.velocity + (nextHorse.velocity - prevHorse.velocity) * alpha,
    };
  });
}

/**
 * Calculates the total duration of the race replay.
 *
 * @param snapshots - Array of race snapshots
 * @returns Total duration in simulation time units
 */
export function getReplayDuration(snapshots: RaceSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  return snapshots[snapshots.length - 1].t;
}
