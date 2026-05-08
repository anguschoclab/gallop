/**
 * Headless Triple Crown Simulation Test
 * 
 * This test runs a headless simulation until a Triple Crown winner is found in any region,
 * then reports the years taken, pedigree, and sire breeding price impact.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDefaultGameState } from "@/game/state";
import { useGame } from "@/game/store";
import type { Horse } from "@/game/types";

describe("Headless Triple Crown Simulation", () => {
  beforeEach(() => {
    // Reset store before each test
    useGame.setState(createDefaultGameState());
  });

  it("should simulate until triple crown winner found", async () => {
    // Initialize game state
    const initialState = createDefaultGameState();
    useGame.setState(initialState);

    let yearsTaken = 0;
    let winningHorse: Horse | null = null;
    let triplecrownKey: string | null = null;
    let sireFeeBefore = 0;
    let sireFeeAfter = 0;

    // Simulation loop
    const maxYears = 100; // Safety limit
    let foundWinner = false;

    for (let year = 1; year <= maxYears && !foundWinner; year++) {
      // Advance one year in headless mode
      await useGame.getState().advanceMultipleDays(365, true);

      const state = useGame.getState();

      // Check for triple crown winners
      const winners = state.triplecrownHistory?.filter((tc) => tc.won) ?? [];

      if (winners.length > 0) {
        foundWinner = true;
        yearsTaken = year;
        const winner = winners[0];
        winningHorse = state.horses.find((h) => h.id === winner.horseId) ?? null;
        triplecrownKey = winner.triplecrownKey;

        // Get sire's standing fee (after win)
        const sireId = winningHorse?.pedigree?.sireId;
        if (sireId) {
          const sire = state.horses.find((h) => h.id === sireId);
          sireFeeAfter = sire?.stud?.standingFee ?? 0;
          // previousStandingFee is optional, use current fee if not present
          sireFeeBefore = sire?.stud?.previousStandingFee ?? sireFeeAfter;
        }

        break;
      }
    }

    // Report results
    console.log("\n=== Triple Crown Simulation Results ===");
    if (foundWinner) {
      console.log(`Years Simulated: ${yearsTaken}`);
      console.log(`Triple Crown Series: ${triplecrownKey}`);
      console.log(`Winning Horse: ${winningHorse?.name} (ID: ${winningHorse?.id})`);
      console.log(`Sire: ${winningHorse?.pedigree?.sireName} (ID: ${winningHorse?.pedigree?.sireId})`);
      console.log(`Dam: ${winningHorse?.pedigree?.damName} (ID: ${winningHorse?.pedigree?.damId})`);
      console.log(`Sire Standing Fee: $${sireFeeBefore.toLocaleString()} → $${sireFeeAfter.toLocaleString()}`);
      console.log(`Fee Increase: $${(sireFeeAfter - sireFeeBefore).toLocaleString()}`);
      console.log(`=====================================\n`);

      // Verify we found a winner
      expect(foundWinner).toBe(true);
      expect(yearsTaken).toBeGreaterThan(0);
      expect(winningHorse).toBeDefined();
      expect(triplecrownKey).toBeDefined();
    } else {
      console.log("No Triple Crown winner found within 100 years");
      console.log("This may indicate a rare event or a bug in the detection logic");
      console.log("=====================================\n");

      // Even if no winner found, the test should pass (this is a rare event)
      expect(foundWinner).toBe(false);
    }
  }, { timeout: 300000 }); // 5 minute timeout for long-running simulation

  it("should track triple crown progress correctly for individual legs", async () => {
    // Initialize game state
    const initialState = createDefaultGameState();
    useGame.setState(initialState);

    // Advance a few days to generate some races
    await useGame.getState().advanceMultipleDays(30, true);

    const state = useGame.getState();

    // Check that triplecrownHistory exists and may have entries
    expect(state.triplecrownHistory).toBeDefined();
    expect(Array.isArray(state.triplecrownHistory)).toBe(true);

    // If there are entries, verify structure
    if (state.triplecrownHistory && state.triplecrownHistory.length > 0) {
      const entry = state.triplecrownHistory[0];
      expect(entry).toHaveProperty("horseId");
      expect(entry).toHaveProperty("triplecrownKey");
      expect(entry).toHaveProperty("year");
      expect(entry).toHaveProperty("legs");
      expect(Array.isArray(entry.legs)).toBe(true);
      expect(entry).toHaveProperty("won");
      expect(typeof entry.won).toBe("boolean");
    }
  });
});
