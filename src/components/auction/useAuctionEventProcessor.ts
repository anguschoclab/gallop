/**
 * useAuctionEventProcessor.ts - Event processing logic for auction theater
 *
 * Extracts the stepAndRender functionality and chant line generation
 * from useAuctionTheater for better separation of concerns.
 */

import { useCallback, useMemo, useReducer, useRef } from "react";
import { createRng, hashStr } from "@/game/rng";
import { generateAuctioneerLine, type AuctioneerLine } from "@/services/auctioneerService";
import { getDisplayableStats } from "@/game/scouting";
import type { AuctionTickEvent, AuctionRunner } from "@/game/auctionRunner";
import type { Horse, Stable, AuctionLot, AuctionBidRecord } from "@/game/types";

interface UseAuctionEventProcessorOptions {
  saleId: string;
  sale: { id: string; lots: AuctionLot[] } | undefined;
  stables: Stable[];
  horses: Horse[];
  scoutReports: any;
  day: number;
  runnerRef: React.RefObject<AuctionRunner | null>;
  setChantLines: React.Dispatch<React.SetStateAction<AuctioneerLine[]>>;
  setActivePaddle: (id: string | null) => void;
  setHammerFlash: (flash: boolean) => void;
  setWinOverlay: (overlay: { horseName: string; hammerPrice: number } | null) => void;
  setHistoryOpen: (open: boolean) => void;
  theaterState: { done: boolean };
  setPlayerMaxBid: (bid: number | undefined) => void;
}

export function useAuctionEventProcessor(options: UseAuctionEventProcessorOptions) {
  const {
    saleId,
    sale,
    stables,
    horses,
    scoutReports,
    day,
    runnerRef,
    setChantLines,
    setActivePaddle,
    setHammerFlash,
    setWinOverlay,
    setHistoryOpen,
    theaterState,
    setPlayerMaxBid,
  } = options;

  const rngRef = useRef(createRng(hashStr(saleId + ":theater")));
  const prevLotIndexRef = useRef(0);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  // Pre-calculate horse map for O(1) lookups
  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const stepAndRender = useCallback(
    (playerBid?: number) => {
      const runner = runnerRef.current;
      if (!runner || theaterState.done) return;

      const result = runner.step(playerBid);

      // Handle lot change
      if (result.currentLotIndex !== prevLotIndexRef.current) {
        setPlayerMaxBid(undefined);
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
        const horse = lot ? horseMap.get(lot.horseId) : undefined;
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
          rngRef.current
        );

        // Type assignment for UI rendering
        const typedLine: AuctioneerLine = {
          ...line,
          type:
            event.type === "SOLD"
              ? "hammer"
              : event.type === "BID_RECEIVED"
              ? "chant"
              : "other",
        };
        newLines.push(typedLine);

        if (event.type === "BID_RECEIVED" && event.stableId)
          flashStable = event.stableId;
        if (event.type === "SOLD" || event.type === "PASSED") sawHammer = true;

        if (event.type === "SOLD" && event.toStableId === undefined) {
          const winHorse = lot ? horseMap.get(lot.horseId) : undefined;
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
      }
      if (sawHammer) {
        setHammerFlash(true);
      }

      forceTick();

      return { flashStable, sawHammer };
    },
    [
      runnerRef,
      theaterState.done,
      sale,
      stables,
      horseMap,
      scoutReports,
      day,
      setChantLines,
      setActivePaddle,
      setHammerFlash,
      setWinOverlay,
      setHistoryOpen,
      setPlayerMaxBid,
    ]
  );

  return {
    stepAndRender,
    forceTick,
    prevLotIndexRef,
    horseMap,
  };
}
