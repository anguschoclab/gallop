/**
 * foalGen.ts - Foaling re-exports
 *
 * This file re-exports foaling types and functions from the horseFactory module
 * after a refactor merged foalGen into horseFactory.
 *
 * Dependencies: @/core/horse/horseFactory (FoalOutcome, resolveFoaling)
 * Related files: horseFactory.ts (original implementation)
 */

// Re-export from new location after refactor (foalGen merged into horseFactory)
export type { FoalOutcome } from "@/core/horse/horseFactory";
export { resolveFoaling } from "@/core/horse/horseFactory";
