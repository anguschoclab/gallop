import type {
  ConsignmentIntent,
  TransportIntent,
  FacilityUpgradeIntent,
  OutpostActionIntent,
} from "@/platform/resolver/intents";
import type { GameState, Horse, Stable, AuctionSale } from "@/platform/game/types";
import { generateUUID } from "@/shared/uuid/uuid";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import { npcBaseValuation } from "@/domains/auction/simulation/auctionValuation";

/** Rival stables set their reserve a little under the auction-house value. */
const NPC_RESERVE_SHARE = 0.8;
import { createAuctionAIState, shouldConsignHorse } from "@/domains/agents/simulation/auctionAI";
import {
  FACILITY_UPGRADE_COSTS,
  type FacilityLevel,
  type PlayerFacilities,
} from "@/domains/facilities/simulation";
import {
  selectFacilityToUpgrade,
  shouldUpgradeFacility,
} from "@/domains/agents/simulation/facilityAI";
import { createFacilityAIState } from "@/domains/agents/simulation/facilityAITypes";
import type { OutpostRegion } from "@/domains/facilities/model/outpostTypes";
import type { StableAIState, DifficultyState } from "@/domains/agents/simulation/npcCycleAI";
import type { DistressLevel } from "@/domains/agents/simulation/financialDistressAI";
import {
  CONSIGNMENT_INTENT_PRIORITY,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/domains/agents/model/aiConstants";

export function generateNpcAuctionIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  auctions: AuctionSale[],
  auctionWeight = DEFAULT_SUBSYSTEM_WEIGHT,
  distressLevel: DistressLevel = "healthy",
  difficultyModulator?: DifficultyState,
): ConsignmentIntent[] {
  const intents: ConsignmentIntent[] = [];

  if (auctions.length === 0 || auctionWeight <= 0) return intents;

  if (distressLevel === "healthy") {
    const stableHash = stable.id
      .split("")
      .reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
    if ((day + stableHash) % 7 !== 0) return intents;
  }

  const auctionAI = stableAI?.auctionAI ?? createAuctionAIState(stable);

  const auctionBudget = stableAI?.budgetAllocation?.auctions;
  let cumulativeAuctionSpend = 0;

  // Liquidation sales belong to the bankrupt stable; others don't consign into them.
  const activeSales = auctions.filter((s) => !s.resolved && s.kind !== "liquidation");
  if (activeSales.length === 0) return intents;
  const consigned = new Set<string>();

  for (const sale of activeSales) {
    for (const horse of ownedHorses) {
      if (consigned.has(horse.id) || horse.consignedSaleId) continue;
      const result = shouldConsignHorse(
        auctionAI,
        horse,
        stable,
        day,
        difficultyModulator
          ? auctionWeight * difficultyModulator.npcCompetenceMultiplier
          : auctionWeight,
        distressLevel,
      );
      if (result.shouldConsign) {
        // Reserve from the same auction-house value rival bidders use.
        const reservePrice = Math.floor(
          npcBaseValuation(ensurePhenotypeResolved(horse), stable) * NPC_RESERVE_SHARE,
        );

        if (auctionBudget !== undefined && auctionBudget <= 0 && cumulativeAuctionSpend > 0) {
          continue;
        }
        cumulativeAuctionSpend += reservePrice;

        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: CONSIGNMENT_INTENT_PRIORITY,
          type: "consignment",
          horseId: horse.id,
          saleId: sale.id,
          reservePrice,
        });
        consigned.add(horse.id);
      }
    }
  }

  return intents;
}

export function generateNpcTransportIntents(
  stable: Stable,
  day: number,
  ownedHorses: Horse[],
): TransportIntent[] {
  const intents: TransportIntent[] = [];
  if (!stable.outposts || stable.outposts.length < 2) return intents;

  const TRANSPORT_COST = 5000;
  const MAX_TRANSPORTS_PER_DAY = 2;
  if (stable.cash < TRANSPORT_COST) return intents;
  let transportSpend = 0;

  for (const horse of ownedHorses) {
    if (intents.length >= MAX_TRANSPORTS_PER_DAY || transportSpend + TRANSPORT_COST > stable.cash) {
      break;
    }
    if (horse.ownership?.type !== "npc" || horse.ownership.stableId !== stable.id) continue;
    if (horse.age < 2) continue;

    const currentOutpost = stable.outposts.find((o) =>
      Object.keys(o.acclimatizationDays ?? {}).includes(horse.id),
    );
    if (!currentOutpost) continue;

    const acclimRemaining = currentOutpost.acclimatizationDays?.[horse.id] ?? 0;
    if (acclimRemaining > 0) continue;

    const turfApt = horse.surfaceAptitude?.Turf ?? 0;
    const dirtApt = horse.surfaceAptitude?.Dirt ?? 0;
    const horseSurface = turfApt > dirtApt ? "Turf" : "Dirt";
    const candidateOutposts = stable.outposts.filter((o) => o.id !== currentOutpost.id);

    const bestOutpost = candidateOutposts.find((o) => {
      const mainTrack = Object.values(o.facilities ?? {}).find((f) => f.type === "main_track");
      return mainTrack?.branch === (horseSurface === "Turf" ? "turf" : "dirt");
    });

    if (bestOutpost) {
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 20,
        type: "transport",
        transportId: `${currentOutpost.id}->${bestOutpost.id}`,
        cost: TRANSPORT_COST,
      });
      transportSpend += TRANSPORT_COST;
    }
  }

  return intents;
}

