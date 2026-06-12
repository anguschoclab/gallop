/**
 * useAuctionEventProcessor.ts - Event processing logic for auction theater
 *
 * Extracts the stepAndRender functionality and chant line generation
 * from useAuctionTheater for better separation of concerns.
 */

import { useCallback, useMemo, useReducer, useRef } from "react";
import { createRng, hashStr } from "@/core/common/rng";
import { generateAuctioneerLine, type AuctioneerLine } from "@/services/auction/auctioneerService";
import { getDisplayableStats } from "@/core/npc/scouting";
import type { AuctionTickEvent, AuctionRunner } from "@/core/auction/runner";
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

  // Pre-calculate maps for O(1) lookups instead of O(N) .find()/.findIndex() inside the event loop
  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const stableMap = useMemo(() => new Map(stables.map((s) => [s.id, s])), [stables]);
  const stableIndexMap = useMemo(() => new Map(stables.map((s, idx) => [s.id, idx])), [stables]);
  const lotMap = useMemo(() => new Map(sale?.lots.map((l) => [l.id, l]) ?? []), [sale?.lots]);

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
        const lot = lotMap.get(event.lotId);
        const horse = lot ? horseMap.get(lot.horseId) : undefined;
        const consignor = lot?.consignorStableId
          ? stableMap.get(lot.consignorStableId)
          : undefined;
        const winner =
          event.type === "SOLD" && event.toStableId
            ? stableMap.get(event.toStableId)
            : undefined;
        const scouted = horse ? getDisplayableStats(horse, scoutReports, day) : null;
        let paddleNumber: number | undefined = undefined;
        if (event.type === "BID_RECEIVED" && event.stableId) {
          const idx = stableIndexMap.get(event.stableId);
          paddleNumber = idx !== undefined ? Math.max(1, idx + 1) : undefined;
        }

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
      stableMap,
      stableIndexMap,
      lotMap,
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
