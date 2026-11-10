/**
 * useAuctionTheater.ts - Hook for managing the live auction theater loop
 *
 * Encapsulates the AuctionRunner orchestration, tick intervals, and player actions.
 * Refactored to use composable sub-hooks for better separation of concerns.
 */

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/platform/game/store";
import { type AuctionRunner } from "@/domains/auction/simulation/runner";
import { useAuctionTimers } from "@/domains/auction/application/hooks/useAuctionTimers";
import { useAuctionEventProcessor } from "@/domains/auction/application/hooks/useAuctionEventProcessor";
import { usePlayerBidding } from "@/domains/auction/application/hooks/usePlayerBidding";
import { useDismissedAuctionErrors } from "@/domains/auction/application/hooks/useDismissedAuctionErrors";
import { useTheaterUiState } from "@/domains/auction/application/hooks/useTheaterUiState";
import { useAuctionRunnerLifecycle } from "@/domains/auction/application/hooks/useAuctionRunnerLifecycle";
import type { AuctionBidRecord, AuctionLot } from "@/platform/game/types";

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

  // Theater-local state
  const [theaterState, setTheaterState] = useState({
    autoWatch: true,
    paused: false,
    done: false,
    committed: false,
  });

  const ui = useTheaterUiState(timers);

  // Refs — runnerRef is populated by the lifecycle hook's init effect below;
  // prevLeadingRef backs the lead-change banner flash.
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
    setChantLines: ui.setChantLines,
    setActivePaddle: ui.setActivePaddle,
    setHammerFlash: ui.setHammerFlash,
    setWinOverlay: ui.setWinOverlay,
    setHistoryOpen: ui.setHistoryOpen,
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

  // Runner lifecycle: init, max-bid sync, auto-watch interval, skip/commit
  const lifecycle = useAuctionRunnerLifecycle({
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
  });

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
      : ui.uiState.bidHistoryError;

  // Banner flash effect when player takes the lead
  const { setBannerFlashValue } = ui;
  useEffect(() => {
    if (prevLeadingRef.current === false && playerIsLeading) {
      setBannerFlashValue(true);
      timers.setBannerFlash((f) => setBannerFlashValue(f));
    }
    prevLeadingRef.current = playerIsLeading;
  }, [playerIsLeading, timers, setBannerFlashValue]);

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
    chantLines: ui.uiState.chantLines,
    activePaddle: ui.uiState.activePaddle,
    hammerFlash: ui.uiState.hammerFlash,
    done: theaterState.done,
    committed: theaterState.committed,
    paused: theaterState.paused,
    setPaused: (value: boolean) => setTheaterState((prev) => ({ ...prev, paused: value })),
    autoWatch: theaterState.autoWatch,
    setAutoWatch: (value: boolean) => setTheaterState((prev) => ({ ...prev, autoWatch: value })),
    playerMaxBidState: bidding.playerMaxBidState,
    setPlayerMaxBidState: bidding.setPlayerMaxBidState,
    historyOpen: ui.uiState.historyOpen,
    setHistoryOpen: ui.setHistoryOpen,
    bannerFlash: ui.uiState.bannerFlash,
    winOverlay: ui.uiState.winOverlay,
    bidError: bidding.bidError,
    dismissBidError: bidding.dismissBidError,
    retryBid: bidding.retryBid,
    canRetryBid: bidding.canRetry,
    dismissedErrors,
    bidHistoryError,
    retryBidHistory: lifecycle.retryBidHistory,
    handleBid: bidding.handleBid,
    handlePass: bidding.handlePass,
    handleSkip: lifecycle.handleSkip,
    handleCommit: lifecycle.handleCommit,
  };
}
