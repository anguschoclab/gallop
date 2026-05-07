import type { AuctionLot, Horse } from "@/game/types";

export interface AuctionLotFilterOptions {
  sex?: "colt" | "filly" | "gelding" | "mare";
  ageBand?: "weanling" | "yearling" | "2yo" | "3yo+";
  reserveBand?: "under10k" | "10k-50k" | "over50k";
  sort?: "lot" | "reserve-asc" | "reserve-desc";
  q?: string;
}

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
      if (options.ageBand === "weanling") return h.age === 0;
      if (options.ageBand === "yearling") return h.age === 1;
      if (options.ageBand === "2yo") return h.age === 2;
      if (options.ageBand === "3yo+") return h.age >= 3;
      return true;
    });
  }

  // Reserve band filter
  if (options.reserveBand) {
    result = result.filter((l) => {
      if (options.reserveBand === "under10k") return l.reservePrice < 10_000;
      if (options.reserveBand === "10k-50k")
        return l.reservePrice >= 10_000 && l.reservePrice <= 50_000;
      if (options.reserveBand === "over50k") return l.reservePrice > 50_000;
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
