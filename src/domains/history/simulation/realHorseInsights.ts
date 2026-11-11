/**
 * realHorseInsights.ts - Almanac insights over real horses
 *
 * Pure derivations over the real-horse snapshot (Wikidata + Wikipedia):
 * leaderboards of real careers, a name search, real ancestry lines, and the
 * real careers closest to a game horse's own record.
 *
 * Related files: src/shared/data/realHorses.ts, src/domains/history/ui/RealHorsesPanel.tsx
 */

import {
  realHorseById,
  realHorses,
  realHorsesWithRecords,
  realWinRate,
  type RealHorse,
} from "@/shared/data/realHorses";

export type RealLeaderboardKind = "wins" | "earnings" | "timeform" | "unbeaten" | "bigWins";

export const REAL_LEADERBOARD_LABELS: Record<RealLeaderboardKind, string> = {
  wins: "Most wins",
  earnings: "Highest earnings",
  timeform: "Highest Timeform",
  unbeaten: "Unbeaten careers",
  bigWins: "Most big-race wins",
};

/** Smallest career that counts as "unbeaten" (so one-race horses don't top it). */
export const UNBEATEN_MIN_STARTS = 5;

/**
 * Top real horses for a leaderboard.
 *
 * @param kind - Which leaderboard
 * @param limit - Rows to return
 */
export function realLeaderboard(kind: RealLeaderboardKind, limit = 25): RealHorse[] {
  const rows = realHorsesWithRecords();
  const pick = (score: (h: RealHorse) => number, pool: RealHorse[] = rows) =>
    pool
      .map((h) => ({ h, s: score(h) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.h.name.localeCompare(b.h.name))
      .slice(0, limit)
      .map((x) => x.h);
  switch (kind) {
    case "wins":
      return pick((h) => h.wins ?? 0);
    case "earnings":
      return pick((h) => h.earningsUsd ?? 0);
    case "timeform":
      return pick((h) => h.timeform ?? 0, realHorses as RealHorse[]);
    case "unbeaten":
      return pick(
        (h) => h.starts ?? 0,
        rows.filter((h) => (h.starts ?? 0) >= UNBEATEN_MIN_STARTS && h.wins === h.starts),
      );
    case "bigWins":
      return pick((h) => h.majorWins?.length ?? 0, realHorses as RealHorse[]);
  }
}

/**
 * Real horses whose name contains the query (best-documented first).
 *
 * @param query - Search text
 * @param limit - Rows to return
 */
export function searchRealHorses(query: string, limit = 30): RealHorse[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return realHorses
    .filter((h) => h.name.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase() === q) - Number(a.name.toLowerCase() === q) ||
        (b.starts ?? 0) - (a.starts ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

export type RealAncestry = {
  sire?: RealHorse;
  dam?: RealHorse;
  damsire?: RealHorse;
  sireline: RealHorse[];
};

/**
 * Parents, damsire, and the male line back as far as the data goes.
 *
 * @param h - Real horse
 * @param maxSireline - Generations to follow up the sire line
 */
export function realAncestry(h: RealHorse, maxSireline = 12): RealAncestry {
  const sire = h.sire ? realHorseById.get(h.sire) : undefined;
  const dam = h.dam ? realHorseById.get(h.dam) : undefined;
  const damsire = dam?.sire ? realHorseById.get(dam.sire) : undefined;
  const sireline: RealHorse[] = [];
  let cur = sire;
  const seen = new Set<string>();
  while (cur && sireline.length < maxSireline && !seen.has(cur.id)) {
    seen.add(cur.id);
    sireline.push(cur);
    cur = cur.sire ? realHorseById.get(cur.sire) : undefined;
  }
  return { sire, dam, damsire, sireline };
}

export type CareerMatch = { horse: RealHorse; distance: number };

/**
 * Real careers nearest a game horse's record. Compares win strike rate,
 * starts (log scale) and earnings (log scale); horses need a known record.
 *
 * @param career - Game horse career
 * @param career.starts - Career starts
 * @param career.wins - Career wins
 * @param career.earnings - Lifetime earnings in USD
 * @param limit - Matches to return
 */
export function closestRealCareers(
  career: { starts: number; wins: number; earnings: number },
  limit = 3,
): CareerMatch[] {
  if (career.starts <= 0) return [];
  const wr = career.wins / career.starts;
  const ls = Math.log10(career.starts + 1);
  const le = Math.log10(career.earnings + 1);
  return realHorsesWithRecords()
    .filter((h) => h.earningsUsd !== undefined)
    .map((h) => {
      const d =
        Math.abs((realWinRate(h) ?? 0) - wr) * 3 +
        Math.abs(Math.log10((h.starts ?? 0) + 1) - ls) +
        Math.abs(Math.log10((h.earningsUsd ?? 0) + 1) - le) * 0.5;
      return { horse: h, distance: Number(d.toFixed(4)) };
    })
    .sort((a, b) => a.distance - b.distance || a.horse.name.localeCompare(b.horse.name))
    .slice(0, limit);
}

/** One documented real race finish (from the horse's Wikipedia infobox). */
export type RealRaceFinish = { race: string; year?: number; position: 1 };

/** A real horse's documented race history, grouped by season. */
export type RealRaceHistory = {
  finishes: RealRaceFinish[];
  seasons: { year: number | undefined; finishes: RealRaceFinish[] }[];
  starts?: number;
  wins?: number;
  seconds?: number;
  thirds?: number;
  /** Career prize money (≈USD). Per-race prize is not published in the source. */
  earningsUsd?: number;
  earningsPerStart?: number;
  /** Wins we know of but whose race name isn't documented. */
  undocumentedWins: number;
};

/**
 * Parses "Epsom Derby (1970)" style entries into real finishes, oldest first.
 * @param h
 */
export function realRaceHistory(h: {
  majorWins?: string[];
  starts?: number;
  wins?: number;
  seconds?: number;
  thirds?: number;
  earningsUsd?: number;
}): RealRaceHistory {
  const finishes: RealRaceFinish[] = (h.majorWins ?? []).map((raw) => {
    const m = raw.match(/^(.*?)\s*\((\d{4})[^)]*\)\s*$/);
    return m ? { race: m[1].trim(), year: Number(m[2]), position: 1 } : { race: raw.trim(), position: 1 };
  });
  finishes.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  const seasons: RealRaceHistory["seasons"] = [];
  for (const f of finishes) {
    const last = seasons[seasons.length - 1];
    if (last && last.year === f.year) last.finishes.push(f);
    else seasons.push({ year: f.year, finishes: [f] });
  }
  return {
    finishes,
    seasons,
    starts: h.starts,
    wins: h.wins,
    seconds: h.seconds,
    thirds: h.thirds,
    earningsUsd: h.earningsUsd,
    earningsPerStart: h.earningsUsd && h.starts ? Math.round(h.earningsUsd / h.starts) : undefined,
    undocumentedWins: Math.max(0, (h.wins ?? 0) - finishes.length),
  };
}
