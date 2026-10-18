/**
 * resolverFacade.ts — Service-layer re-exports for resolver domain.
 * Routes component imports away from direct @/core/resolver access.
 */

export type { TrainingIntent, AnyIntent } from "@/platform/resolver/intents";
export type { StewardsInquiryIntent } from "@/platform/resolver/systemIntents";
