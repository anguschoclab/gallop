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
import { getCashPressureTuning } from "@/core/stable/cashPressureTuning";
import { recordCashPressureDecision } from "@/core/stable/cashPressureLog";
import {
  computePrivateSaleDecision,
  buildPrivateSaleDecisionTrace,
  formatPrivateSaleDecisionTrace,
} from "@/core/horse/privateSaleDecision";
import type { PrivateSaleOffer } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type { HorseTransferImpact, CashImpact } from "@/core/resolver/impacts";
import { CASH_PRESSURE_SHORT_OF_CASH_LOG_THRESHOLD } from "@/constants/privateSaleConstants";

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
          const friction = updatedNpcAIManager?.stableStates?.[stableId]?.friction ?? 0;
          const reputationScore = state.reputation?.score ?? 0;
          const { odds, successCost, failurePenalty } = computeDiplomaticPressure(
            attachment,
            attachmentAdjustedAsk(
              horse,
              stable,
              calculateLotValuation(horse, stable, "racing_age", allHorsesArray, horseMap),
              state.reputation?.score ?? 0,
            ),
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
              const newFriction = calculateFrictionChange(
                currentFriction,
                DIPLOMATIC_FAILURE_FRICTION_PENALTY,
              );
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
      const marketValue = calculateLotValuation(
        horse,
        stable,
        "racing_age",
        allHorsesArray,
        horseMap,
      );
      const attachment = evaluateHorseAttachment(horse, stable);
      const valuation = attachmentAdjustedAsk(
        horse,
        stable,
        marketValue,
        state.reputation?.score ?? 0,
      );

      const decision = computePrivateSaleDecision({
        stable,
        horse,
        offer,
        valuation,
        attachment,
      });
      const { cashPressure } = decision;

      const traceBase = {
        day: newDay,
        stableId: String(stableId),
        stableName: stable.name,
        personality: stable.personality,
        horseName: horse.name,
        cash: Math.max(0, stable.cash),
        runwayDays: cashPressure.runwayDays,
        pressure: cashPressure.pressure,
        meter: cashPressure.meter,
        pressureLabel: cashPressure.label,
        ask: valuation,
        offerAmount: offer.amount,
        offerRatio: decision.offerRatio,
        baseAcceptThreshold: decision.baseAcceptThreshold,
        acceptThreshold: decision.softenedAcceptThreshold,
        counterThreshold: decision.softenedCounterThreshold,
        shortfallAmount: Math.max(
          0,
          Math.round(valuation * decision.softenedAcceptThreshold - offer.amount),
        ),
        shortfallPercent: Math.max(
          0,
          (decision.softenedAcceptThreshold - decision.offerRatio) * 100,
        ),
      };

      if (getCashPressureTuning().enableDecisionTrace) {
        newLogs.push({
          day: newDay,
          text: formatPrivateSaleDecisionTrace(
            buildPrivateSaleDecisionTrace({ stable, horse, offer, valuation, attachment }),
          ),
        });
      }

      if (decision.decision === "accepted") {
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
          text:
            cashPressure.pressure >= CASH_PRESSURE_SHORT_OF_CASH_LOG_THRESHOLD
              ? `${stable.name}, short of cash, accepted your offer of $${offer.amount.toLocaleString()} for ${horse.name}.`
              : `${stable.name} accepted your offer of $${offer.amount.toLocaleString()} for ${horse.name}.`,
        });

        recordCashPressureDecision({ ...traceBase, outcome: "accepted" });
      } else if (decision.decision === "countered") {
        const counterAmount = decision.counterAmount!;

        updatedOffers.push({ ...offer, status: "countered", counterAmount });

        newLogs.push({
          day: newDay,
          text:
            attachment.tier === "untouchable" || attachment.tier === "protected"
              ? `${stable.name} regards ${horse.name} as ${attachment.label.toLowerCase()} and countered with $${counterAmount.toLocaleString()}.`
              : `${stable.name} countered your offer for ${horse.name} with $${counterAmount.toLocaleString()}.`,
        });

        recordCashPressureDecision({ ...traceBase, outcome: "countered", counterAmount });
      } else {
        updatedOffers.push({ ...offer, status: "declined" });

        newLogs.push({
          day: newDay,
          text:
            attachment.tier === "untouchable"
              ? `${stable.name} will not part with ${horse.name} at anything close to that — offer declined.`
              : `${stable.name} declined your offer for ${horse.name}.`,
        });

        recordCashPressureDecision({ ...traceBase, outcome: "declined" });
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
