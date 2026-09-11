/**
 * commonFacade.ts — Service-layer facade for common UI utilities.
 * Per PR 9 of the megaplan.
 */

export * from "@/core/common/uiTokens";
export * from "@/core/common/traitLabels";
export * from "@/core/common/countryFlag";
export * from "@/core/common/ordinal";
export * from "@/core/common/backstories";
export * from "@/core/common/classBonus";
export * from "@/core/common/rng";
export { generateUUID } from "@/core/uuid";
export {
  asHorseId,
  asPlayerOwnerId,
  asStableId,
  asNpcStableId,
  asOwnerKey,
  asRaceId,
  asJockeyId,
} from "@/core/types/branded";
