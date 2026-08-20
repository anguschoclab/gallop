/**
 * useAuctionTheater.ts - Hook for managing the live auction theater loop
 *
 * Encapsulates the AuctionRunner orchestration, tick intervals, and player actions.
 * Refactored to use composable sub-hooks for better separation of concerns.
 */

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { useGame } from "@/game/store";
import { createAuctionRunner, type AuctionRunner } from "@/core/auction/runner";
import { type AuctioneerLine } from "@/services/auction/auctioneerService";
import { useAuctionTimers } from "./useAuctionTimers";
import { useAuctionEventProcessor } from "./useAuctionEventProcessor";
import { usePlayerBidding } from "./usePlayerBidding";
import { useDismissedAuctionErrors } from "./useDismissedAuctionErrors";
import type { AuctionBidRecord, AuctionLot } from "@/game/types";

const TICK_MS = 1500;

/**
 * Hook for managing the live auction theater loop
 * @param saleId - The ID of the auction sale to manage
 * @returns Theater state and handler functions for auction interaction
 */
export function useAuctionTheater(saleId: string) {
  // Store selectors
  const sale = useGame((s) => s.auctions?.find((a) => a.id === saleId));
  const stables = useGame((s) => s.npcStables);
  const horses = useGame((s) => s.horses);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const debitForLiveBid = useGame((s) => s.debitForLiveBid);
  const commitAuctionResult = useGame((s) => s.commitAuctionResult);

  // Composable hooks
  const timers = useAuctionTimers();
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  // Theater-local state
  const [theaterState, setTheaterState] = useState({
    autoWatch: true,
    paused: false,
    done: false,
    committed: false,
  });

  const [uiState, setUiState] = useState({
    chantLines: [] as AuctioneerLine[],
    activePaddle: null as string | null,
    hammerFlash: false,
    bannerFlash: false,
    historyOpen: false,
    winOverlay: null as { horseName: string; hammerPrice: number } | null,
    bidHistoryError: null as string | null,
  });

  // Refs
  const runnerRef = useRef<AuctionRunner | null>(null);
  const prevLeadingRef = useRef<boolean | undefined>(undefined);

  const dismissedErrors = useDismissedAuctionErrors();

  // Event processor hook
  const eventProcessor = useAuctionEventProcessor({
    saleId,
    sale,
    stables,
    horses: Object.values(horses),
    scoutReports,
    day,
    runnerRef,
    setChantLines: (linesOrFn) => {
      if (typeof linesOrFn === "function") {
        setUiState((prev) => ({ ...prev, chantLines: linesOrFn(prev.chantLines) }));
      } else {
        setUiState((prev) => ({ ...prev, chantLines: linesOrFn }));
      }
    },
    setActivePaddle: (id) => {
      setUiState((prev) => ({ ...prev, activePaddle: id }));
      timers.setActivePaddleFlash(id, (newId) =>
        setUiState((prev) => ({ ...prev, activePaddle: newId })),
      );
    },
    setHammerFlash: (flash) => {
      setUiState((prev) => ({ ...prev, hammerFlash: flash }));
      if (flash) timers.setHammerFlash((f) => setUiState((prev) => ({ ...prev, hammerFlash: f })));
    },
    setWinOverlay: (overlay) => setUiState((prev) => ({ ...prev, winOverlay: overlay })),
    setHistoryOpen: (open) => setUiState((prev) => ({ ...prev, historyOpen: open })),
    theaterState,
    setPlayerMaxBid: (bid) => bidding.setPlayerMaxBidState(bid),
  });

  // Player bidding hook
  const bidding = usePlayerBidding(
    runnerRef,
    runnerRef.current?.currentLot()?.currentBid ?? 0,
    debitForLiveBid,
    eventProcessor.stepAndRender,
  );

  // Initialize runner once per sale
  useEffect(() => {
    if (!sale) return;
    runnerRef.current = createAuctionRunner(sale, stables, Object.values(horses), undefined, {
      liveMode: true,
      onAutoRaise: (amount) => {
        const result = debitForLiveBid(amount);
        if (!result.ok) {
          bidding.setPlayerMaxBidState(undefined);
          bidding.setBidError(`Auto-bid cancelled: ${result.reason ?? "insufficient funds"}`);
          timers.setBidError(
            `Auto-bid cancelled: ${result.reason ?? "insufficient funds"}`,
            (err) => bidding.setBidError(err),
          );
          return false;
        }
        return true;
      },
    });
    setUiState((prev) => ({ ...prev, chantLines: [] }));
    setTheaterState((prev) => ({ ...prev, done: false, committed: false }));
    bidding.setPlayerMaxBidState(undefined);
    setUiState((prev) => ({ ...prev, historyOpen: false, winOverlay: null }));
    eventProcessor.prevLotIndexRef.current = 0;
    prevLeadingRef.current = undefined;
    forceTick();

    return () => {
      timers.clearAll();
    };
  }, [
    sale?.id,
    stables,
    horses,
    debitForLiveBid,
    sale,
    bidding,
    timers,
    eventProcessor.prevLotIndexRef,
  ]);

  // Sync player max bid to runner
  useEffect(() => {
    runnerRef.current?.setPlayerMaxBid(bidding.playerMaxBidState);
  }, [bidding.playerMaxBidState]);

  // Derived state from runner
  const lotState = runnerRef.current?.currentLot();
  const currentLot = lotState?.lot;
  const currentHorse = lotState?.horse;
  const currentBid = lotState?.currentBid ?? 0;
  const leadingBidder = lotState?.leadingBidder;
  const totalLots = sale?.lots.filter((l: AuctionLot) => !l.withdrawn).length ?? 0;
  const lotIndex = runnerRef.current?.currentLotIndex() ?? 0;
  const playerIsLeading =
    !theaterState.done &&
    currentBid > 0 &&
    leadingBidder === undefined &&
    lotState?.chant !== "open";
  const bidHistory: AuctionBidRecord[] = lotState?.bidHistory ?? [];

  // Derive bid history error: runner has no current lot while sale is active
  const activeLotCount = sale?.lots.filter((l: AuctionLot) => !l.withdrawn).length ?? 0;
  const bidHistoryError =
    !lotState && sale && !theaterState.done && activeLotCount > 0
      ? "Failed to load bid history for this lot."
      : uiState.bidHistoryError;

  // Banner flash effect when player takes the lead
  useEffect(() => {
    if (prevLeadingRef.current === false && playerIsLeading) {
      setUiState((prev) => ({ ...prev, bannerFlash: true }));
      timers.setBannerFlash((f) => setUiState((prev) => ({ ...prev, bannerFlash: f })));
    }
    prevLeadingRef.current = playerIsLeading;
  }, [playerIsLeading, timers]);

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
  }, [theaterState.done]);

  const handleCommit = useCallback(() => {
    if (!runnerRef.current || theaterState.committed) return;
    const finalLots = runnerRef.current.finalLots();
    const impacts = runnerRef.current.finalImpacts({ day, phase: "auction_theater" });
    commitAuctionResult(saleId, finalLots, impacts);
    setTheaterState((prev) => ({ ...prev, committed: true }));
  }, [commitAuctionResult, theaterState.committed, saleId, day]);

  const retryBidHistory = useCallback(() => {
    setUiState((prev) => ({ ...prev, bidHistoryError: null }));
    forceTick();
  }, []);

  return {
    sale,
    lotState,
    currentLot,
    currentHorse,
    currentBid,
    leadingBidder,
    totalLots,
    lotIndex,
    playerIsLeading,
    bidHistory,
    chantLines: uiState.chantLines,
    activePaddle: uiState.activePaddle,
    hammerFlash: uiState.hammerFlash,
    done: theaterState.done,
    committed: theaterState.committed,
    paused: theaterState.paused,
    setPaused: (value: boolean) => setTheaterState((prev) => ({ ...prev, paused: value })),
    autoWatch: theaterState.autoWatch,
    setAutoWatch: (value: boolean) => setTheaterState((prev) => ({ ...prev, autoWatch: value })),
    playerMaxBidState: bidding.playerMaxBidState,
    setPlayerMaxBidState: bidding.setPlayerMaxBidState,
    historyOpen: uiState.historyOpen,
    setHistoryOpen: (value: boolean) => setUiState((prev) => ({ ...prev, historyOpen: value })),
    bannerFlash: uiState.bannerFlash,
    winOverlay: uiState.winOverlay,
    bidError: bidding.bidError,
    dismissBidError: bidding.dismissBidError,
    retryBid: bidding.retryBid,
    canRetryBid: bidding.canRetry,
    dismissedErrors,
    bidHistoryError,
    retryBidHistory,
    handleBid: bidding.handleBid,
    handlePass: bidding.handlePass,
    handleSkip,
    handleCommit,
  };
}
