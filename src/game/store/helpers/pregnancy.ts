/**
 * helpers/pregnancy.ts - Re-export from @/core/breeding/pregnancy
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing importers working during the transition.
 *
 * @deprecated Import from @/core/breeding/pregnancy instead.
 */

export {
  resolvePregnancies,
  type PregnancyResult,
  type PregnancyResolutionInput,
} from "@/core/breeding/pregnancy";
