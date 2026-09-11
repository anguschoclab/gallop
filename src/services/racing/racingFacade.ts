/**
 * racingFacade.ts — Service-layer re-exports for racing domain.
 * Routes component imports away from direct @/core/racing access.
 */

export {
  calculateNominationFee,
  getNominationTier,
  getRaceGrade,
  type NominationRecord,
  type NominationStatus,
  type NominationTier,
} from "@/core/racing/nominationFees";
