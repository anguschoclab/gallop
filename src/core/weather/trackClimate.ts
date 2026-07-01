/**
 * trackClimate.ts — Map a trackId → ClimateZone and Hemisphere.
 *
 * Uses TRACK_KOPPEN_MAP for climate determination and TRACK_BY_ID for
 * hemisphere determination via country lookup.
 */

import type { ClimateZone } from "@/core/race/trackConditionData";
import type { KoppenCode } from "./koppenTypes";
import { getTrackKoppen } from "./trackKoppenMappings";
import { TRACK_BY_ID } from "@/data/tracks";

const KOPPEN_TO_CLIMATE: Record<KoppenCode, ClimateZone> = {
  Cfb: "temperate",
  Cfa: "temperate",
  Csa: "warm",
  Csb: "warm",
  BWh: "arid",
  BSk: "arid",
  Dfb: "continental",
  Dfa: "continental",
  Aw: "tropical",
  Af: "tropical",
  ET: "cool",
};

export function getTrackClimate(trackId: string | undefined): ClimateZone {
  if (!trackId) return "temperate";
  const koppen = getTrackKoppen(trackId);
  return KOPPEN_TO_CLIMATE[koppen] ?? "temperate";
}

export type Hemisphere = "Northern" | "Southern";

const SOUTHERN_COUNTRIES = new Set(["Australia", "New Zealand", "Argentina", "Brazil", "Chile"]);

export function getTrackHemisphere(trackId: string | undefined): Hemisphere {
  if (!trackId) return "Northern";
  const track = TRACK_BY_ID[trackId];
  if (!track) return "Northern";
  return SOUTHERN_COUNTRIES.has(track.country) ? "Southern" : "Northern";
}
