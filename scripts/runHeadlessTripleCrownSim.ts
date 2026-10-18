/**
 * Standalone Headless Triple Crown Simulation Script
 *
 * Runs the production SimulationExecutor until a Triple Crown winner appears
 * in any region, then reports the years taken, pedigree, and the sire's
 * standing-fee change across the winning season.
 *
 * Run with: bun run scripts/runHeadlessTripleCrownSim.ts [maxYears] [worldSize]
 */

import { createInitialState } from "@/platform/game/store/initialization";
import { SimulationExecutor } from "@/platform/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { withUuidStream } from "@/shared/uuid/uuid";
import { createRng, hashStr } from "@/shared/common/rng";
import { DAYS_PER_YEAR } from "@/domains/calendar/model/calendarConstants";;
import type { GameState, Horse } from "@/platform/game/types";
import type { HorseId } from "@/shared/types/branded";

const maxYears = Number(process.argv[2] ?? 100);
const worldSize = (process.argv[3] ?? "medium") as "small" | "medium" | "large";

function findHorse(state: GameState, id: string | undefined): Horse | null {
  if (!id) return null;
  return state.horses[id as HorseId] ?? state.archive?.horses?.find((h) => h.id === id) ?? null;
}

function main() {
  console.log(`=== Starting Headless Triple Crown Simulation (${worldSize}) ===\n`);

  // Deterministic entity ids keep runs reproducible across processes.
  let state = withUuidStream(createRng(hashStr(`fixture_${worldSize}`)), () =>
    createInitialState({
      profile: {
        stableName: "tc-sim",
        ownerName: "TC",
        silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
        backstoryId: "inheritor",
        founded: 1,
      },
      backstory: {
        id: "inheritor",
        label: "TC",
        blurb: "",
        startingCash: 100000,
        horses: [{ tier: "starter" as const, count: 2 }],
        facilityUpgrades: {},
        facilities: {},
        reputationScore: 50,
        reputation: 50,
        difficulty: "standard",
      },
      worldSize,
    }),
  ) as GameState;

  const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
  const startDay = state.day;

  // Snapshot every stallion's fee once per simulated year so the winning
  // season's fee move can be reported without scraping news items.
  const yearlyFees = new Map<HorseId, number>();
  const recordFees = () => {
    for (const h of Object.values(state.horses)) {
      if (h.stud?.atStud) yearlyFees.set(h.id, h.stud.standingFee);
    }
  };
  recordFees();

  let winningHorse: Horse | null = null;
  let triplecrownKey: string | null = null;
  let yearsTaken = 0;

  for (let year = 1; year <= maxYears && !winningHorse; year++) {
    const yearStart = Date.now();
    for (let d = 0; d < DAYS_PER_YEAR && !winningHorse; d++) {
      const outcome = executor.runDay(state, state.day + 1);
      state = outcome.state;
      const winner = state.triplecrownHistory?.find((tc) => tc.won);
      if (winner) {
        yearsTaken = year;
        triplecrownKey = winner.triplecrownKey;
        winningHorse = findHorse(state, winner.horseId);
      }
    }
    if (!winningHorse) {
      console.log(`Year ${year} done in ${((Date.now() - yearStart) / 1000).toFixed(1)}s`);
      recordFees();
    }
  }

  if (winningHorse) {
    console.log(`\nTRIPLE CROWN WINNER FOUND in Year ${yearsTaken} (day ${state.day - startDay})!`);
    console.log(`Region: ${triplecrownKey}`);
    console.log(`Horse: ${winningHorse.name} (${winningHorse.age}YO ${winningHorse.gender})`);
    console.log(`Sire: ${winningHorse.sireName}`);
    console.log(`Dam: ${winningHorse.damName}`);

    const sire = findHorse(state, winningHorse.pedigree?.sireId);
    if (sire?.stud?.atStud) {
      const before = yearlyFees.get(sire.id);
      const after = sire.stud.standingFee;
      if (before !== undefined && before > 0 && before !== after) {
        console.log(`\nSire Stud Fee Impact:`);
        console.log(`Before: $${before.toLocaleString()}`);
        console.log(`After:  $${after.toLocaleString()}`);
        console.log(
          `Increase: $${(after - before).toLocaleString()} (${Math.round((after / before - 1) * 100)}%)`,
        );
      } else {
        console.log(`\nSire Stud Fee: $${after.toLocaleString()} (no season-over-season change)`);
      }
    }
  } else {
    console.log(`\nNo Triple Crown winner found within ${maxYears} years.`);
  }
}

main();
