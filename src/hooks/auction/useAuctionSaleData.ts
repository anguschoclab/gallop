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
  const [error, setError] = useState<string | null>(null);
  const [lastBidAttempt, setLastBidAttempt] = useState<number | null>(null);

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

  // Reset transient UI state when filters change
  useEffect(() => {
    setLotIndex(0);
    setMessage("");
    setError(null);
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
      setLastBidAttempt(amount);
      if (amount <= currentPrice) {
        setError("Bid must exceed current price.");
        setMessage("");
        return;
      }
      if (amount > cash) {
        setError("Insufficient funds.");
        setMessage("");
        return;
      }
      const result = placeBookBid(sale.id, currentLot.id, amount);
      if (result.ok) {
        setMessage("Bid placed.");
        setError(null);
      } else {
        setError(result.reason ?? "Bid failed");
        setMessage("");
      }
    },
    [sale, currentLot, currentPrice, cash, placeBookBid],
  );

  const handleMaxBid = useCallback(
    (max: number | undefined) => {
      if (max && max <= currentPrice) {
        setError("Max bid must exceed current price.");
        setMessage("");
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
    if (!result.ok) {
      setError(result.reason ?? "Withdrawal failed");
      setMessage("");
    } else {
      setError(null);
    }
  }, [currentLot, withdrawConsignment]);

  const handleBuyNow = useCallback(() => {
    if (!sale || !currentLot) {
      setError("No active lot.");
      return { ok: false as const, reason: "No active lot." };
    }
    const result = buyNow(sale.id, currentLot.id);
    if (result.ok) {
      setError(null);
      setMessage("Lot purchased.");
    } else {
      setError(result.reason ?? "Purchase failed");
      setMessage("");
    }
    return result;
  }, [sale, currentLot, buyNow]);

  const dismissError = useCallback(() => setError(null), []);
  const retryLastBid = useCallback(() => {
    if (lastBidAttempt !== null) handleBid(lastBidAttempt);
  }, [lastBidAttempt, handleBid]);

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
    error,
    dismissError,
    retryLastBid,
    canRetry: lastBidAttempt !== null,
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
  };
}
