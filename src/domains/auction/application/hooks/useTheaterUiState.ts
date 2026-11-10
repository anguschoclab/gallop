/**
 * useTheaterUiState.ts - Cosmetic UI state for the auction theater
 *
 * Owns chant lines, paddle/hammer/banner flashes, history-panel and win-overlay
 * visibility, plus the timer-backed adapters the event processor calls.
 */
import { useCallback, useState } from "react";
import { type AuctioneerLine } from "@/domains/auction/application/auctioneerService";
import { useAuctionTimers } from "@/domains/auction/application/hooks/useAuctionTimers";

export function useTheaterUiState(timers: ReturnType<typeof useAuctionTimers>) {
  const [uiState, setUiState] = useState({
    chantLines: [] as AuctioneerLine[],
    activePaddle: null as string | null,
    hammerFlash: false,
    bannerFlash: false,
    historyOpen: false,
    winOverlay: null as { horseName: string; hammerPrice: number } | null,
    bidHistoryError: null as string | null,
  });

  const setChantLines = useCallback(
    (linesOrFn: AuctioneerLine[] | ((prev: AuctioneerLine[]) => AuctioneerLine[])) => {
      if (typeof linesOrFn === "function") {
        setUiState((prev) => ({ ...prev, chantLines: linesOrFn(prev.chantLines) }));
      } else {
        setUiState((prev) => ({ ...prev, chantLines: linesOrFn }));
      }
    },
    [],
  );

  const setActivePaddle = useCallback(
    (id: string | null) => {
      setUiState((prev) => ({ ...prev, activePaddle: id }));
      timers.setActivePaddleFlash(id, (newId) =>
        setUiState((prev) => ({ ...prev, activePaddle: newId })),
      );
    },
    [timers],
  );

  const setHammerFlash = useCallback(
    (flash: boolean) => {
      setUiState((prev) => ({ ...prev, hammerFlash: flash }));
      if (flash) timers.setHammerFlash((f) => setUiState((prev) => ({ ...prev, hammerFlash: f })));
    },
    [timers],
  );

  const setWinOverlay = useCallback(
    (overlay: { horseName: string; hammerPrice: number } | null) =>
      setUiState((prev) => ({ ...prev, winOverlay: overlay })),
    [],
  );

  const setHistoryOpen = useCallback(
    (open: boolean) => setUiState((prev) => ({ ...prev, historyOpen: open })),
    [],
  );

  const setBannerFlashValue = useCallback(
    (flash: boolean) => setUiState((prev) => ({ ...prev, bannerFlash: flash })),
    [],
  );

  const resetUiForSale = useCallback(
    () => setUiState((prev) => ({ ...prev, chantLines: [], historyOpen: false, winOverlay: null })),
    [],
  );

  const clearBidHistoryError = useCallback(
    () => setUiState((prev) => ({ ...prev, bidHistoryError: null })),
    [],
  );

  return {
    uiState,
    setChantLines,
    setActivePaddle,
    setHammerFlash,
    setWinOverlay,
    setHistoryOpen,
    setBannerFlashValue,
    resetUiForSale,
    clearBidHistoryError,
  };
}
