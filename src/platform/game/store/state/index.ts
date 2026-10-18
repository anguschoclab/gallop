/**
 * state/index.ts - State module exports
 *
 * This file exports all state types and creators from the state module, providing
 * the complete GameState type as an intersection of all domain states, and the
 * NewGameOptions interface for game initialization.
 *
 * Dependencies: @/platform/game/store/state/coreState (CoreState, createDefaultCoreState), ./marketState (MarketState, createDefaultMarketState), ./breedingState (BreedingState, createDefaultBreedingState), ./racingState (RacingState, createDefaultRacingState), ./systemsState (SystemsState, createDefaultSystemsState), ../types (PlayerProfile), @/core/newGame/backstories (Backstory)
 * Related files: store.ts (uses GameState), index.ts (exports NewGameOptions)
 */

// Game State - Combined type exports
// This module provides the complete GameState type and default state creation

// Re-export individual state types and functions
import type { CoreState } from "./coreState";
import type { MarketState } from "@/platform/game/store/state/marketState";
import type { BreedingState } from "@/platform/game/store/state/breedingState";
import type { RacingState } from "@/platform/game/store/state/racingState";
import type { SystemsState } from "@/platform/game/store/state/systemsState";

export type { CoreState, MarketState, BreedingState, RacingState, SystemsState };
export type { NewGameOptions } from "@/platform/game/store/state/types";

// Import state creators for use in createDefaultGameState
import { createDefaultCoreState } from "@/platform/game/store/state/coreState";
import { createDefaultMarketState } from "@/platform/game/store/state/marketState";
import { createDefaultBreedingState } from "@/platform/game/store/state/breedingState";
import { createDefaultRacingState } from "@/platform/game/store/state/racingState";
import { createDefaultSystemsState } from "@/platform/game/store/state/systemsState";

// Re-export state creators
export {
  createDefaultCoreState,
  createDefaultMarketState,
  createDefaultBreedingState,
  createDefaultRacingState,
  createDefaultSystemsState,
};

/**
 * Complete GameState type - intersection of all domain states
 *
 * This type is split into domain-specific slices for better maintainability:
 * - CoreState: Essential game loop (day, cash, horses, races, log)
 * - MarketState: Trading and acquisition (market, auctions, scout reports)
 * - BreedingState: Reproduction tracking (pregnancies, triple crown history)
 * - RacingState: Performance analytics (pace samples, par times, training used)
 * - SystemsState: Optional subsystems (NPCs, jockeys, awards, campaigns, leaderboards)
 */
export type GameState = CoreState & MarketState & BreedingState & RacingState & SystemsState;

/**
 * Create a complete default GameState for new games.
 *
 * Combines all domain state creators (core, market, breeding, racing, systems)
 * into a single game state object.
 *
 * @returns Complete default game state with all domain states initialized
 */
export function createDefaultGameState(): GameState {
  return {
    ...createDefaultCoreState(),
    ...createDefaultMarketState(),
    ...createDefaultBreedingState(),
    ...createDefaultRacingState(),
    ...createDefaultSystemsState(),
  };
}

// Helper type to extract a specific domain from GameState
export type ExtractDomain<T extends keyof GameState> = Pick<GameState, T>;
