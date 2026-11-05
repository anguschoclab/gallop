/**
 * realHorses.ts - Real horses from free public data (Wikidata + Wikipedia).
 *
 * Read-only snapshot built by `scripts/buildRealHorses.ts`. Every horse here
 * is a real animal: name, foaling year, sire/dam links, and — where its
 * Wikipedia article has a racehorse infobox — its real race record, earnings
 * (converted to approximate USD), big-race wins, awards and Timeform rating.
 *
 * Bundled rather than fetched so worlds stay deterministic and offline.
 *
 * Related files: pedigreeData.ts (legacy family-tree horses),
 *   stallionDNAData.ts (real-record stallion research), almanac Real Horses tab.
 */

import snapshot from "@/shared/data/realHorses.json";

export type RealHorse = {
  /** Wikidata id, e.g. "Q1347325". */
  id: string;
  name: string;
  sex?: "M" | "F";
  gelding?: boolean;
  foaled?: number;
  died?: number;
  country?: string;
  colour?: string;
  breed?: string;
  /** Wikidata id of the sire (always another row in the snapshot). */
  sire?: string;
  /** Wikidata id of the dam (always another row in the snapshot). */
  dam?: string;
  starts?: number;
  wins?: number;
  seconds?: number;
  thirds?: number;
  /** Career earnings converted to approximate USD. */
  earningsUsd?: number;
  timeform?: number;
  majorWins?: string[];
  awards?: string[];
  trainer?: string;
  breeder?: string;
  /** English Wikipedia article slug. */
  wiki?: string;
};

type Snapshot = { source: string; builtAt: string; horses: RealHorse[] };
const data = snapshot as Snapshot;

export const REAL_HORSE_SOURCE = data.source;
export const REAL_HORSE_BUILT_AT = data.builtAt;
export const realHorses: readonly RealHorse[] = data.horses;

export const realHorseById = new Map<string, RealHorse>(realHorses.map((h) => [h.id, h]));

/** How much of a real career we know — used to pick between same-named horses. */
function richness(h: RealHorse): number {
  return (h.starts ? 4 : 0) + (h.wiki ? 2 : 0) + (h.majorWins?.length ? 1 : 0) + (h.foaled ? 0.5 : 0);
}

const byName = new Map<string, RealHorse>();
for (const h of realHorses) {
  const key = h.name.toLowerCase();
  const prev = byName.get(key);
  if (!prev || richness(h) > richness(prev)) byName.set(key, h);
}

/**
 * Real horse by name (case-insensitive). When several real horses share a
 * name, the one with the best-documented career wins.
 *
 * @param name - Horse name
 */
export function findRealHorse(name: string): RealHorse | undefined {
  return byName.get(name.toLowerCase());
}

export function realSireName(h: RealHorse): string | undefined {
  return h.sire ? realHorseById.get(h.sire)?.name : undefined;
}

export function realDamName(h: RealHorse): string | undefined {
  return h.dam ? realHorseById.get(h.dam)?.name : undefined;
}

/** Win strike rate 0-1, or undefined without a known record. */
export function realWinRate(h: RealHorse): number | undefined {
  return h.starts && h.starts > 0 ? (h.wins ?? 0) / h.starts : undefined;
}

/** Real horses with a known race record. */
export function realHorsesWithRecords(): RealHorse[] {
  return realHorses.filter((h) => (h.starts ?? 0) > 0);
}

export function realHorseWikiUrl(h: RealHorse): string | undefined {
  return h.wiki ? `https://en.wikipedia.org/wiki/${h.wiki}` : undefined;
}
