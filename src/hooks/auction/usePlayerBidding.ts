/**
 * usePlayerBidding.ts - Player bidding actions and state
 *
 * Manages player bid state (max bid), bid actions, pass, skip, and commit.
 */

import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import { nextBidAmount, type AuctionRunner } from "@/core/auction/runner";

export function usePlayerBidding(
  runnerRef: MutableRefObject<AuctionRunner | null>,
  currentBid: number,
  debitForLiveBid: (amount: number) => { ok: boolean; reason?: string },
  stepAndRender: (playerBid?: number) => void,
) {
  const [playerMaxBidState, setPlayerMaxBidState] = useState<number | undefined>(undefined);
  const [bidError, setBidError] = useState<string | null>(null);
  const [lastBidAmount, setLastBidAmount] = useState<number | undefined>(undefined);

  const handleBid = useCallback(
    (amount?: number) => {
      const runner = runnerRef.current;
      if (!runner) return;

      const bidValue = amount ?? nextBidAmount(currentBid);
      setLastBidAmount(bidValue);
      const result = debitForLiveBid(bidValue);
      if (!result.ok) {
        setBidError(result.reason ?? "Bid failed");
        return;
      }

      setBidError(null);
      stepAndRender(bidValue);
    },
    [currentBid, debitForLiveBid, stepAndRender, runnerRef],
  );

  const handlePass = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner) return;
    runner.skipLot();
    stepAndRender();
  }, [stepAndRender, runnerRef]);

  const handleSkip = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner) return;
    runner.finishSale();
  }, [runnerRef]);

  const dismissBidError = useCallback(() => setBidError(null), []);

  const retryBid = useCallback(() => {
    if (lastBidAmount !== undefined) handleBid(lastBidAmount);
  }, [lastBidAmount, handleBid]);

  return {
    playerMaxBidState,
    setPlayerMaxBidState,
    bidError,
    setBidError,
    dismissBidError,
    retryBid,
    canRetry: lastBidAmount !== undefined,
    handleBid,
    handlePass,
    handleSkip,
  };
}
