/**
 * useAuctionTheater.ts - Hook for managing the live auction theater loop
 *
 * Encapsulates the AuctionRunner orchestration, tick intervals, and player actions.
 */

import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from "react";
import { useGame } from "@/game/store";
import {
  createAuctionRunner,
  nextBidAmount,
  type AuctionRunner,
  type ChantPhase,
} from "@/game/auctionRunner";
import { generateAuctioneerLine, type AuctioneerLine } from "@/services/auctioneerService";
import { createRng, hashStr } from "@/game/rng";
import { getDisplayableStats } from "@/game/scouting";
import type { AuctionBidRecord, Horse, Stable, AuctionSale } from "@/game/types";

const TICK_MS = 1500;

export function useAuctionTheater(saleId: string) {
  const sale = useGame((s) => s.auctions?.find((a) => a.id === saleId));
  const stables = useGame((s) => s.npcStables);
  const horses = useGame((s) => s.horses);
  const scoutReports = useGame((s) => s.scoutReports);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const debitForLiveBid = useGame((s) => s.debitForLiveBid);
  const commitAuctionResult = useGame((s) => s.commitAuctionResult);

  // Theater-local state - consolidated into groups
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
    bidError: null as string | null,
  });

  const [playerMaxBidState, setPlayerMaxBidState] = useState<number | undefined>(undefined);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  const prevLotIndexRef = useRef(0);
  const prevLeadingRef = useRef<boolean | undefined>(undefined);
  const runnerRef = useRef<AuctionRunner | null>(null);
  const rngRef = useRef(createRng(hashStr((sale?.id ?? "fallback") + ":theater")));
  const timerRef = useRef<number | null>(null);

  // Timer cleanup refs
  const activePaddleTimerRef = useRef<number | null>(null);
  const hammerFlashTimerRef = useRef<number | null>(null);
  const bannerFlashTimerRef = useRef<number | null>(null);
  const bidErrorTimerRef = useRef<number | null>(null);

  // Initialize runner once per sale.
  useEffect(() => {
    if (!sale) return;
    runnerRef.current = createAuctionRunner(sale, stables, horses, hashStr(sale.id), {
      liveMode: true,
      onAutoRaise: (amount) => {
        const result = debitForLiveBid(amount);
        if (!result.ok) {
          setPlayerMaxBidState(undefined);
          setUiState((prev) => ({ ...prev, bidError: `Auto-bid cancelled: ${result.reason}` }));
          return false;
        }
        return true;
      },
    });
    setUiState((prev) => ({ ...prev, chantLines: [] }));
    setTheaterState((prev) => ({ ...prev, done: false, committed: false }));
    setPlayerMaxBidState(undefined);
    setUiState((prev) => ({ ...prev, historyOpen: false, winOverlay: null }));
    prevLotIndexRef.current = 0;
    prevLeadingRef.current = undefined;
    forceTick();

    // Cleanup all timers on unmount
    return () => {
      if (activePaddleTimerRef.current) clearTimeout(activePaddleTimerRef.current);
      if (hammerFlashTimerRef.current) clearTimeout(hammerFlashTimerRef.current);
      if (bannerFlashTimerRef.current) clearTimeout(bannerFlashTimerRef.current);
      if (bidErrorTimerRef.current) clearTimeout(bidErrorTimerRef.current);
    };
  }, [sale?.id, stables, horses, debitForLiveBid]);

  // Sync playerMaxBidState changes to runner.
  useEffect(() => {
    runnerRef.current?.setPlayerMaxBid(playerMaxBidState);
  }, [playerMaxBidState]);

  const lotState = runnerRef.current?.currentLot();
  const currentLot = lotState?.lot;
  const currentHorse = lotState?.horse;
  const currentBid = lotState?.currentBid ?? 0;
  const leadingBidder = lotState?.leadingBidder;
  const totalLots = sale?.lots.filter((l) => !l.withdrawn).length ?? 0;
  const lotIndex = runnerRef.current?.currentLotIndex() ?? 0;
  const playerIsLeading =
    !theaterState.done &&
    currentBid > 0 &&
    leadingBidder === undefined &&
    lotState?.chant !== "open";
  const bidHistory: AuctionBidRecord[] = lotState?.bidHistory ?? [];

  const stepAndRender = useCallback(
    (playerBid?: number) => {
      const runner = runnerRef.current;
      if (!runner || theaterState.done) return;

      const result = runner.step(playerBid);

      if (result.currentLotIndex !== prevLotIndexRef.current) {
        setPlayerMaxBidState(undefined);
        runner.setPlayerMaxBid(undefined);
        setUiState((prev) => ({ ...prev, historyOpen: false, winOverlay: null }));
        prevLotIndexRef.current = result.currentLotIndex;
      }

      const newLines: AuctioneerLine[] = [];
      let flashStable: string | null = null;
      let sawHammer = false;

      for (const event of result.events) {
        const lot = sale?.lots.find((l) => l.id === event.lotId);
        const horse = lot ? horses.find((h) => h.id === lot.horseId) : undefined;
        const consignor = lot?.consignorStableId
          ? stables.find((s) => s.id === lot.consignorStableId)
          : undefined;
        const winner =
          event.type === "SOLD" && event.toStableId
            ? stables.find((s) => s.id === event.toStableId)
            : undefined;
        const scouted = horse ? getDisplayableStats(horse, scoutReports, day) : null;
        const paddleNumber =
          event.type === "BID_RECEIVED" && event.stableId
            ? Math.max(1, stables.findIndex((s) => s.id === event.stableId) + 1)
            : undefined;

        const line = generateAuctioneerLine(
          event,
          {
            horse,
            consignor,
            winner,
            scoutedOverall: scouted?.overallEstimate,
            paddleNumber,
            breezeSeconds: lot?.breezeSeconds,
          },
          rngRef.current,
        );
        newLines.push(line);

        if (event.type === "BID_RECEIVED" && event.stableId) flashStable = event.stableId;
        if (event.type === "SOLD" || event.type === "PASSED") sawHammer = true;

        if (event.type === "SOLD" && event.toStableId === undefined) {
          const winHorse = horses.find((h) => h.id === lot?.horseId);
          setUiState((prev) => ({
            ...prev,
            winOverlay: {
              horseName: winHorse?.name ?? "Horse",
              hammerPrice: event.amount,
            },
          }));
        }
      }

      if (newLines.length > 0) {
        setUiState((prev) => ({
          ...prev,
          chantLines: [...prev.chantLines, ...newLines].slice(-12),
        }));
      }
      if (flashStable) {
        setUiState((prev) => ({ ...prev, activePaddle: flashStable }));
        if (activePaddleTimerRef.current) clearTimeout(activePaddleTimerRef.current);
        activePaddleTimerRef.current = window.setTimeout(
          () => setUiState((prev) => ({ ...prev, activePaddle: null })),
          800,
        );
      }
      if (sawHammer) {
        setUiState((prev) => ({ ...prev, hammerFlash: true }));
        if (hammerFlashTimerRef.current) clearTimeout(hammerFlashTimerRef.current);
        hammerFlashTimerRef.current = window.setTimeout(
          () => setUiState((prev) => ({ ...prev, hammerFlash: false })),
          1200,
        );
      }
      if (result.done) setTheaterState((prev) => ({ ...prev, done: true }));
      forceTick();
    },
    [sale, horses, stables, scoutReports, day, theaterState.done],
  );

  useEffect(() => {
    if (prevLeadingRef.current === false && playerIsLeading) {
      setUiState((prev) => ({ ...prev, bannerFlash: true }));
      if (bannerFlashTimerRef.current) clearTimeout(bannerFlashTimerRef.current);
      bannerFlashTimerRef.current = window.setTimeout(
        () => setUiState((prev) => ({ ...prev, bannerFlash: false })),
        1000,
      );
    }
    prevLeadingRef.current = playerIsLeading;
  }, [playerIsLeading]);

  useEffect(() => {
    if (theaterState.done || theaterState.paused || !theaterState.autoWatch) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      stepAndRender();
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [theaterState.done, theaterState.paused, theaterState.autoWatch, stepAndRender]);

  const handleBid = useCallback(
    (amount?: number) => {
      const runner = runnerRef.current;
      if (!runner) return;

      const bidValue = amount ?? nextBidAmount(currentBid);
      const result = debitForLiveBid(bidValue);
      if (!result.ok) {
        setUiState((prev) => ({ ...prev, bidError: result.reason }));
        if (bidErrorTimerRef.current) clearTimeout(bidErrorTimerRef.current);
        bidErrorTimerRef.current = window.setTimeout(
          () => setUiState((prev) => ({ ...prev, bidError: null })),
          3000,
        );
        return;
      }

      stepAndRender(bidValue);
    },
    [currentBid, debitForLiveBid, stepAndRender],
  );

  const handlePass = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner || theaterState.done) return;
    runner.skipLot();
    stepAndRender();
  }, [theaterState.done, stepAndRender]);

  const handleSkip = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner || theaterState.done) return;
    runner.finishSale();
    setTheaterState((prev) => ({ ...prev, done: true }));
    forceTick();
  }, [theaterState.done]);

  const handleCommit = useCallback(() => {
    if (!runnerRef.current || theaterState.committed) return;
    const finalState = runnerRef.current.getFinalState();
    commitAuctionResult(finalState);
    setTheaterState((prev) => ({ ...prev, committed: true }));
  }, [commitAuctionResult, theaterState.committed]);

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
    playerMaxBidState,
    setPlayerMaxBidState,
    historyOpen: uiState.historyOpen,
    setHistoryOpen: (value: boolean) => setUiState((prev) => ({ ...prev, historyOpen: value })),
    bannerFlash: uiState.bannerFlash,
    winOverlay: uiState.winOverlay,
    bidError: uiState.bidError,
    handleBid,
    handlePass,
    handleSkip,
    handleCommit,
  };
}
