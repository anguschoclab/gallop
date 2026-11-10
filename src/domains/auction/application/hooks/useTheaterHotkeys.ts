/**
 * useTheaterHotkeys.ts - Keyboard shortcuts for the live auction theater
 *
 * Space bids the next increment; "p" toggles pause. Disabled while the sale is
 * done, while paused, while the player leads, and for player consignments.
 */
import { useEffect } from "react";

interface UseTheaterHotkeysArgs {
  done: boolean;
  paused: boolean;
  playerIsLeading: boolean;
  isPlayerConsignment: boolean;
  handleBid: () => void;
  setPaused: (paused: boolean) => void;
}

export function useTheaterHotkeys({
  done,
  paused,
  playerIsLeading,
  isPlayerConsignment,
  handleBid,
  setPaused,
}: UseTheaterHotkeysArgs) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (done || paused) return;
      if (e.key === " " && !playerIsLeading && !isPlayerConsignment) {
        e.preventDefault();
        handleBid();
      }
      if (e.key.toLowerCase() === "p") {
        setPaused(!paused);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [done, paused, playerIsLeading, isPlayerConsignment, handleBid, setPaused]);
}
