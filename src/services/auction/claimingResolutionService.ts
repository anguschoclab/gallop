/**
 * claimingResolutionService.ts - Re-export from @/core/auction/claimingResolutionService
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/auction/claimingResolutionService instead.
 */

export {
  processClaimingResolution,
  type ProcessClaimingProps,
} from "@/core/auction/claimingResolutionService";
