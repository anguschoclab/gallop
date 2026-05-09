/**
 * horseGen.ts - Horse generation re-export
 *
 * This file re-exports horse generation functions from the new location after a
 * refactor moved it from src/game/ to src/core/horse/.
 *
 * Dependencies: @/core/horse/horseFactory
 * Related files: horseFactory.ts (original implementation)
 */

// Re-export from new location after refactor (was moved from src/game/ to src/core/horse/)
export * from "@/core/horse/horseFactory";
