import { PHASE_ORDER_NPC_CLAIMING } from "@/platform/time/pipelineConstants";;
import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";

/**
 * Quarantined legacy NPC claiming path.
 *
 * NPC claiming decisions now emit `claiming` intents during intent collection;
 * `claimRegistrationPhase` persists them into canonical claims and
 * `claimResolutionPhase` settles them. This module is intentionally inert so an
 * accidental direct call cannot create a second claim-writing path.
 */
export const npcClaimingPhase: PipelinePhase = {
  name: "npcClaiming",
  order: PHASE_ORDER_NPC_CLAIMING,
  execute: (context: PipelineContext): PipelineContext => context,
};
