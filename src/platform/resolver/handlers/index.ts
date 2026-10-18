/**
 * handlers/index.ts - Handler registry
 *
 * This file registers all impact handlers for the resolver system.
 *
 * Dependencies: ./HorseHandler, ./FinanceHandler, ./RacingHandler, ./BreedingHandler, ./MarketHandler, ./SystemHandler, ./InfrastructureHandler, ./SyndicationHandler, ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses ALL_HANDLERS), ../impacts/ (provides impact types)
 */

import { HorseHandler } from "@/platform/resolver/handlers/HorseHandler";
import { FinanceHandler } from "@/platform/resolver/handlers/FinanceHandler";
import { RacingHandler } from "@/platform/resolver/handlers/RacingHandler";
import { BreedingHandler } from "@/platform/resolver/handlers/BreedingHandler";
import { MarketHandler } from "@/platform/resolver/handlers/MarketHandler";
import { SystemHandler } from "@/platform/resolver/handlers/SystemHandler";
import { InfrastructureHandler } from "@/platform/resolver/handlers/InfrastructureHandler";
import { SyndicationHandler } from "@/platform/resolver/handlers/SyndicationHandler";
import { InboxHandler } from "@/platform/resolver/handlers/InboxHandler";
import { DiplomacyHandler } from "@/platform/resolver/handlers/DiplomacyHandler";
import type { ImpactHandler } from "@/platform/resolver/handlers/types";

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
  new DiplomacyHandler(),
];

export * from "@/platform/resolver/handlers/types";
