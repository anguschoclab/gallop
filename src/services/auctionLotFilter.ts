import type { AuctionLot, Horse } from "@/game/types";

// Auction filter constants
const FILTER_CONSTANTS = {
  // Age thresholds
  WEANLING_AGE: 0,
  YEARLING_AGE: 1,
  TWO_YO_AGE: 2,
  THREE_YO_PLUS_AGE: 3,
  // Reserve price thresholds
  RESERVE_UNDER_10K: 10_000,
  RESERVE_10K_TO_50K_MIN: 10_000,
  RESERVE_10K_TO_50K_MAX: 50_000,
  RESERVE_OVER_50K: 50_000,
} as const;

export interface AuctionLotFilterOptions {
  sex?: "colt" | "filly" | "gelding" | "mare";
  ageBand?: "weanling" | "yearling" | "2yo" | "3yo+";
  reserveBand?: "under10k" | "10k-50k" | "over50k";
  sort?: "lot" | "reserve-asc" | "reserve-desc";
  q?: string;
}

/**
 * Filter and sort auction lots based on user-provided options.
 * Supports filtering by sex, age band, reserve price, and search query.
 *
 * @param lots - All auction lots for the sale
 * @param horses - All horses in the game for metadata lookup
 * @param options - Filtering and sorting options
 * @returns Filtered and sorted array of auction lots
 */
export function filterAndSortLots(
  lots: AuctionLot[],
  horses: Horse[],
  options: AuctionLotFilterOptions,
): AuctionLot[] {
  let result: AuctionLot[] = lots;

  // Sex filter
  if (options.sex) {
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      return h?.gender === options.sex;
    });
  }

  // Age band filter
  if (options.ageBand) {
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      if (!h) return false;
      if (options.ageBand === "weanling") return h.age === FILTER_CONSTANTS.WEANLING_AGE;
      if (options.ageBand === "yearling") return h.age === FILTER_CONSTANTS.YEARLING_AGE;
      if (options.ageBand === "2yo") return h.age === FILTER_CONSTANTS.TWO_YO_AGE;
      if (options.ageBand === "3yo+") return h.age >= FILTER_CONSTANTS.THREE_YO_PLUS_AGE;
      return true;
    });
  }

  // Reserve band filter
  if (options.reserveBand) {
    result = result.filter((l) => {
      if (options.reserveBand === "under10k") return l.reservePrice < FILTER_CONSTANTS.RESERVE_UNDER_10K;
      if (options.reserveBand === "10k-50k")
        return l.reservePrice >= FILTER_CONSTANTS.RESERVE_10K_TO_50K_MIN && l.reservePrice <= FILTER_CONSTANTS.RESERVE_10K_TO_50K_MAX;
      if (options.reserveBand === "over50k") return l.reservePrice > FILTER_CONSTANTS.RESERVE_OVER_50K;
      return true;
    });
  }

  // Search filter — case-insensitive substring on name and sire
  if (options.q && options.q.trim().length > 0) {
    const needle = options.q.trim().toLowerCase();
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      if (!h) return false;
      return (
        h.name.toLowerCase().includes(needle) || (h.sireName ?? "").toLowerCase().includes(needle)
      );
    });
  }

  // Sort
  if (options.sort === "reserve-asc") {
    result = [...result].sort((a, b) => a.reservePrice - b.reservePrice);
  } else if (options.sort === "reserve-desc") {
    result = [...result].sort((a, b) => b.reservePrice - a.reservePrice);
  }
  // sort === "lot" (or undefined) preserves original lot-number order

  return result;
}
