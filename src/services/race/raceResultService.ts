/**
 * raceResultService.ts - Service facade for race result UI components.
 *
 * Re-exports core race-result functions so UI components can import from
 * @/services instead of @/core directly, preserving the layering rule:
 *   components → services → core
 *
 * Dependencies: @/core/race/raceVerdict, @/core/race/engine/compareFinishOrder,
 *              @/core/ai/jockeyStrategyRecording, @/core/horse/ownership,
 *              @/core/race/venuePayout, @/core/common/formatting
 * Related files: src/components/race/ResultOverlay.tsx (consumer)
 */

export { generateRaceVerdict } from "@/core/race/raceVerdict";
export { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
export { getStrategyInsights } from "@/core/ai/jockeyStrategyRecording";
export { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";
export { venuePayoutMultiplier } from "@/core/race/venuePayout";
export { formatCurrency } from "@/core/common/formatting";

// Type re-exports for UI consumers
export type { RaceSnapshot, PaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
export type { Runner } from "@/core/race/engine/runnerBuilder";
export type { RaceRunner, SectionalSplit } from "@/core/race/types";
export type { RunnerFactorLedger } from "@/core/race/factorLedger";
