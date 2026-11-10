/**
 * useAuctionRunnerLifecycle.ts - AuctionRunner lifecycle for the live theater
 *
 * Owns the runner ref, its per-sale init effect, the player max-bid sync, the
 * auto-watch interval, and the skip/commit/bid-history-retry handlers.
 */
import { useCallback, useEffect, useReducer } from "react";
import { createAuctionRunner, type AuctionRunner } from "@/domains/auction/simulation/runner";
import type { AuctionLot, AuctionSale, Horse, Stable } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type { useAuctionTimers } from "@/domains/auction/application/hooks/useAuctionTimers";
import type { useAuctionEventProcessor } from "@/domains/auction/application/hooks/useAuctionEventProcessor";
import type { usePlayerBidding } from "@/domains/auction/application/hooks/usePlayerBidding";
import type { useTheaterUiState } from "@/domains/auction/application/hooks/useTheaterUiState";

const TICK_MS = 1500;

interface UseAuctionRunnerLifecycleArgs {
  saleId: string;
  sale: AuctionSale | undefined;
  stables: Stable[];
  horses: Record<string, Horse>;
  day: number;
  debitForLiveBid: (amount: number) => { ok: true } | { ok: false; reason: string };
  commitAuctionResult: (
    saleId: string,
    finalLots: AuctionLot[],
    impacts: AnyImpact[],
  ) => { ok: true } | { ok: false; reason: string };
  timers: ReturnType<typeof useAuctionTimers>;
  theaterState: {
    autoWatch: boolean;
    paused: boolean;
    done: boolean;
    committed: boolean;
  };
  setTheaterState: React.Dispatch<
    React.SetStateAction<{
      autoWatch: boolean;
      paused: boolean;
      done: boolean;
      committed: boolean;
    }>
  >;
  eventProcessor: ReturnType<typeof useAuctionEventProcessor>;
  bidding: ReturnType<typeof usePlayerBidding>;
  ui: Pick<ReturnType<typeof useTheaterUiState>, "resetUiForSale" | "clearBidHistoryError">;
  runnerRef: React.MutableRefObject<AuctionRunner | null>;
  prevLeadingRef: React.MutableRefObject<boolean | undefined>;
}

export function useAuctionRunnerLifecycle({
  saleId,
  sale,
  stables,
  horses,
  day,
  debitForLiveBid,
  commitAuctionResult,
  timers,
  theaterState,
  setTheaterState,
  eventProcessor,
  bidding,
  ui,
  runnerRef,
  prevLeadingRef,
}: UseAuctionRunnerLifecycleArgs) {
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  // Destructure stable members so the init effect below depends on stable
  // identities — the composable hooks return fresh container objects each
  // render, and depending on them reset the runner on every commit.
  const { setPlayerMaxBidState, setBidError: setBiddingError } = bidding;
  const { setBidError: scheduleBidError, clearAll: clearAllTimers } = timers;
  const { prevLotIndexRef } = eventProcessor;
  const { resetUiForSale, clearBidHistoryError } = ui;

  // Initialize runner once per sale
  useEffect(() => {
    if (!sale) return;
    runnerRef.current = createAuctionRunner(sale, stables, Object.values(horses), undefined, {
      liveMode: true,
      onAutoRaise: (amount) => {
        const result = debitForLiveBid(amount);
        if (!result.ok) {
          setPlayerMaxBidState(undefined);
          setBiddingError(`Auto-bid cancelled: ${result.reason ?? "insufficient funds"}`);
          scheduleBidError(`Auto-bid cancelled: ${result.reason ?? "insufficient funds"}`, (err) =>
            setBiddingError(err),
          );
          return false;
        }
        return true;
      },
    });
    resetUiForSale();
    setTheaterState((prev) => ({ ...prev, done: false, committed: false }));
    setPlayerMaxBidState(undefined);
    prevLotIndexRef.current = 0;
    prevLeadingRef.current = undefined;
    forceTick();

    return () => {
      clearAllTimers();
    };
  }, [
    sale?.id,
    sale,
    stables,
    horses,
    debitForLiveBid,
    setPlayerMaxBidState,
    setBiddingError,
    scheduleBidError,
    clearAllTimers,
    prevLotIndexRef,
    prevLeadingRef,
    resetUiForSale,
    setTheaterState,
    runnerRef,
  ]);

  // Sync player max bid to runner
  const { playerMaxBidState } = bidding;
  useEffect(() => {
    runnerRef.current?.setPlayerMaxBid(playerMaxBidState);
  }, [playerMaxBidState, runnerRef]);

  // Auto-watch interval
  useEffect(() => {
    if (theaterState.done || theaterState.paused || !theaterState.autoWatch) {
      timers.stopInterval();
      return;
    }

    const interval = timers.startInterval(() => {
      eventProcessor.stepAndRender();
    }, TICK_MS);

    return () => {
      if (interval) timers.stopInterval();
    };
  }, [
    theaterState.done,
    theaterState.paused,
    theaterState.autoWatch,
    eventProcessor.stepAndRender,
    eventProcessor,
    timers,
  ]);

  // Handle skip and commit
  const handleSkip = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner || theaterState.done) return;
    runner.finishSale();
    setTheaterState((prev) => ({ ...prev, done: true }));
    forceTick();
  }, [theaterState.done, setTheaterState, runnerRef]);

  const handleCommit = useCallback(() => {
    if (!runnerRef.current || theaterState.committed) return;
    const finalLots = runnerRef.current.finalLots();
    const impacts = runnerRef.current.finalImpacts({ day, phase: "auction_theater" });
    commitAuctionResult(saleId, finalLots, impacts);
    setTheaterState((prev) => ({ ...prev, committed: true }));
  }, [commitAuctionResult, theaterState.committed, saleId, day, setTheaterState, runnerRef]);

  const retryBidHistory = useCallback(() => {
    clearBidHistoryError();
    forceTick();
  }, [clearBidHistoryError]);

  return {
    runnerRef,
    forceTick,
    handleSkip,
    handleCommit,
    retryBidHistory,
  };
}
