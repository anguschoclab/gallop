// Game State - Combined type exports
// This module provides the complete GameState type and default state creation

import type { CoreState } from "./coreState";
import type { MarketState } from "./marketState";
import type { BreedingState } from "./breedingState";
import type { RacingState } from "./racingState";
import type { SystemsState } from "./systemsState";

// Re-export individual state types and functions
export type { CoreState } from "./coreState";
export type { MarketState } from "./marketState";
export type { BreedingState } from "./breedingState";
export type { RacingState } from "./racingState";
export type { SystemsState } from "./systemsState";

// Import state creators for use in createDefaultGameState
import { createDefaultCoreState } from "./coreState";
import { createDefaultMarketState } from "./marketState";
import { createDefaultBreedingState } from "./breedingState";
import { createDefaultRacingState } from "./racingState";
import { createDefaultSystemsState } from "./systemsState";

// Re-export state creators
export { createDefaultCoreState, createDefaultMarketState, createDefaultBreedingState, createDefaultRacingState, createDefaultSystemsState };

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
 * Create a complete default GameState for new games
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
