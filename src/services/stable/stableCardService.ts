/**
 * stableCardService.ts - Service facade for stable card display operations.
 *
 * Wraps core stable/auction/horse functions so components don't import core directly.
 * This reduces component→core layering violations for the stable card UI.
 *
 * Dependencies: @/core/stable/uiHelpers, @/core/common/uiTokens,
 *              @/core/stable/pendingOfferForStable, @/core/auction/engine,
 *              @/core/horse/attachment
 * Related files: src/components/stable/StableCard.tsx (consumer)
 */

import { getReputationStars } from "@/core/stable/uiHelpers";
import { stableTierColor } from "@/core/common/uiTokens";
import { findPendingOfferForStable } from "@/core/stable/pendingOfferForStable";
import { calculateLotValuation } from "@/core/auction/engine";
import { evaluateHorseAttachment, attachmentAdjustedAsk } from "@/core/horse/attachment";

export {
  getReputationStars,
  stableTierColor,
  findPendingOfferForStable,
  calculateLotValuation,
  evaluateHorseAttachment,
  attachmentAdjustedAsk,
};
