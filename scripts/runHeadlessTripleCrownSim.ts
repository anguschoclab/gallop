/**
 * Standalone Headless Triple Crown Simulation Script
 *
 * This script runs a headless simulation until a Triple Crown winner is found in any region,
 * then reports the years taken, pedigree, and sire breeding price impact.
 *
 * Run with: bun run scripts/runHeadlessTripleCrownSim.ts
 */

import { createInitialState } from "../src/game/store/initialization";
import { useGame } from "../src/game/store";
import type { Horse } from "../src/core/horse/types";

// Suppress worker warnings
const originalWarn = console.warn;
console.warn = () => {};

async function runSimulation() {
  console.log("=== Starting Headless Triple Crown Simulation ===\n");

  // Initialize game state with NPCs and horses
  const initialState = createInitialState();
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
    console.log(`Simulating year ${year}...`);
    
    try {
      // Advance one year in headless mode
      await useGame.getState().advanceMultipleDays(365, true);

      const state = useGame.getState();

      // Check for triple crown winners
      const winners = state.triplecrownHistory?.filter((tc: any) => tc.won) ?? [];

      if (winners.length > 0) {
        foundWinner = true;
        yearsTaken = year;
        const winner = winners[0];
        winningHorse = state.horses.find((h: any) => h.id === winner.horseId) ?? null;
        triplecrownKey = winner.triplecrownKey;

        // Get sire's standing fee (after win)
        const sireId = winningHorse?.pedigree?.sireId;
        if (sireId) {
          const sire = state.horses.find((h: any) => h.id === sireId);
          sireFeeAfter = sire?.stud?.standingFee ?? 0;
          // previousStandingFee is optional, use current fee if not present
          sireFeeBefore = sire?.stud?.previousStandingFee ?? sireFeeAfter;
        }

        break;
      }
    } catch (error) {
      console.error(`Error in year ${year}:`, error);
      console.log("Continuing simulation...");
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
    
    // Answer user's specific questions
    console.log("\n=== Answers to Your Questions ===");
    console.log(`1. How many years it took: ${yearsTaken} years`);
    console.log(`2. Pedigree of the horse:`);
    console.log(`   - Sire: ${winningHorse?.pedigree?.sireName} (ID: ${winningHorse?.pedigree?.sireId})`);
    console.log(`   - Dam: ${winningHorse?.pedigree?.damName} (ID: ${winningHorse?.pedigree?.damId})`);
    console.log(`3. Did the win increase the sire breeding price: ${sireFeeAfter > sireFeeBefore ? 'YES' : 'NO'}`);
    if (sireFeeAfter > sireFeeBefore) {
      console.log(`   Increase: $${(sireFeeAfter - sireFeeBefore).toLocaleString()}`);
    }
  } else {
    console.log("No Triple Crown winner found within 100 years");
    console.log("This may indicate a rare event or a bug in the detection logic");
  }
  console.log("=====================================\n");

  // Restore console.warn
  console.warn = originalWarn;
}

runSimulation().catch((error) => {
  console.error("Simulation failed:", error);
  console.warn = originalWarn;
  process.exit(1);
});
