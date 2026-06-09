/**
 * useAuctionTimers.ts - Timer management for auction theater
 *
 * Encapsulates all timeout/interval management for flash effects and error states.
 */

import { useCallback, useRef } from "react";

export function useAuctionTimers() {
  const activePaddleTimerRef = useRef<number | null>(null);
  const hammerFlashTimerRef = useRef<number | null>(null);
  const bannerFlashTimerRef = useRef<number | null>(null);
  const bidErrorTimerRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const setActivePaddleFlash = useCallback(
    (stableId: string | null, callback: (id: string | null) => void) => {
      callback(stableId);
      if (activePaddleTimerRef.current) clearTimeout(activePaddleTimerRef.current);
      if (stableId) {
        activePaddleTimerRef.current = window.setTimeout(() => callback(null), 800);
      }
    },
    []
  );

  const setHammerFlash = useCallback(
    (callback: (flash: boolean) => void) => {
      callback(true);
      if (hammerFlashTimerRef.current) clearTimeout(hammerFlashTimerRef.current);
      hammerFlashTimerRef.current = window.setTimeout(() => callback(false), 1200);
    },
    []
  );

  const setBannerFlash = useCallback(
    (callback: (flash: boolean) => void) => {
      callback(true);
      if (bannerFlashTimerRef.current) clearTimeout(bannerFlashTimerRef.current);
      bannerFlashTimerRef.current = window.setTimeout(() => callback(false), 1000);
    },
    []
  );

  const setBidError = useCallback(
    (error: string | null, callback: (err: string | null) => void) => {
      callback(error);
      if (bidErrorTimerRef.current) clearTimeout(bidErrorTimerRef.current);
      if (error) {
        bidErrorTimerRef.current = window.setTimeout(() => callback(null), 3000);
      }
    },
    []
  );

  const startInterval = useCallback(
    (callback: () => void, delay: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(callback, delay);
      return timerRef.current;
    },
    []
  );

  const stopInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAll = useCallback(() => {
    [
      activePaddleTimerRef,
      hammerFlashTimerRef,
      bannerFlashTimerRef,
      bidErrorTimerRef,
    ].forEach((ref) => {
      if (ref.current) clearTimeout(ref.current);
    });
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return {
    setActivePaddleFlash,
    setHammerFlash,
    setBannerFlash,
    setBidError,
    startInterval,
    stopInterval,
    clearAll,
  };
}
