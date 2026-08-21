import type {
  AnyIntent,
  GeldingIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  UpdateStudFeeIntent,
} from "@/core/resolver/intents";
import type { GameState, Horse, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { createGeldingAIState, shouldGeldHorse } from "@/core/ai/geldingAI";
import {
  shouldCreateSyndicate,
  calculateSharePurchase,
  calculateShareSale,
  calculateSharePrice,
} from "@/core/ai/syndicationAI";
import type { StableAIState } from "@/core/ai/npcCycleAI";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import {
  STUD_FEE_REDUCTION_MULTIPLIER,
  STUD_FEE_MINIMUM,
  STUD_FEE_INTENT_PRIORITY,
  PRESTIGE_STUD_FEE_RESISTANCE,
  TRADER_STUD_FEE_AGGRESSION,
} from "@/constants/financialDistressConstants";

export function generateNpcGeldingIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  breedingWeight = 1.0,
): GeldingIntent[] {
  const intents: GeldingIntent[] = [];

  const geldingAI =
    stableAI?.geldingAI ||
    (stableAI ? (stableAI.geldingAI = createGeldingAIState(stable)) : createGeldingAIState(stable));

  const breedingBudget = stableAI?.budgetAllocation?.breeding;
  const geldingCost = 2000;
  let cumulativeBreedingSpend = 0;

  for (const horse of ownedHorses) {
    if (shouldGeldHorse(geldingAI, horse, day, breedingWeight)) {
      if (breedingBudget !== undefined && breedingBudget <= 0 && cumulativeBreedingSpend > 0) {
        continue;
      }
      cumulativeBreedingSpend += geldingCost;

      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 50,
        type: "gelding",
        horseId: horse.id,
      });
    }
  }

  return intents;
}

export function generateNpcSyndicateIntents(
  state: GameState,
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
  distressLevel: DistressLevel = "healthy",
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  const syndicates = state.syndicates || {};

  if (distressLevel === "healthy") {
    const stableHash = stable.id
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    if ((day + stableHash) % 7 !== 0) return intents;
  }

  for (const horse of ownedHorses) {
    if (shouldCreateSyndicate(stable, horse, syndicates)) {
      const totalShares = 40;
      const sharePrice = Math.max(
        1000,
        Math.round(
          calculateSharePrice(
            {
              id: `syndicate_${horse.id}`,
              stallionId: horse.id,
              stallionName: horse.name,
              totalShares,
              shareHolders: {},
              sharePrice: 0,
              studFee: horse.stud?.standingFee || 0,
              isPublic: true,
              lifetimeEarnings: 0,
            },
            horse,
          ),
        ),
      );
      const intent: SyndicateCreationIntent = {
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        day,
        priority: 40,
        type: "syndicate_creation",
        stallionId: horse.id,
        totalShares,
        sharePrice,
        initialShareholders: { [stable.id]: Math.floor(totalShares * 0.6) },
      };
      intents.push(intent);
    }
  }

  for (const syndicate of Object.values(syndicates)) {
    const stallion = state.horses[syndicate.stallionId];
    if (!stallion) continue;

    const sellCount = calculateShareSale(stable, syndicate, stallion, distressLevel);
    if (sellCount > 0) {
      const price = calculateSharePrice(syndicate, stallion);
      const saleIntent: ShareSaleIntent = {
        id: generateUUID(),
        entityId: syndicate.id,
        source: "npc",
        day,
        priority: 40,
        type: "share_sale",
        syndicateId: syndicate.id,
        sellerStableId: stable.id,
        shares: sellCount,
        pricePerShare: price,
      };
      intents.push(saleIntent);
      continue;
    }

    if (stallion.ownership?.type === "npc" && stallion.ownership.stableId === stable.id) continue;
    const buyCount = calculateSharePurchase(stable, syndicate, stallion);
    if (buyCount > 0) {
      const price = calculateSharePrice(syndicate, stallion);
      const purchaseIntent: SharePurchaseIntent = {
        id: generateUUID(),
        entityId: syndicate.id,
        source: "npc",
        day,
        priority: 40,
        type: "share_purchase",
        syndicateId: syndicate.id,
        buyerStableId: stable.id,
        shares: buyCount,
        pricePerShare: price,
      };
      intents.push(purchaseIntent);
    }
  }

  return intents;
}

export function generateNpcStudFeeIntents(
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
  distressLevel: DistressLevel,
): UpdateStudFeeIntent[] {
  const intents: UpdateStudFeeIntent[] = [];

  let reductionMultiplier: number;
  switch (distressLevel) {
    case "caution":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.caution;
      break;
    case "emergency":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.emergency;
      break;
    case "critical":
      reductionMultiplier = STUD_FEE_REDUCTION_MULTIPLIER.critical;
      break;
    default:
      return intents;
  }

  const personality = stable.personality;
  if (personality === "prestige") {
    reductionMultiplier = 1 - (1 - reductionMultiplier) * PRESTIGE_STUD_FEE_RESISTANCE;
  } else if (personality === "trader") {
    reductionMultiplier = 1 - (1 - reductionMultiplier) * TRADER_STUD_FEE_AGGRESSION;
  }

  for (const horse of ownedHorses) {
    if (!horse.stud || !horse.stud.atStud) continue;
    if (horse.ownership?.type !== "npc" || horse.ownership.stableId !== stable.id) continue;

    const currentFee = horse.stud.standingFee;
    if (currentFee <= 0) continue;

    const minFee = STUD_FEE_MINIMUM[distressLevel];
    const newFee = Math.max(minFee, Math.floor(currentFee * reductionMultiplier));

    if (newFee < currentFee) {
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: STUD_FEE_INTENT_PRIORITY,
        type: "update_stud_fee",
        horseId: horse.id,
        newFee,
      });
    }
  }

  return intents;
}
