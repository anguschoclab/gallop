/**
 * handlers/index.ts - Handler registry
 *
 * This file registers all impact handlers for the resolver system.
 *
 * Dependencies: ./HorseHandler, ./FinanceHandler, ./RacingHandler, ./BreedingHandler, ./MarketHandler, ./SystemHandler, ./InfrastructureHandler, ./SyndicationHandler, ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses ALL_HANDLERS), ../impacts/ (provides impact types)
 */

import { HorseHandler } from "./HorseHandler";
import { FinanceHandler } from "./FinanceHandler";
import { RacingHandler } from "./RacingHandler";
import { BreedingHandler } from "./BreedingHandler";
import { MarketHandler } from "./MarketHandler";
import { SystemHandler } from "./SystemHandler";
import { InfrastructureHandler } from "./InfrastructureHandler";
import { SyndicationHandler } from "./SyndicationHandler";
import { InboxHandler } from "./InboxHandler";
import type { ImpactHandler } from "./types";

export const ALL_HANDLERS: ImpactHandler[] = [
  new HorseHandler(),
  new FinanceHandler(),
  new RacingHandler(),
  new BreedingHandler(),
  new MarketHandler(),
  new SystemHandler(),
  new InfrastructureHandler(),
  new SyndicationHandler(),
  new InboxHandler(),
];

export * from "./types";
