/**
 * useAuctionSaleData.ts - Sale lookup, lot filtering, and bid handlers for the auction sale page.
 *
 * EXTRACTED FROM: routes/auction.$saleId.tsx
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { AuctionLot } from "@/game/types";
import type { AuctionBrowseSearch } from "@/constants/auctionSearchSchema";
import { filterAndSortLots } from "@/services/auction/auctionLotFilter";
import { getDisplayableStats } from "@/core/npc/scouting";

export function useAuctionSaleData(saleId: string, filters: AuctionBrowseSearch) {
  const { sex, ageBand, reserveBand, sort, q } = filters;

  // Store selectors
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const horses = useGame((s) => s.horses);
  const horseMap = useGameWithShallow((s) => s.horseMap ?? new Map());
  const cash = useGame((s) => s.cash);
  const stables = useGame((s) => s.npcStables);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const placeBookBid = useGame((s) => s.placeBookBid);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const buyNow = useGame((s) => s.buyNow);

  const sale = auctions.find((a) => a.id === saleId);

  const [lotIndex, setLotIndex] = useState(0);
  const [message, setMessage] = useState("");

  // Lot filtering
  const activeLots: AuctionLot[] = useMemo(
    () => (sale ? (sale.lots as AuctionLot[]).filter((l) => !l.withdrawn) : []),
    [sale],
  );

  const filteredLots = useMemo(
    () =>
      filterAndSortLots(activeLots, horses, {
        sex,
        ageBand,
        reserveBand,
        sort,
        q,
      }),
    [activeLots, horses, sex, ageBand, reserveBand, sort, q],
  );

  const filterKey = `${sex ?? ""}|${ageBand ?? ""}|${reserveBand ?? ""}|${sort ?? ""}|${q ?? ""}`;

  // Reset lot/message when filters change
  useEffect(() => {
    setLotIndex(0);
    setMessage("");
  }, [filterKey]);

  const stableMap = useMemo(
    () => new Map(stables.map((s) => [s.id, s])),
    [stables],
  );

  // Derived state (safe when !sale — consumer handles not-found)
  const isResolved = sale?.resolved ?? false;
  const isSaleDay = sale ? sale.day === day : false;
  const displayLots = isResolved ? activeLots : filteredLots;
  const currentLot = displayLots[lotIndex];
  const horse = currentLot ? horseMap.get(currentLot.horseId) : undefined;
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

  // Bid handlers
  const handleBid = useCallback(
    (amount: number) => {
      if (!sale || !currentLot) return;
      if (amount <= currentPrice) {
        setMessage("Bid must exceed current price.");
        return;
      }
      if (amount > cash) {
        setMessage("Insufficient funds.");
        return;
      }
      const result = placeBookBid(sale.id, currentLot.id, amount);
      setMessage(result.ok ? "Bid placed." : result.reason ?? "Bid failed");
    },
    [sale, currentLot, currentPrice, cash, placeBookBid],
  );

  const handleMaxBid = useCallback(
    (max: number | undefined) => {
      if (max && max <= currentPrice) {
        setMessage("Max bid must exceed current price.");
        return;
      }
      if (max) handleBid(max);
    },
    [currentPrice, handleBid],
  );

  const handleWithdraw = useCallback(() => {
    if (!currentLot) return;
    setLotIndex(0);
    const result = withdrawConsignment(currentLot.horseId);
    if (!result.ok) setMessage(result.reason ?? "Withdrawal failed");
  }, [currentLot, withdrawConsignment]);

  const handleBuyNow = useCallback(() => {
    if (!sale || !currentLot) return;
    buyNow(sale.id, currentLot.id);
  }, [sale, currentLot, buyNow]);

  return {
    sale,
    day,
    cash,
    horseMap,
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
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
  };
}
