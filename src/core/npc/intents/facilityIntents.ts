import type {
  ConsignmentIntent,
  TransportIntent,
  FacilityUpgradeIntent,
  OutpostActionIntent,
} from "@/core/resolver/intents";
import type { GameState, Horse, Stable, AuctionSale } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { calculateOverallRating } from "@/core/horse/stats";
import { createAuctionAIState, shouldConsignHorse } from "@/core/ai/auctionAI";
import {
  FACILITY_UPGRADE_COSTS,
  type FacilityType,
  type FacilityLevel,
  type PlayerFacilities,
} from "@/core/facilities";
import type { OutpostRegion } from "@/core/facilities/outpostTypes";
import type { StableAIState, DifficultyState } from "@/core/ai/npcCycleAI";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import {
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  CONSIGNMENT_INTENT_PRIORITY,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";

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

  const activeSales = auctions.filter((s) => !s.resolved);
  if (activeSales.length === 0) return intents;

  for (const sale of activeSales) {
    for (const horse of ownedHorses) {
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
        const reservePrice = Math.floor(
          calculateOverallRating(horse) * HORSE_RATING_TO_VALUE_MULTIPLIER,
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
  let transportCount = 0;

  for (const horse of ownedHorses) {
    if (transportCount >= MAX_TRANSPORTS_PER_DAY) break;
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
      transportCount++;
    }
  }

  return intents;
}

export function generateNpcFacilityUpgradeIntents(
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  npcFacilities?: Record<string, PlayerFacilities>,
): FacilityUpgradeIntent[] {
  const intents: FacilityUpgradeIntent[] = [];

  const facilitiesBudget = stableAI?.budgetAllocation?.facilities;
  if (facilitiesBudget === undefined || facilitiesBudget <= 0) return intents;

  const stableFacilities = npcFacilities?.[stable.id];
  if (!stableFacilities) return intents;

  const LEVEL_ORDER: FacilityLevel[] = ["basic", "standard", "premium", "elite"];
  const PRIORITY_FACILITIES: FacilityType[] = ["main_track", "barn", "veterinary_clinic"];

  let bestCandidate: { type: FacilityType; level: FacilityLevel; cost: number } | null = null;

  for (const facilityType of PRIORITY_FACILITIES) {
    const facility = stableFacilities[facilityType];
    if (!facility) continue;
    const upgradeCost = FACILITY_UPGRADE_COSTS[facility.level];
    if (upgradeCost === null) continue;
    if (upgradeCost > facilitiesBudget) continue;

    if (
      !bestCandidate ||
      LEVEL_ORDER.indexOf(facility.level) < LEVEL_ORDER.indexOf(bestCandidate.level)
    ) {
      bestCandidate = { type: facilityType, level: facility.level, cost: upgradeCost };
    }
  }

  if (bestCandidate) {
    const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(bestCandidate.level) + 1];
    intents.push({
      id: generateUUID(),
      entityId: stable.id,
      source: "npc",
      sourceId: stable.id,
      day,
      priority: 15,
      type: "facility_upgrade",
      facilityId: bestCandidate.type,
      nextLevel,
      cost: bestCandidate.cost,
    });
  }

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
    stable.cash < OUTPOST_COST &&
    (facilitiesBudget === undefined || facilitiesBudget < OUTPOST_COST)
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
