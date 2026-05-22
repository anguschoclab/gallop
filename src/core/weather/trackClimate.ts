/**
 * trackClimate.ts — Map a trackId → ClimateZone.
 *
 * Lightweight default mapping. Unknown trackIds fall back to "temperate".
 * Substring matching keyed by region/country tokens commonly embedded in
 * trackIds across the codebase.
 */

import type { ClimateZone } from "@/core/track/trackConditionData";

const SUBSTRING_RULES: Array<{ match: string; climate: ClimateZone }> = [
  { match: "dubai", climate: "arid" },
  { match: "saudi", climate: "arid" },
  { match: "meydan", climate: "arid" },
  { match: "santa-anita", climate: "arid" },
  { match: "del-mar", climate: "arid" },
  { match: "australia", climate: "humid" },
  { match: "sydney", climate: "humid" },
  { match: "melbourne", climate: "humid" },
  { match: "japan", climate: "humid" },
  { match: "tokyo", climate: "humid" },
  { match: "hong-kong", climate: "tropical" },
  { match: "sha-tin", climate: "tropical" },
  { match: "singapore", climate: "tropical" },
  { match: "brazil", climate: "tropical" },
  { match: "uk", climate: "humid" },
  { match: "ireland", climate: "humid" },
  { match: "ascot", climate: "humid" },
  { match: "epsom", climate: "humid" },
  { match: "newmarket", climate: "humid" },
  { match: "longchamp", climate: "temperate" },
  { match: "france", climate: "temperate" },
  { match: "germany", climate: "continental" },
  { match: "canada", climate: "continental" },
  { match: "woodbine", climate: "continental" },
  { match: "churchill", climate: "humid" },
  { match: "saratoga", climate: "humid" },
  { match: "belmont", climate: "humid" },
  { match: "aqueduct", climate: "humid" },
  { match: "gulfstream", climate: "tropical" },
  { match: "florida", climate: "tropical" },
];

export function getTrackClimate(trackId: string | undefined): ClimateZone {
  if (!trackId) return "temperate";
  const lower = trackId.toLowerCase();
  for (const rule of SUBSTRING_RULES) {
    if (lower.includes(rule.match)) return rule.climate;
  }
  return "temperate";
}

export type Hemisphere = "Northern" | "Southern";

// Substrings that indicate a Southern-hemisphere track.
const SOUTHERN_TOKENS = [
  "australia",
  "sydney",
  "melbourne",
  "flemington",
  "randwick",
  "caulfield",
  "rosehill",
  "brisbane",
  "perth",
  "new-zealand",
  "newzealand",
  "ellerslie",
  "trentham",
  "brazil",
  "saopaulo",
  "sao-paulo",
  "rio",
  "argentina",
  "buenos-aires",
  "san-isidro",
  "palermo",
  "chile",
  "santiago",
  "peru",
  "uruguay",
  "south-africa",
  "southafrica",
  "kenilworth",
  "turffontein",
  "greyville",
];

export function getTrackHemisphere(trackId: string | undefined): Hemisphere {
  if (!trackId) return "Northern";
  const lower = trackId.toLowerCase();
  for (const t of SOUTHERN_TOKENS) {
    if (lower.includes(t)) return "Southern";
  }
  return "Northern";
}
