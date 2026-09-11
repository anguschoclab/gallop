/**
 * inbreedingCalculator.ts - Re-export from @/core/breeding/inbreedingCalculator
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/breeding/inbreedingCalculator instead.
 */

export {
  checkDirectInbreeding,
  calculateFounderEffect,
  type DirectInbreedingResult,
} from "@/core/breeding/inbreedingCalculator";
