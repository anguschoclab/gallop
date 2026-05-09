/**
 * handlers/index.ts - Impact handlers
 *
 * This file exports all impact handlers for the resolver system.
 * Handlers apply impacts to the game state using Immer.
 *
 * Dependencies: ./HorseHandler, ./FinanceHandler, ./RacingHandler, ./BreedingHandler, ./MarketHandler, ./SystemHandler, ./InfrastructureHandler, ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses ALL_HANDLERS), ../impacts/ (provides impact types)
 */

import { HorseHandler } from "./HorseHandler";
import { FinanceHandler } from "./FinanceHandler";
import { RacingHandler } from "./RacingHandler";
import { BreedingHandler } from "./BreedingHandler";
import { MarketHandler } from "./MarketHandler";
import { SystemHandler } from "./SystemHandler";
import { InfrastructureHandler } from "./InfrastructureHandler";
import type { ImpactHandler } from "./types";

export const ALL_HANDLERS: ImpactHandler[] = [
  new HorseHandler(),
  new FinanceHandler(),
  new RacingHandler(),
  new BreedingHandler(),
  new MarketHandler(),
  new SystemHandler(),
  new InfrastructureHandler(),
];

export * from "./types";
