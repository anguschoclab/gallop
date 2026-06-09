import { useMemo } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import { netProceeds } from "@/game/auction/engine";

/**
 * Pure-derived scoreboard — what the player has done so far in this sale.
 *
 * @param saleId - Unique ID of the auction sale
 * @returns Object containing auction stats (won, sold, spent, netReceived)
 */
export function useScoreboard(saleId: string) {
  const auctions = useGameWithShallow((s: StoreType) => s.auctions);
  const horses = useGameWithShallow((s: StoreType) => s.horses);
  return useMemo(() => {
    const sale = auctions?.find((a) => a.id === saleId);
    if (!sale) return null;
    let won = 0;
    let sold = 0;
    let spent = 0;
    let netReceived = 0;
    let topAcquisition: { name: string; price: number } | null = null;
    let topSale: { name: string; price: number } | null = null;
    // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside the map loops.
    const horseMap = new Map(horses.map((h) => [h.id, h]));
    for (const lot of sale.lots) {
      if (lot.passed || lot.withdrawn) continue;
      if (!lot.hammerPrice) continue;
      const horse = horseMap.get(lot.horseId);
      const isPlayerWin = lot.consignorStableId !== undefined && lot.soldToStableId === undefined;
      const isPlayerSale = lot.consignorStableId === undefined;
      if (isPlayerWin) {
        won++;
        spent += lot.hammerPrice;
        if (!topAcquisition || lot.hammerPrice > topAcquisition.price) {
          topAcquisition = { name: horse?.name ?? "Lot", price: lot.hammerPrice };
        }
      }
      if (isPlayerSale) {
        sold++;
        netReceived += netProceeds(lot.hammerPrice);
        if (!topSale || lot.hammerPrice > topSale.price) {
          topSale = { name: horse?.name ?? "Lot", price: lot.hammerPrice };
        }
      }
    }
    return { won, sold, spent, netReceived, topAcquisition, topSale };
  }, [auctions, saleId, horses]);
}
