/**
 * stableCardService.ts - Service facade for stable card display operations.
 *
 * Wraps core stable/auction/horse functions so components don't import core directly.
 * This reduces component→core layering violations for the stable card UI.
 *
 * Dependencies: @/domains/stable/simulation/uiHelpers, @/core/common/uiTokens,
 *              @/core/stable/pendingOfferForStable, @/core/auction/engine,
 *              @/core/horse/attachment
 * Related files: src/components/stable/StableCard.tsx (consumer)
 */

import { getReputationStars } from "@/core/stable/uiHelpers";
import { stableTierColor } from "@/shared/common/uiTokens";
import { findPendingOfferForStable } from "@/domains/stable/simulation/pendingOfferForStable";
import { calculateLotValuation } from "@/domains/auction/simulation/engine";
import { evaluateHorseAttachment, attachmentAdjustedAsk } from "@/domains/horse/simulation/attachment";

export {
  getReputationStars,
  stableTierColor,
  findPendingOfferForStable,
  calculateLotValuation,
  evaluateHorseAttachment,
  attachmentAdjustedAsk,
};
