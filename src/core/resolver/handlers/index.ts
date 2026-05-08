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
