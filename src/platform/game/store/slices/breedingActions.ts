/**
 * breedingActions.ts - Re-exports for breeding actions
 *
 * This file now re-exports syndicate and batch breeding actions from
 * dedicated modules for backward compatibility.
 */

export { createSyndicateActions } from "@/platform/game/store/slices/syndicateActions";
export { createBreedingBatchActions } from "@/platform/game/store/slices/breedingBatchActions";
