/**
 * marketStrategyService.ts - Service facade for market strategy engine
 *
 * Components must not import from @/core directly. This service re-exports
 * the market strategy runner, exchange factory, and grade-segment constant
 * so components can consume them without a layering violation.
 */

export { GRADE_SEGMENTS } from "@/domains/market/simulation/priceAlerts";
export { createDefaultExchangeState } from "@/domains/market/simulation/exchange";
export {
  runMarketStrategy,
  type StrategyCandidate,
  type StrategyRun,
  type MarketStrategy,
  type StrategySource,
} from "@/domains/market/simulation/strategy";
