/**
 * helpers/beyer.ts - Re-export from @/core/race/beyerPars
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing importers working during the transition.
 *
 * @deprecated Import from @/core/race/beyerPars instead.
 */

export {
  maybeRecalibratePars,
  recomputePars,
  type RecalibrationResult,
} from "@/core/race/beyerPars";
