/**
 * trackRegion.ts - Presentation helper mapping a track name to a racing region.
 * Derived from the REGIONS calendar config; used by regional trend charts.
 */
import { REGION_LIST } from "./regions";

let cache: Map<string, { id: string; name: string }> | null = null;

function map(): Map<string, { id: string; name: string }> {
  if (cache) return cache;
  const m = new Map<string, { id: string; name: string }>();
  for (const region of REGION_LIST) {
    for (const track of region.tracks) {
      m.set(track.toLowerCase(), { id: region.id, name: region.name });
    }
  }
  cache = m;
  return m;
}

/** Resolve a region label from a track name. Returns null when unknown. */
export function regionForTrack(track?: string): { id: string; name: string } | null {
  if (!track) return null;
  return map().get(track.toLowerCase()) ?? null;
}
