/**
 * marketAI.ts - Re-exports for market AI system
 *
 * This file re-exports types, value calculations, and recording functions
 * from dedicated modules for backward compatibility.
 */

export {
  type MarketAIState,
  type MarketPurchase,
  type PortfolioState,
  createMarketAIState,
} from "./marketAITypes";

export {
  calculatePurchaseValue,
  shouldPurchaseHorse,
  calculateMaxPurchasePrice,
} from "./marketAIValue";

export {
  recordMarketPurchase,
  recordMarketOutcome,
  getMarketInsights,
  getMarketTimingRecommendation,
  calculateNegotiatedPrice,
} from "./marketAIRecording";
