/**
 * marketStrategyService.ts - Service facade for market strategy engine
 *
 * Components must not import from @/core directly. This service re-exports
 * the market strategy runner, exchange factory, and grade-segment constant
 * so components can consume them without a layering violation.
 */

export { GRADE_SEGMENTS } from "@/core/market/priceAlerts";
export { createDefaultExchangeState } from "@/core/market/exchange";
export {
  runMarketStrategy,
  type StrategyCandidate,
  type StrategyRun,
  type MarketStrategy,
  type StrategySource,
} from "@/core/market/strategy";
