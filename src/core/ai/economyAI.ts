/**
 * economyAI.ts - Re-exports for global economic state management
 *
 * This file re-exports state, tracking, and cartel functions from
 * dedicated modules for backward compatibility.
 */

export {
  createEconomicState,
  updateEconomicTrends,
  calculateStudFeeAdjustment,
  calculateYearlingPriceAdjustment,
  getEconomicSignal,
} from "./economyAIState";

export {
  processEconomicCycle,
  trackClaimingActivity,
  trackAuctionPrices,
  trackBreedingVolume,
  trackMarketPrices,
} from "./economyAITracking";

export {
  evaluateCartelOpportunity,
  coordinateCartelAction,
  calculateAuctionReservePrice,
  calculateStrategicClaimingPrice,
  calculateDynamicStudFee,
} from "./economyAICartel";
