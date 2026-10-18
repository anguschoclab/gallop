/**
 * raceResultService.ts - Service facade for race result UI components.
 *
 * Re-exports core race-result functions so UI components can import from
 * @/services instead of @/core directly, preserving the layering rule:
 *   components → services → core
 *
 * Dependencies: @/domains/race/simulation/raceVerdict, @/core/race/engine/compareFinishOrder,
 *              @/domains/agents/simulation/jockeyStrategyRecording, @/core/horse/ownership,
 *              @/core/race/venuePayout, @/core/common/formatting
 * Related files: src/components/race/ResultOverlay.tsx (consumer)
 */

export { generateRaceVerdict } from "@/domains/race/simulation/raceVerdict";
export { compareFinishOrder } from "@/domains/race/simulation/engine/compareFinishOrder";
export { getStrategyInsights } from "@/domains/agents/simulation/jockeyStrategyRecording";
export { makePlayerOwned, makeUnowned } from "@/domains/horse/simulation/ownership";
export { venuePayoutMultiplier } from "@/domains/race/simulation/venuePayout";
export { formatCurrency } from "@/shared/common/formatting";

// Type re-exports for UI consumers
export type { RaceSnapshot, PaceSnapshot } from "@/domains/race/model/engine/raceSnapshotTypes";
export type { Runner } from "@/domains/race/simulation/engine/runnerBuilder";
export type { RaceRunner, SectionalSplit } from "@/domains/race/simulation/types";
export type { RunnerFactorLedger } from "@/domains/race/simulation/factorLedger";
