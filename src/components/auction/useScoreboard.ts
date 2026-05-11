import { useMemo } from "react";
import { useGame } from "@/game/store";
import { netProceeds } from "@/game/auction";

/**
 * Pure-derived scoreboard — what the player has done so far in this sale.
 *
 * @param saleId - Unique ID of the auction sale
 * @returns Object containing auction stats (won, sold, spent, netReceived)
 */
export function useScoreboard(saleId: string) {
  const auctions = useGame((s) => s.auctions);
  const horses = useGame((s) => s.horses);
  return useMemo(() => {
    const sale = auctions?.find((a) => a.id === saleId);
    if (!sale) return null;
    let won = 0;
    let sold = 0;
    let spent = 0;
    let netReceived = 0;
    let topAcquisition: { name: string; price: number } | null = null;
    let topSale: { name: string; price: number } | null = null;
    for (const lot of sale.lots) {
      if (lot.passed || lot.withdrawn) continue;
      if (!lot.hammerPrice) continue;
      const horse = horses.find((h) => h.id === lot.horseId);
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
