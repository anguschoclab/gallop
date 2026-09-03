/**
 * playerPrestige.ts - Player prestige on the shared 0-100 venue scale
 *
 * The player's reputation score runs 0-1000; venues (auction houses and
 * racecourses) run 0-100. To let the player see where their stable sits next
 * to Crownhill or Ascot, reputation is mapped onto the same 0-100 prestige
 * scale and ranked against the combined venue field.
 *
 * Dependencies: ./prestigeTypes, ./auctionHouses, ./racecoursePrestige
 * Related files: src/components/prestige/PlayerPrestigePanel.tsx
 */

import { MAX_REPUTATION_SCORE } from "@/core/reputation/reputationTypes";
import { AUCTION_HOUSES } from "./auctionHouses";
import { rankedRacecourses } from "./racecoursePrestige";
import { getPrestigeTier, MAX_PRESTIGE_SCORE, type PrestigeTier } from "./prestigeTypes";

export type PrestigeEntityKind = "player" | "auction_house" | "racecourse";

export interface PrestigeLadderEntry {
  id: string;
  name: string;
  kind: PrestigeEntityKind;
  /** 0-100 prestige score. */
  prestige: number;
  /** 1-based rank across the whole ladder. */
  rank: number;
  subtitle?: string;
}

export interface PlayerPrestigeStanding {
  /** Player prestige on the 0-100 venue scale. */
  prestige: number;
  tier: PrestigeTier;
  /** 1-based rank across player + houses + courses. */
  rank: number;
  /** Size of the combined ladder (including the player). */
  total: number;
  /** 0-100: share of the field the player outranks. */
  percentile: number;
  /** Rank among auction houses only (1 = ahead of every house). */
  houseRank: number;
  houseTotal: number;
  /** Rank among racecourses only. */
  courseRank: number;
  courseTotal: number;
  /** Next entity above the player, if any. */
  above?: PrestigeLadderEntry;
  /** Next entity below the player, if any. */
  below?: PrestigeLadderEntry;
}

/**
 * Map a 0-1000 reputation score onto the 0-100 venue prestige scale.
 * @param reputationScore - Manager reputation score
 */
export function playerPrestigeScore(reputationScore: number): number {
  if (!Number.isFinite(reputationScore) || reputationScore <= 0) return 0;
  const pct = Math.min(1, reputationScore / MAX_REPUTATION_SCORE);
  return Math.round(pct * MAX_PRESTIGE_SCORE);
}

/** Every venue on the prestige ladder, unranked. */
function venueField(): Omit<PrestigeLadderEntry, "rank">[] {
  const houses = AUCTION_HOUSES.map((h) => ({
    id: `house:${h.id}`,
    name: h.name,
    kind: "auction_house" as const,
    prestige: h.prestige,
    subtitle: `${h.country} · Auction house`,
  }));
  const courses = rankedRacecourses().map((c) => ({
    id: `course:${c.id}`,
    name: c.name,
    kind: "racecourse" as const,
    prestige: c.prestige,
    subtitle: `${c.country} · Racecourse`,
  }));
  return [...houses, ...courses];
}

/**
 * Full prestige ladder including the player, highest prestige first.
 * Ties break by kind (player first) then name, so ordering is stable.
 *
 * @param reputationScore - Manager reputation score (0-1000)
 * @param playerName - Stable name shown on the ladder
 */
export function prestigeLadder(
  reputationScore: number,
  playerName = "Your stable",
): PrestigeLadderEntry[] {
  const player = {
    id: "player",
    name: playerName,
    kind: "player" as const,
    prestige: playerPrestigeScore(reputationScore),
    subtitle: "Your stable",
  };
  return [...venueField(), player]
    .sort((a, b) => {
      if (b.prestige !== a.prestige) return b.prestige - a.prestige;
      if (a.kind !== b.kind) return a.kind === "player" ? -1 : b.kind === "player" ? 1 : 0;
      return a.name.localeCompare(b.name);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Where the player's prestige sits against auction houses and racecourses.
 * @param reputationScore - Manager reputation score (0-1000)
 * @param playerName - Stable name shown on the ladder
 */
export function playerPrestigeStanding(
  reputationScore: number,
  playerName = "Your stable",
): PlayerPrestigeStanding {
  const ladder = prestigeLadder(reputationScore, playerName);
  const index = ladder.findIndex((e) => e.kind === "player");
  const me = ladder[index];
  const total = ladder.length;
  const houses = ladder.filter((e) => e.kind === "auction_house");
  const courses = ladder.filter((e) => e.kind === "racecourse");

  return {
    prestige: me.prestige,
    tier: getPrestigeTier(me.prestige),
    rank: me.rank,
    total,
    percentile: total > 1 ? Math.round(((total - me.rank) / (total - 1)) * 100) : 100,
    houseRank: houses.filter((h) => h.prestige > me.prestige).length + 1,
    houseTotal: houses.length,
    courseRank: courses.filter((c) => c.prestige > me.prestige).length + 1,
    courseTotal: courses.length,
    above: index > 0 ? ladder[index - 1] : undefined,
    below: index < total - 1 ? ladder[index + 1] : undefined,
  };
}
