/**
 * traitCompatibility.ts - Re-export from @/core/breeding/traitCompatibility
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/breeding/traitCompatibility instead.
 */

export {
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
} from "@/core/breeding/traitCompatibility";
