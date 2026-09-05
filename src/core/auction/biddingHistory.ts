/**
 * biddingHistory.ts - Player auction bidding history
 *
 * Records every lot the player bid on: the sale, the lot's horse, each bid the
 * player made, and how the lot finished (hammer price, won/lost/passed). Kept
 * separately from auction sales so the record survives sale pruning and saves.
 *
 * Dependencies: @/core/market/types (AuctionSale, AuctionLot, AuctionBidRecord)
 * Related files: src/game/store/slices/auctionSlice.ts, src/components/portfolio/BiddingHistoryTable.tsx
 */

import type { AuctionLot, AuctionSale, AuctionBidRecord } from "@/core/market/types";

export type PlayerBiddingRecord = {
  /** Stable key: `${saleId}:${lotId}` — one row per lot the player contested. */
  id: string;
  saleId: string;
  saleName: string;
  saleKind: string;
  houseId?: string;
  lotId: string;
  horseId: string;
  horseName: string;
  day: number;
  /** Every bid the player placed on this lot, in ascending tick order. */
  bids: number[];
  /** Highest bid the player made. */
  topBid: number;
  reservePrice: number;
  hammerPrice?: number;
  /** True when the player was the leading bidder at the hammer. */
  won: boolean;
  passed: boolean;
  outcome: "won" | "outbid" | "passed" | "open";
};

/**
 * True when a bid record belongs to the player (no NPC stable id, or "player").
 * @param bid
 */
export function isPlayerBid(bid: AuctionBidRecord): boolean {
  return bid.stableId === undefined || bid.stableId === "player";
}

/**
 * All player bid amounts on a lot, in tick order.
 * @param lot
 */
export function playerBidsForLot(lot: AuctionLot): number[] {
  return (lot.bidHistory ?? [])
    .filter(isPlayerBid)
    .slice()
    .sort((a, b) => a.tick - b.tick)
    .map((b) => b.amount);
}

function outcomeFor(lot: AuctionLot, won: boolean): PlayerBiddingRecord["outcome"] {
  if (lot.passed || lot.withdrawn) return "passed";
  if (lot.hammerPrice === undefined) return "open";
  return won ? "won" : "outbid";
}

/**
 * Build a bidding record for a lot the player bid on. Returns null when the
 * player never bid on that lot.
 * @param sale - Sale the lot belongs to
 * @param lot - Lot state (final if resolved)
 * @param horseName - Display name of the lot's horse
 * @param day - Game day of the sale
 */
export function buildBiddingRecord(
  sale: Pick<AuctionSale, "id" | "name" | "kind" | "houseId" | "day">,
  lot: AuctionLot,
  horseName: string,
  day = sale.day,
): PlayerBiddingRecord | null {
  const bids = playerBidsForLot(lot);
  if (bids.length === 0) return null;
  const won = !lot.passed && !lot.withdrawn && lot.hammerPrice !== undefined && !lot.soldToStableId;
  return {
    id: `${sale.id}:${lot.id}`,
    saleId: sale.id,
    saleName: sale.name,
    saleKind: sale.kind,
    houseId: sale.houseId,
    lotId: lot.id,
    horseId: lot.horseId,
    horseName,
    day,
    bids,
    topBid: Math.max(...bids),
    reservePrice: lot.reservePrice,
    hammerPrice: lot.hammerPrice,
    won,
    passed: lot.passed || lot.withdrawn,
    outcome: outcomeFor(lot, won),
  };
}

/**
 * Merge new records into an existing history, replacing rows with the same id
 * (a lot re-committed after resolution supersedes its in-progress row).
 * @param existing - Current history
 * @param incoming - Records to upsert
 */
export function mergeBiddingHistory(
  existing: readonly PlayerBiddingRecord[],
  incoming: readonly PlayerBiddingRecord[],
): PlayerBiddingRecord[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const rec of incoming) byId.set(rec.id, rec);
  return [...byId.values()].sort((a, b) => b.day - a.day || a.horseName.localeCompare(b.horseName));
}

/**
 * Aggregate summary of the player's auction record.
 * @param history
 */
export function biddingHistorySummary(history: readonly PlayerBiddingRecord[]): {
  lots: number;
  won: number;
  outbid: number;
  spend: number;
  winRate: number;
  averageHammer: number;
} {
  const won = history.filter((r) => r.outcome === "won");
  const spend = won.reduce((sum, r) => sum + (r.hammerPrice ?? r.topBid), 0);
  return {
    lots: history.length,
    won: won.length,
    outbid: history.filter((r) => r.outcome === "outbid").length,
    spend,
    winRate: history.length > 0 ? won.length / history.length : 0,
    averageHammer: won.length > 0 ? Math.round(spend / won.length) : 0,
  };
}
