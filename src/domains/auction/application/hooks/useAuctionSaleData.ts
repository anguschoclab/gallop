/**
 * useAuctionSaleData.ts - Sale lookup, lot filtering, and bid handlers for the auction sale page.
 *
 * EXTRACTED FROM: routes/auction.$saleId.tsx
 */
import { useEffect, useMemo, useState } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import type { AuctionLot } from "@/platform/game/types";
import type { AuctionBrowseSearch } from "@/domains/auction/ui/auctionSearchSchema";
import { filterAndSortLots } from "@/domains/auction/application/auctionLotFilter";
import { getDisplayableStats } from "@/domains/agents/simulation/npc/scouting";
import { useAuctionSaleActions } from "@/domains/auction/application/hooks/useAuctionSaleActions";

export function useAuctionSaleData(saleId: string, filters: AuctionBrowseSearch) {
  const { sex, ageBand, reserveBand, sort, q } = filters;

  // Store selectors
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const stables = useGame((s) => s.npcStables);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);

  const sale = auctions.find((a) => a.id === saleId);

  const [lotIndex, setLotIndex] = useState(0);

  // Lot filtering
  const activeLots: AuctionLot[] = useMemo(
    () => (sale ? (sale.lots as AuctionLot[]).filter((l) => !l.withdrawn) : []),
    [sale],
  );

  const filteredLots = useMemo(
    () =>
      filterAndSortLots(activeLots, Object.values(horses), {
        sex,
        ageBand,
        reserveBand,
        sort,
        q,
      }),
    [activeLots, horses, sex, ageBand, reserveBand, sort, q],
  );

  const filterKey = `${sex ?? ""}|${ageBand ?? ""}|${reserveBand ?? ""}|${sort ?? ""}|${q ?? ""}`;

  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);

  // Derived state (safe when !sale — consumer handles not-found)
  const isResolved = sale?.resolved ?? false;
  const isSaleDay = sale ? sale.day === day : false;
  const displayLots = isResolved ? activeLots : filteredLots;
  const currentLot = displayLots[lotIndex];
  const horse = currentLot ? horses[currentLot.horseId] : undefined;
  const consignor = currentLot?.consignorStableId
    ? stableMap.get(currentLot.consignorStableId)
    : undefined;
  const displayStatsResult = horse ? getDisplayableStats(horse, scoutReports, day) : null;
  const currentPrice = currentLot?.hammerPrice ?? 0;
  const nextBid = Math.ceil((currentPrice * 1.05 + 200) / 100) * 100;
  const isPlayerLeading = Boolean(
    currentLot && !currentLot.soldToStableId && currentLot.hammerPrice !== undefined,
  );
  const isPlayerConsigned = Boolean(currentLot && !currentLot.consignorStableId);
  const playerConsignedLots = activeLots.filter((l) => !l.consignorStableId);

  const {
    message,
    error,
    errorType,
    dismissError,
    retryLastBid,
    refetchSaleData,
    canRetry,
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
    resetMessages,
  } = useAuctionSaleActions({ saleId, sale, currentLot, currentPrice, cash, setLotIndex });

  // Reset transient UI state when filters change
  useEffect(() => {
    setLotIndex(0);
    resetMessages();
  }, [filterKey, resetMessages]);

  return {
    sale,
    day,
    cash,
    horseMap: new Map(Object.entries(horses)),
    stables,
    activeLots,
    displayLots,
    currentLot,
    horse,
    consignor,
    displayStatsResult,
    currentPrice,
    nextBid,
    isResolved,
    isSaleDay,
    isPlayerLeading,
    isPlayerConsigned,
    playerConsignedLots,
    lotIndex,
    setLotIndex,
    message,
    error,
    errorType,
    dismissError,
    retryLastBid,
    refetchSaleData,
    canRetry,
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
  };
}
