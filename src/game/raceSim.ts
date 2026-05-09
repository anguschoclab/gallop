/**
 * raceSim.ts - Race simulation re-export
 *
 * This file re-exports race simulation functions from the new location after a
 * refactor moved it from src/game/ to src/core/race/engine/.
 *
 * Dependencies: @/core/race/engine/simulation, @/core/race/engine/runnerBuilder
 * Related files: core/race/engine/simulation.ts (simulation logic), core/race/engine/runnerBuilder.ts (runner building)
 */

// Re-export from new location after refactor (was moved from src/game/ to src/core/race/engine/)
export * from "@/core/race/engine/simulation";
export * from "@/core/race/engine/runnerBuilder";
