/**
 * resolverFacade.ts — Service-layer re-exports for resolver domain.
 * Routes component imports away from direct @/core/resolver access.
 */

export type { TrainingIntent, AnyIntent } from "@/core/resolver/intents";
export type { StewardsInquiryIntent } from "@/core/resolver/systemIntents";