export function generateNpcFacilityUpgradeIntents(
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  npcFacilities?: Record<string, PlayerFacilities>,
  facilityWeight = DEFAULT_SUBSYSTEM_WEIGHT,
): FacilityUpgradeIntent[] {
  const intents: FacilityUpgradeIntent[] = [];

  if (facilityWeight <= 0) return intents;

  const facilitiesBudget = stableAI?.budgetAllocation?.facilities;
  if (facilitiesBudget === undefined || facilitiesBudget <= 0) return intents;

  const stableFacilities = npcFacilities?.[stable.id];
  if (!stableFacilities) return intents;

  const facilityAI = stableAI?.facilityAI ?? createFacilityAIState(stable);
  const facilityType = selectFacilityToUpgrade(facilityAI, stableFacilities, stable, day);
  if (!facilityType) return intents;

  const facility = stableFacilities[facilityType];
  if (!facility) return intents;

  const upgradeCost = FACILITY_UPGRADE_COSTS[facility.level];
  if (upgradeCost === null || upgradeCost > facilitiesBudget) return intents;
  if (
    !shouldUpgradeFacility(facilityAI, facilityType, facility.level, stable, day, facilityWeight)
  ) {
    return intents;
  }

  const LEVEL_ORDER: FacilityLevel[] = ["basic", "standard", "premium", "elite"];
  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(facility.level) + 1];
  if (!nextLevel) return intents;

  intents.push({
    id: generateUUID(),
    entityId: stable.id,
    source: "npc",
    sourceId: stable.id,
    day,
    priority: 15,
    type: "facility_upgrade",
    facilityId: facilityType,
    nextLevel,
    cost: upgradeCost,
  });

  return intents;
}

export function generateNpcOutpostIntents(
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
): OutpostActionIntent[] {
  const intents: OutpostActionIntent[] = [];

  const facilitiesBudget = stableAI?.budgetAllocation?.facilities;
  const OUTPOST_COST = 50000;
  const MAX_OUTPOSTS = 2;

  const currentOutposts = stable.outposts ?? [];
  if (currentOutposts.length >= MAX_OUTPOSTS) return intents;

  if (
    stable.cash < OUTPOST_COST ||
    (facilitiesBudget !== undefined && facilitiesBudget < OUTPOST_COST)
  ) {
    return intents;
  }

  const stableHash = stable.id.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
  if ((day + stableHash) % 14 !== 0) return intents;

  const distressLevel = stableAI?.financialDistress?.level ?? "healthy";
  if (distressLevel !== "healthy") return intents;

  const existingRegions = new Set(currentOutposts.map((o) => o.region));
  const ALL_REGIONS: OutpostRegion[] = [
    "North America (East)",
    "North America (West)",
    "Europe (UK)",
    "Europe (France)",
    "Asia (Japan)",
    "Asia (Hong Kong)",
    "Australia",
    "South America",
  ];
  const availableRegions = ALL_REGIONS.filter((r) => !existingRegions.has(r));
  if (availableRegions.length === 0) return intents;

  const regionIndex = stableHash % availableRegions.length;
  const chosenRegion = availableRegions[regionIndex];
  const outpostName = `${stable.name} ${chosenRegion.split(" ")[0]} Outpost`;

  intents.push({
    id: generateUUID(),
    entityId: stable.id,
    source: "npc",
    sourceId: stable.id,
    day,
    priority: 10,
    type: "outpost_action",
    stableId: stable.id,
    action: "create",
    outpostId: generateUUID(),
    region: chosenRegion,
    name: outpostName,
    cost: OUTPOST_COST,
  });

  return intents;
}
