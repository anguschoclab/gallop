/**
 * useAutoSave.ts - Hook for periodic automatic game saves
 */

import { useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import { saveToSlot } from "@/services/saveManager";
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
          const state = useGame.getState() as unknown as GameState;
          await saveToSlot("autosave", "Auto-Save", state, true);
          console.log(`[Auto-Save] Game saved successfully on day ${day}`);
          lastSavedDay.current = day;
        } catch (error) {
          console.error("[Auto-Save] Failed to save game:", error);
        }
      };

      triggerSave();
    }
  }, [day]);
}
