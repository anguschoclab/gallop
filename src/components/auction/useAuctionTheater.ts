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

  // Theater-local state
  const [autoWatch, setAutoWatch] = useState(true);
  const [paused, setPaused] = useState(false);
  const [chantLines, setChantLines] = useState<AuctioneerLine[]>([]);
  const [activePaddle, setActivePaddle] = useState<string | null>(null);
  const [hammerFlash, setHammerFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  const [playerMaxBidState, setPlayerMaxBidState] = useState<number | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bannerFlash, setBannerFlash] = useState(false);
  const [winOverlay, setWinOverlay] = useState<{
    horseName: string;
    hammerPrice: number;
  } | null>(null);

  const [bidError, setBidError] = useState<string | null>(null);

  const prevLotIndexRef = useRef(0);
  const prevLeadingRef = useRef<boolean | undefined>(undefined);
  const runnerRef = useRef<AuctionRunner | null>(null);
  const rngRef = useRef(createRng(hashStr((sale?.id ?? "fallback") + ":theater")));
  const timerRef = useRef<number | null>(null);

  // Initialize runner once per sale.
  useEffect(() => {
    if (!sale) return;
    runnerRef.current = createAuctionRunner(sale, stables, horses, hashStr(sale.id), {
      liveMode: true,
      onAutoRaise: (amount) => {
        const result = debitForLiveBid(amount);
        if (!result.ok) {
          setPlayerMaxBidState(undefined);
          setBidError(`Auto-bid cancelled: ${result.reason}`);
          return false;
        }
        return true;
      },
    });
    setChantLines([]);
    setDone(false);
    setCommitted(false);
    setPlayerMaxBidState(undefined);
    setHistoryOpen(false);
    setWinOverlay(null);
    prevLotIndexRef.current = 0;
    prevLeadingRef.current = undefined;
    forceTick();
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
    !done && currentBid > 0 && leadingBidder === undefined && lotState?.chant !== "open";
  const bidHistory: AuctionBidRecord[] = lotState?.bidHistory ?? [];

  const stepAndRender = useCallback(
    (playerBid?: number) => {
      const runner = runnerRef.current;
      if (!runner || done) return;

      const result = runner.step(playerBid);

      if (result.currentLotIndex !== prevLotIndexRef.current) {
        setPlayerMaxBidState(undefined);
        runner.setPlayerMaxBid(undefined);
        setHistoryOpen(false);
        setWinOverlay(null);
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
          setWinOverlay({
            horseName: winHorse?.name ?? "Horse",
            hammerPrice: event.amount,
          });
        }
      }

      if (newLines.length > 0) {
        setChantLines((prev) => [...prev, ...newLines].slice(-12));
      }
      if (flashStable) {
        setActivePaddle(flashStable);
        setTimeout(() => setActivePaddle(null), 800);
      }
      if (sawHammer) {
        setHammerFlash(true);
        setTimeout(() => setHammerFlash(false), 1200);
      }
      if (result.done) setDone(true);
      forceTick();
    },
    [sale, horses, stables, scoutReports, day, done],
  );

  useEffect(() => {
    if (prevLeadingRef.current === false && playerIsLeading) {
      setBannerFlash(true);
      setTimeout(() => setBannerFlash(false), 1000);
    }
    prevLeadingRef.current = playerIsLeading;
  }, [playerIsLeading]);

  useEffect(() => {
    if (done || paused || !autoWatch) {
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
  }, [done, paused, autoWatch, stepAndRender]);

  const handleBid = useCallback(
    (amount?: number) => {
      const runner = runnerRef.current;
      if (!runner) return;

      const bidValue = amount ?? nextBidAmount(currentBid);
      const result = debitForLiveBid(bidValue);
      if (!result.ok) {
        setBidError(result.reason);
        setTimeout(() => setBidError(null), 3000);
        return;
      }

      stepAndRender(bidValue);
    },
    [currentBid, debitForLiveBid, stepAndRender],
  );

  const handlePass = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner || done) return;
    runner.skipLot();
    stepAndRender();
  }, [done, stepAndRender]);

  const handleSkip = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner || done) return;
    runner.finishSale();
    setDone(true);
    forceTick();
  }, [done]);

  const handleCommit = useCallback(() => {
    if (!runnerRef.current || committed) return;
    const finalState = runnerRef.current.getFinalState();
    commitAuctionResult(finalState);
    setCommitted(true);
  }, [commitAuctionResult, committed]);

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
    chantLines,
    activePaddle,
    hammerFlash,
    done,
    committed,
    paused,
    setPaused,
    autoWatch,
    setAutoWatch,
    playerMaxBidState,
    setPlayerMaxBidState,
    historyOpen,
    setHistoryOpen,
    bannerFlash,
    winOverlay,
    bidError,
    handleBid,
    handlePass,
    handleSkip,
    handleCommit,
  };
}
