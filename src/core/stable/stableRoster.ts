/**
 * stableRoster.ts - Derived stable rosters
 *
 * Builds the string of horses a stable currently has in work: who they are,
 * their age/gender, market value and record. Used to make Exchange listings and
 * the portfolio table read like a real yard rather than an anonymous stable id.
 *
 * Pure derivation only - no state mutation.
 *
 * Dependencies: @/core/horse/ownership, @/core/horse/pricing, @/core/horse/horseFactory
 * Related files: src/core/stable/portfolio.ts, src/components/market/ExchangePanel.tsx
 */

import type { Horse } from "@/core/horse/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { horseMarketValue } from "@/core/horse/pricing";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { calculateOverallRating } from "@/core/horse/stats";

export type RosterEntry = {
  id: string;
  name: string;
  age: number;
  gender: Horse["gender"];
  /** Overall rating where known, else 0. */
  rating: number;
  value: number;
  starts: number;
  wins: number;
  /** True when the horse is retired (broodmare/stallion band rather than in work). */
  retired: boolean;
};

/** Owner key a horse belongs to, or null when unowned. */
function ownerKey(horse: Horse): string | null {
  if (isPlayerOwned(horse)) return "player";
  return horse.ownership.type === "npc" ? (horse.ownership.stableId as string) : null;
}

/**
 * Build rosters for every stable keyed by stable id ("player" for the player).
 *
 * @param horses - All horses in the world
 * @returns Map of stable id to roster sorted by market value, richest first
 */
export function buildStableRosters(horses: Horse[]): Map<string, RosterEntry[]> {
  const live = horses.filter((h) => h.lifecycleStatus !== "deceased");
  const rosters = new Map<string, RosterEntry[]>();

  for (const raw of live) {
    const key = ownerKey(raw);
    if (!key) continue;
    const h = ensurePhenotypeResolved(raw);
    const entry: RosterEntry = {
      id: h.id,
      name: h.name,
      age: h.age,
      gender: h.gender,
      rating: Math.round(calculateOverallRating(h)),
      value: Math.round(horseMarketValue(h, horses)),
      starts: h.careerStarts ?? 0,
      wins: h.careerWins ?? 0,
      retired: h.lifecycleStatus === "retired",
    };
    const list = rosters.get(key);
    if (list) list.push(entry);
    else rosters.set(key, [entry]);
  }

  for (const list of rosters.values()) list.sort((a, b) => b.value - a.value);
  return rosters;
}

/**
 * Roster for a single stable.
 *
 * @param stableId - Stable id, or "player"
 * @param horses - All horses in the world
 * @returns Roster sorted by market value, richest first
 */
export function stableRoster(stableId: string, horses: Horse[]): RosterEntry[] {
  return buildStableRosters(horses).get(stableId) ?? [];
}

/**
 * Compact roster summary line, e.g. "24 in work · 6 retired · Top: Sunlit Way".
 *
 * @param roster - Roster entries
 * @returns Summary label
 */
export function rosterSummary(roster: RosterEntry[]): string {
  if (roster.length === 0) return "No horses in the yard";
  const inWork = roster.filter((r) => !r.retired).length;
  const retired = roster.length - inWork;
  const top = roster[0];
  const parts = [`${inWork} in work`];
  if (retired > 0) parts.push(`${retired} retired`);
  if (top) parts.push(`Top: ${top.name}`);
  return parts.join(" · ");
}
