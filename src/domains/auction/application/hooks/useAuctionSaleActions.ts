/**
 * useAuctionSaleActions.ts - Bid/withdraw/buy-now actions and feedback state for the auction sale page.
 *
 * Extracted from useAuctionSaleData: owns the transient message/error state plus
 * the store-action handlers (placeBookBid, withdrawConsignment, buyNow).
 */
import { useCallback, useReducer, useState } from "react";
import { useGame } from "@/platform/game/store";
import type { AuctionLot, AuctionSale } from "@/platform/game/types";
import {
  useDismissedAuctionErrors,
  type AuctionErrorType,
} from "@/domains/auction/application/hooks/useDismissedAuctionErrors";

interface UseAuctionSaleActionsArgs {
  saleId: string;
  sale: AuctionSale | undefined;
  currentLot: AuctionLot | undefined;
  currentPrice: number;
  cash: number;
  setLotIndex: (index: number) => void;
}

export function useAuctionSaleActions({
  saleId,
  sale,
  currentLot,
  currentPrice,
  cash,
  setLotIndex,
}: UseAuctionSaleActionsArgs) {
  const placeBookBid = useGame((s) => s.placeBookBid);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const buyNow = useGame((s) => s.buyNow);

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<AuctionErrorType | null>(null);
  const [lastBidAttempt, setLastBidAttempt] = useState<number | null>(null);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  const {
    isDismissed,
    dismissError: dismissErrorPersisted,
    clearDismissed,
  } = useDismissedAuctionErrors();

  const setAuctionError = useCallback((msg: string, type: AuctionErrorType) => {
    setErrorType(type);
    setError(msg);
  }, []);

  const handleBid = useCallback(
    (amount: number) => {
      if (!sale || !currentLot) return;
      setLastBidAttempt(amount);
      if (amount <= currentPrice) {
        setAuctionError("Bid must exceed current price.", "bid_error");
        setMessage("");
        return;
      }
      if (amount > cash) {
        setAuctionError("Insufficient funds.", "bid_error");
        setMessage("");
        return;
      }
      const result = placeBookBid(sale.id, currentLot.id, amount);
      if (result.ok) {
        setMessage("Bid placed.");
        setError(null);
        setErrorType(null);
      } else {
        setAuctionError(result.reason ?? "Bid failed", "bid_error");
        setMessage("");
      }
    },
    [sale, currentLot, currentPrice, cash, placeBookBid, setAuctionError],
  );

  const handleMaxBid = useCallback(
    (max: number | undefined) => {
      if (max && max <= currentPrice) {
        setAuctionError("Max bid must exceed current price.", "bid_error");
        setMessage("");
        return;
      }
      if (max) handleBid(max);
    },
    [currentPrice, handleBid, setAuctionError],
  );

  const handleWithdraw = useCallback(() => {
    if (!currentLot) return;
    setLotIndex(0);
    const result = withdrawConsignment(currentLot.horseId);
    if (!result.ok) {
      setAuctionError(result.reason ?? "Withdrawal failed", "bid_error");
      setMessage("");
    } else {
      setError(null);
      setErrorType(null);
    }
  }, [currentLot, setLotIndex, withdrawConsignment, setAuctionError]);

  const handleBuyNow = useCallback(() => {
    if (!sale || !currentLot) {
      setAuctionError("No active lot.", "bid_error");
      return { ok: false as const, reason: "No active lot." };
    }
    const result = buyNow(sale.id, currentLot.id);
    if (result.ok) {
      setError(null);
      setErrorType(null);
      setMessage("Lot purchased.");
    } else {
      setAuctionError(result.reason ?? "Purchase failed", "bid_error");
      setMessage("");
    }
    return result;
  }, [sale, currentLot, buyNow, setAuctionError]);

  const dismissError = useCallback(() => {
    if (errorType && saleId) {
      dismissErrorPersisted(saleId, errorType);
    }
    setError(null);
    setErrorType(null);
  }, [errorType, saleId, dismissErrorPersisted]);

  const retryLastBid = useCallback(() => {
    if (lastBidAttempt !== null) handleBid(lastBidAttempt);
  }, [lastBidAttempt, handleBid]);

  const refetchSaleData = useCallback(() => {
    clearDismissed(saleId);
    setError(null);
    setErrorType(null);
    forceTick();
  }, [saleId, clearDismissed]);

  const resetMessages = useCallback(() => {
    setMessage("");
    setError(null);
    setErrorType(null);
  }, []);

  const suppressedError =
    error && errorType && saleId && isDismissed(saleId, errorType) ? null : error;

  return {
    message,
    error: suppressedError,
    errorType,
    dismissError,
    retryLastBid,
    refetchSaleData,
    canRetry: lastBidAttempt !== null,
    handleBid,
    handleMaxBid,
    handleWithdraw,
    handleBuyNow,
    resetMessages,
  };
}
