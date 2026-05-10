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
import { DAYS_PER_YEAR } from "../src/game/constants/gameConstants";

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
      await useGame.getState().advanceMultipleDays(DAYS_PER_YEAR, true);

      const state = useGame.getState();

      // Check for triple crown winners
      const winners = state.triplecrownHistory?.filter((tc: any) => tc.won) ?? [];

      if (winners.length > 0) {
        foundWinner = true;
        yearsTaken = year;
        const topWinner = winners[0];
        triplecrownKey = topWinner.key;
        winningHorse = state.horses.find((h: Horse) => h.id === topWinner.horseId) || null;

        // Find sire fee (before/after comparison)
        if (winningHorse && winningHorse.pedigree?.sireId) {
          const sire = state.horses.find((h: Horse) => h.id === winningHorse!.pedigree!.sireId);
          if (sire && sire.stud) {
            sireFeeAfter = sire.stud.standingFee;
            // Since we're checking after the fact, we can only see current fee.
            // But news history might have it.
            const news = state.news?.find(
              (n) => n.text.includes(sire.name) && n.text.includes("Fee:"),
            );
            if (news) {
              // $50,000 → $75,000
              const match = news.text.match(/\$(\d+,?\d+) → \$(\d+,?\d+)/);
              if (match) {
                sireFeeBefore = parseInt(match[1].replace(/,/g, ""));
                sireFeeAfter = parseInt(match[2].replace(/,/g, ""));
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error in year ${year}:`, e);
      break;
    }
  }

  if (foundWinner && winningHorse) {
    console.log(`\n🎉 TRIPLE CROWN WINNER FOUND in Year ${yearsTaken}!`);
    console.log(`Region: ${triplecrownKey}`);
    console.log(`Horse: ${winningHorse.name} (${winningHorse.age}YO ${winningHorse.gender})`);
    console.log(`Sire: ${winningHorse.sireName}`);
    console.log(`Dam: ${winningHorse.damName}`);

    if (sireFeeBefore > 0) {
      console.log(`\nSire Stud Fee Impact:`);
      console.log(`Before: $${sireFeeBefore.toLocaleString()}`);
      console.log(`After:  $${sireFeeAfter.toLocaleString()}`);
      console.log(
        `Increase: $${(sireFeeAfter - sireFeeBefore).toLocaleString()} (${Math.round((sireFeeAfter / sireFeeBefore - 1) * 100)}%)`,
      );
    } else {
      console.log(
        `\nSire Stud Fee: $${sireFeeAfter.toLocaleString()} (Initial fee data not found)`,
      );
    }
  } else {
    console.log("\n❌ No Triple Crown winner found within simulation limit.");
  }

  process.exit(0);
}

runSimulation();
