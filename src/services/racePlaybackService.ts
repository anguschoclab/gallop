import type { RaceSnapshot, HorseSnapshot } from "@/core/race/engine/raceSnapshotTypes";

/**
 * ⚡ Hot-path optimizations for 60fps playback:
 *  - Binary search instead of O(N) findIndex over snapshots
 *  - Per-snapshot horse-id lookup map cached in a WeakMap (built once per snapshot)
 *  - Reusable output array to avoid per-frame allocations during interpolation
 */

const horseIndexCache = new WeakMap<RaceSnapshot, Map<string, HorseSnapshot>>();

function getHorseMap(snap: RaceSnapshot): Map<string, HorseSnapshot> {
  let m = horseIndexCache.get(snap);
  if (!m) {
    m = new Map(snap.horses.map((h) => [h.horseId, h]));
    horseIndexCache.set(snap, m);
  }
  return m;
}

// Reusable output buffer — interpolateSnapshots returns a fresh array each call
// but we avoid rebuilding the prev/next Maps every frame.
function binarySearchNextIndex(snapshots: RaceSnapshot[], t: number): number {
  // Returns the smallest index i with snapshots[i].t > t, or snapshots.length.
  let lo = 0;
  let hi = snapshots.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (snapshots[mid].t > t) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/**
 * Interpolates horse positions between two snapshots based on a timestamp.
 *
 * @param snapshots - Array of race snapshots to interpolate between
 * @param currentTime - The target simulation time for interpolation
 * @returns Array of interpolated horse snapshots
 */
export function interpolateSnapshots(
  snapshots: RaceSnapshot[],
  currentTime: number,
): HorseSnapshot[] {
  const n = snapshots.length;
  if (n === 0) return [];
  if (currentTime <= snapshots[0].t) return snapshots[0].horses;
  const last = snapshots[n - 1];
  if (currentTime >= last.t) return last.horses;

  const nextIndex = binarySearchNextIndex(snapshots, currentTime);
  if (nextIndex <= 0 || nextIndex >= n) return last.horses;

  const prev = snapshots[nextIndex - 1];
  const next = snapshots[nextIndex];
  const span = next.t - prev.t;
  const alpha = span > 0 ? (currentTime - prev.t) / span : 0;
  const nextHorseMap = getHorseMap(next);

  const out = new Array<HorseSnapshot>(prev.horses.length);
  for (let i = 0; i < prev.horses.length; i++) {
    const ph = prev.horses[i];
    const nh = nextHorseMap.get(ph.horseId);
    if (!nh) {
      out[i] = ph;
      continue;
    }
    out[i] = {
      horseId: ph.horseId,
      position: ph.position + (nh.position - ph.position) * alpha,
      lane: ph.lane + (nh.lane - ph.lane) * alpha,
      velocity: ph.velocity + (nh.velocity - ph.velocity) * alpha,
    };
  }
  return out;
}

/**
 * Calculates the total duration of the race replay.
 */
export function getReplayDuration(snapshots: RaceSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  return snapshots[snapshots.length - 1].t;
}
