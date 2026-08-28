/**
 * phases/privateSaleResolution.ts - Private sale NPC decision phase
 *
 * This phase processes pending private sale offers from the player and
 * generates NPC accept/counter/decline decisions based on personality
 * and horse valuation.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/horse/pricing (calculateNpcHorseValue), @/core/stable/stableConfig (PERSONALITY_CONFIG), @/game/types (PrivateSaleOffer, Horse, Stable), @/core/uuid (generateUUID)
 * Related files: privateSaleExpiry.ts (runs before this phase), purchaseResolution.ts (runs after)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { calculateNpcHorseValue } from "@/core/horse/pricing";
import { calculateLotValuation } from "@/core/auction/engine";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { attachmentAdjustedAsk, evaluateHorseAttachment } from "@/core/horse/attachment";
import { computeDiplomaticPressure } from "@/core/horse/overrideNegotiation";
import { DIPLOMATIC_FAILURE_FRICTION_PENALTY } from "@/constants/privateSaleConstants";
import { calculateFrictionChange } from "@/core/stable/rivalry";
import type { PrivateSaleOffer, Horse, Stable, StablePersonality } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type { HorseTransferImpact, CashImpact } from "@/core/resolver/impacts";

const ACCEPT_THRESHOLDS: Record<StablePersonality, number> = {
  aggressive: 0.7,
  conservative: 1.0,
  developer: 0.9,
  "win-now": 1.0,
  specialist: 1.0,
  breeder: 1.1,
  trader: 0.8,
  prestige: 1.3,
};

const COUNTER_THRESHOLDS: Record<StablePersonality, number> = {
  aggressive: 0.5,
  conservative: 0.8,
  developer: 0.7,
  "win-now": 0.8,
  specialist: 0.8,
  breeder: 0.9,
  trader: 0.6,
  prestige: 1.0,
};

const COUNTER_MULTIPLIERS: Record<StablePersonality, number> = {
  aggressive: 1.1,
  conservative: 1.2,
  developer: 1.15,
  "win-now": 1.2,
  specialist: 1.2,
  breeder: 1.25,
  trader: 1.1,
  prestige: 1.4,
};

export const privateSaleResolutionPhase: PipelinePhase = {
  name: "privateSaleResolution",
  order: 34,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs, impacts } = context;
    const offers: PrivateSaleOffer[] = state.privateSaleOffers ?? [];
    if (offers.length === 0) return context;

    const { horseMap, stableMap, dailyRng } = context;
    const allHorsesArray = Array.from(horseMap.values());
    const newLogs = [...logs];
    const newImpacts = [...impacts];
    const updatedOffers: PrivateSaleOffer[] = [];
    let updatedNpcAIManager = state.npcAIManager;

    for (const offer of offers) {
      if (offer.status !== "pending" && offer.status !== "override_pending") {
        updatedOffers.push(offer);
        continue;
      }

      const horse = horseMap.get(offer.horseId);
      if (!horse) {
        updatedOffers.push(offer);
        continue;
      }

      const stableId = offer.toStableId;
      if (!stableId) {
        updatedOffers.push(offer);
        continue;
      }

      const stable = stableMap.get(stableId);
      if (!stable) {
        updatedOffers.push(offer);
        continue;
      }

      const horseStableId = horse.ownership?.type === "npc" ? horse.ownership.stableId : undefined;
      if (horseStableId !== stableId) {
        newLogs.push({
          day: newDay,
          text: `${horse.name} is no longer at ${stable.name} — offer declined.`,
        });
        updatedOffers.push({ ...offer, status: "declined" });
        continue;
      }

      // ── Override handling ──
      if (offer.status === "override_pending") {
        const overrideAmount = offer.overrideAmount ?? offer.amount;

        if (offer.overrideType === "premium") {
          // Premium buyout: always succeeds
          updatedOffers.push({ ...offer, status: "accepted" });

          const intentId = generateUUID();
          newImpacts.push({
            id: generateUUID(),
            intentId,
            day: newDay,
            phase: "privateSaleResolution",
            type: "horse_transfer",
            horseId: offer.horseId,
            fromStableId: stableId,
            toStableId: undefined,
            price: overrideAmount,
            reason: "private_sale_override_premium",
            logLevel: "always",
          } as HorseTransferImpact);

          newImpacts.push({
            id: generateUUID(),
            intentId,
            day: newDay,
            phase: "privateSaleResolution",
            type: "cash_change",
            entityId: "player",
            amount: -overrideAmount,
            reason: "private_sale_override_premium",
            logLevel: "always",
          } as CashImpact);

          newImpacts.push({
            id: generateUUID(),
            intentId,
            day: newDay,
            phase: "privateSaleResolution",
            type: "cash_change",
            entityId: stableId,
            amount: overrideAmount,
            reason: "private_sale_override_premium",
            logLevel: "always",
          } as CashImpact);

          newLogs.push({
            day: newDay,
            text: `${stable.name} accepted your premium buyout of $${overrideAmount.toLocaleString()} for ${horse.name}.`,
          });
          continue;
        } else if (offer.overrideType === "diplomatic") {
          // Diplomatic pressure: RNG-based success/failure
          const attachment = evaluateHorseAttachment(horse, stable);
          const friction =
            updatedNpcAIManager?.stableStates?.[stableId]?.friction ?? 0;
          const reputationScore = state.reputation?.score ?? 0;
          const { odds, successCost, failurePenalty } = computeDiplomaticPressure(
            attachment,
            attachmentAdjustedAsk(horse, stable, calculateLotValuation(horse, stable, "racing_age", allHorsesArray, horseMap), state.reputation?.score ?? 0),
            friction,
            reputationScore,
          );

          const roll = dailyRng.next();

          if (roll < odds) {
            // Success
            updatedOffers.push({ ...offer, status: "accepted" });

            const intentId = generateUUID();
            newImpacts.push({
              id: generateUUID(),
              intentId,
              day: newDay,
              phase: "privateSaleResolution",
              type: "horse_transfer",
              horseId: offer.horseId,
              fromStableId: stableId,
              toStableId: undefined,
              price: overrideAmount,
              reason: "private_sale_override_diplomatic_success",
              logLevel: "always",
            } as HorseTransferImpact);

            newImpacts.push({
              id: generateUUID(),
              intentId,
              day: newDay,
              phase: "privateSaleResolution",
              type: "cash_change",
              entityId: "player",
              amount: -overrideAmount,
              reason: "private_sale_override_diplomatic",
              logLevel: "always",
            } as CashImpact);

            newImpacts.push({
              id: generateUUID(),
              intentId,
              day: newDay,
              phase: "privateSaleResolution",
              type: "cash_change",
              entityId: stableId,
              amount: overrideAmount,
              reason: "private_sale_override_diplomatic",
              logLevel: "always",
            } as CashImpact);

            newLogs.push({
              day: newDay,
              text: `Diplomatic pressure succeeded — ${stable.name} released ${horse.name} for $${overrideAmount.toLocaleString()}.`,
            });
          } else {
            // Failure
            updatedOffers.push({ ...offer, status: "override_failed" });

            // Increase friction directly on npcAIManager
            if (updatedNpcAIManager?.stableStates?.[stableId]) {
              const currentFriction = updatedNpcAIManager.stableStates[stableId].friction;
              const newFriction = calculateFrictionChange(currentFriction, DIPLOMATIC_FAILURE_FRICTION_PENALTY);
              updatedNpcAIManager = {
                ...updatedNpcAIManager,
                stableStates: {
                  ...updatedNpcAIManager.stableStates,
                  [stableId]: {
                    ...updatedNpcAIManager.stableStates[stableId],
                    friction: newFriction,
                  },
                },
              };
            }

            newLogs.push({
              day: newDay,
              text: `Diplomatic pressure failed — ${stable.name} refused to release ${horse.name}. ${failurePenalty}`,
            });
          }
          continue;
        }
      }

      // ── Normal pending offer handling ──
      const marketValue = calculateLotValuation(horse, stable, "racing_age", allHorsesArray, horseMap);
      const attachment = evaluateHorseAttachment(horse, stable);
      const valuation = attachmentAdjustedAsk(horse, stable, marketValue, state.reputation?.score ?? 0);
      const offerRatio = offer.amount / valuation;
      const personality = stable.personality;
      const cashPressure = evaluateCashPressure(stable, stable.horses.length);
      const acceptThreshold = applyCashPressureToThreshold(
        ACCEPT_THRESHOLDS[personality],
        cashPressure.pressure,
      );
      const counterThreshold = applyCashPressureToThreshold(
        COUNTER_THRESHOLDS[personality],
        cashPressure.pressure,
      );

      if (offerRatio >= acceptThreshold) {
        updatedOffers.push({ ...offer, status: "accepted" });

        const intentId = generateUUID();
        newImpacts.push({
          id: generateUUID(),
          intentId,
          day: newDay,
          phase: "privateSaleResolution",
          type: "horse_transfer",
          horseId: offer.horseId,
          fromStableId: stableId,
          toStableId: undefined,
          price: offer.amount,
          reason: "private_sale_accept",
          logLevel: "always",
        } as HorseTransferImpact);

        newImpacts.push({
          id: generateUUID(),
          intentId,
          day: newDay,
          phase: "privateSaleResolution",
          type: "cash_change",
          entityId: "player",
          amount: -offer.amount,
          reason: "private_sale_purchase",
          logLevel: "always",
        } as CashImpact);

        newImpacts.push({
          id: generateUUID(),
          intentId,
          day: newDay,
          phase: "privateSaleResolution",
          type: "cash_change",
          entityId: stableId,
          amount: offer.amount,
          reason: "private_sale_sale",
          logLevel: "always",
        } as CashImpact);

        newLogs.push({
          day: newDay,
          text: `${stable.name} accepted your offer of $${offer.amount.toLocaleString()} for ${horse.name}.`,
        });
      } else if (offerRatio >= counterThreshold) {
        const counterMultiplier = COUNTER_MULTIPLIERS[personality];
        const counterAmount = Math.round(valuation * counterMultiplier);

        updatedOffers.push({ ...offer, status: "countered", counterAmount });

        newLogs.push({
          day: newDay,
          text:
            attachment.tier === "untouchable" || attachment.tier === "protected"
              ? `${stable.name} regards ${horse.name} as ${attachment.label.toLowerCase()} and countered with $${counterAmount.toLocaleString()}.`
              : `${stable.name} countered your offer for ${horse.name} with $${counterAmount.toLocaleString()}.`,
        });
      } else {
        updatedOffers.push({ ...offer, status: "declined" });

        newLogs.push({
          day: newDay,
          text:
            attachment.tier === "untouchable"
              ? `${stable.name} will not part with ${horse.name} at anything close to that — offer declined.`
              : `${stable.name} declined your offer for ${horse.name}.`,
        });
      }
    }

    return {
      ...context,
      state: {
        ...state,
        privateSaleOffers: updatedOffers,
        npcAIManager: updatedNpcAIManager,
      },
      logs: newLogs,
      impacts: newImpacts,
    };
  },
};
