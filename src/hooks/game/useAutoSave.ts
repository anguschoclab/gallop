/**
 * useAutoSave.ts - Hook for periodic automatic game saves
 */

import { useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import { saveToSlot } from "@/services/storage/saveManager";
import type { GameState } from "@/game/types";

/**
 * Triggers an automatic save every 7 in-game days.
 */
export function useAutoSave() {
  const day = useGame((s) => s.day);
  const lastSavedDay = useRef<number>(day);

  useEffect(() => {
    // Only save if day has changed and is a multiple of 7
    // Also skip day 1 (initial state)
    if (day > 1 && day !== lastSavedDay.current && day % 7 === 0) {
      const triggerSave = async () => {
        try {
          // Committed-state only: while an engine command is in flight the
          // store still holds the last commit, but skip to guarantee the
          // slot records a settled revision, not a race with one.
          const status = useGame.getState().execution?.status;
          if (status === "running" || status === "cancelling") return;
          const state = useGame.getState() as unknown as GameState;
          await saveToSlot("autosave", "Auto-Save", state, true);
          lastSavedDay.current = day;
        } catch (error) {
          console.error("[Auto-Save] Failed to save game:", error);
        }
      };

      triggerSave();
    }
  }, [day]);
}
