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
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import type { PrivateSaleOffer, Horse, Stable, StablePersonality } from "@/game/types";
import { generateUUID } from "@/core/uuid";

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

    const horseMap = new Map(state.horses.map((h) => [h.id, h]));
    const stableMap = new Map(state.npcStables.map((s) => [s.id, s]));

    const newLogs = [...logs];
    const newImpacts = [...impacts];
    const updatedOffers: PrivateSaleOffer[] = [];

    for (const offer of offers) {
      if (offer.status !== "pending") {
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

      if (horse.stableId !== stableId) {
        newLogs.push({
          day: newDay,
          text: `${horse.name} is no longer at ${stable.name} — offer declined.`,
        });
        updatedOffers.push({ ...offer, status: "declined" });
        continue;
      }

      const valuation = calculateNpcHorseValue(horse, stable.tier);
      const offerRatio = offer.amount / valuation;
      const personality = stable.personality;
      const acceptThreshold = ACCEPT_THRESHOLDS[personality];
      const counterThreshold = COUNTER_THRESHOLDS[personality];

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
        } as any);

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
        } as any);

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
        } as any);

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
          text: `${stable.name} countered your offer for ${horse.name} with $${counterAmount.toLocaleString()}.`,
        });
      } else {
        updatedOffers.push({ ...offer, status: "declined" });

        newLogs.push({
          day: newDay,
          text: `${stable.name} declined your offer for ${horse.name}.`,
        });
      }
    }

    return {
      ...context,
      state: {
        ...state,
        privateSaleOffers: updatedOffers,
      },
      logs: newLogs,
      impacts: newImpacts,
    };
  },
};
