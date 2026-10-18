import { PHASE_ORDER_CLAIM_REGISTRATION } from "@/platform/time/pipelineConstants";;
import type { Claim, GameState } from "@/platform/game/types";
import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";
import type { ClaimingIntent } from "@/platform/resolver/intents";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { getOrCreateStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import { createClaimingAIState } from "@/domains/agents/simulation/claimingAITypes";
import { recordClaimingDecision } from "@/domains/agents/simulation/claimingAIRecording";

function cloneNpcAIManager(manager: NpcAIManager | undefined): NpcAIManager | undefined {
  if (!manager) return undefined;
  return {
    ...manager,
    stableStates: Object.fromEntries(
      Object.entries(manager.stableStates).map(([id, stableState]) => [id, { ...stableState }]),
    ),
  };
}

/**
 * Converts validated claiming intents into the canonical persisted Claim records
 * consumed by UI and claim resolution. The intent itself is consumed here so the
 * claim has one authoritative lifecycle.
 */
export const claimRegistrationPhase: PipelinePhase = {
  name: "claimRegistration",
  order: PHASE_ORDER_CLAIM_REGISTRATION,
  execute: (context: PipelineContext): PipelineContext => {
    const claimingIntents = context.intents.filter(
      (intent): intent is ClaimingIntent => intent.type === "claiming",
    );
    if (claimingIntents.length === 0) return context;

    const existingClaims = [...(context.state.claims ?? [])];
    const claimKeys = new Set(
      existingClaims.map(
        (claim) => `${claim.raceId}:${claim.horseId}:${claim.claimantStableId ?? ""}`,
      ),
    );
    const newClaims: Claim[] = [];
    const npcAIManager = cloneNpcAIManager(context.state.npcAIManager);

    for (const intent of claimingIntents) {
      const claimantStableId = intent.source === "player" ? undefined : intent.claimantStableId;
      const claimKey = `${intent.raceId}:${intent.horseId}:${claimantStableId ?? ""}`;
      if (claimKeys.has(claimKey)) continue;
      claimKeys.add(claimKey);
      newClaims.push({
        id: intent.id,
        raceId: intent.raceId,
        horseId: intent.horseId,
        claimantStableId,
        price: intent.claimingPrice,
        day: context.newDay,
      });

      if (npcAIManager && claimantStableId) {
        const stable = context.stableMap.get(claimantStableId);
        const horse = context.horseMap.get(intent.horseId);
        const race = context.raceMap.get(intent.raceId);
        if (stable && horse && race) {
          const stableAI = getOrCreateStableAIState(npcAIManager, stable, context.newDay);
          const claimingAI = stableAI.claimingAI ?? createClaimingAIState(stable);
          stableAI.claimingAI = recordClaimingDecision(
            claimingAI,
            horse,
            race,
            stable,
            context.newDay,
          );
          npcAIManager.stableStates[stable.id] = stableAI;
        }
      }
    }

    const nextState: GameState = {
      ...context.state,
      claims: [...existingClaims, ...newClaims],
      ...(npcAIManager ? { npcAIManager } : {}),
    };

    return {
      ...context,
      intents: context.intents.filter((intent) => intent.type !== "claiming"),
      state: nextState,
    };
  },
};
