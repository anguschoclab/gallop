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

  const handleBid = useCallback(
    (amount?: number) => {
      const runner = runnerRef.current;
      if (!runner) return;

      const bidValue = amount ?? nextBidAmount(currentBid);
      const result = debitForLiveBid(bidValue);
      if (!result.ok) {
        setBidError(result.reason ?? "Bid failed");
        return;
      }

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

  return {
    playerMaxBidState,
    setPlayerMaxBidState,
    bidError,
    setBidError,
    handleBid,
    handlePass,
    handleSkip,
  };
}
