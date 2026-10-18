/**
 * Cross-System Loop Tests
 *
 * Tests that verify cross-system integration loops are wired:
 * - Economy trend → auction price adjustment
 * - Diplomacy alliance → race entry avoidance
 * - Facility upgrade → training type unlock
 * - Staff → training effectiveness
 */

import { describe, it, expect } from "vitest";
import {
  createEconomicState,
  calculateYearlingPriceAdjustment,
} from "@/domains/agents/simulation/economyAIState";
import {
  calculateAuctionReservePrice,
  calculateDynamicStudFee,
} from "@/domains/agents/simulation/economyAICartel";
import type { EconomicTrend } from "@/domains/agents/simulation/strategicCoordinator";
import { generateNpcRaceEntryIntents } from "@/domains/agents/simulation/npc/intents/raceEntryIntents";
import {
  calculateStrategicEntryScore,
  type RaceCompetitorIndex,
} from "@/domains/agents/simulation/raceEntryAIScoring";
import { createRaceEntryAIState } from "@/domains/agents/simulation/raceEntryAITypes";
import { createStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import {
  createDefaultPlayerFacilities,
  createFacility,
  getAvailableTrainingTypes,
} from "@/core/facilities/facilityDefaults";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { createRng } from "@/core/common/rng";
import { createDefaultGameState } from "@/game/store/state";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { h2r } from "@/tests/helpers/sampleGameState";
import { asRaceId, asStaffId } from "@/core/types/branded";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { TrainingIntent } from "@/core/resolver/intents";

describe("Cross-System: Economy → Auction Pricing", () => {
  it("calculateAuctionReservePrice adjusts with yearlingPriceIndex", () => {
    const baseReserve = 50000;
    const neutralTrend = createEconomicState();
    const neutralPrice = calculateAuctionReservePrice(neutralTrend, baseReserve);

    const bullTrend: EconomicTrend = {
      studFeeTrend: 0.1,
      yearlingPriceIndex: 130,
      claimingMarketActivity: 0,
    };
    const bullPrice = calculateAuctionReservePrice(bullTrend, baseReserve);

    const bearTrend: EconomicTrend = {
      studFeeTrend: -0.1,
      yearlingPriceIndex: 70,
      claimingMarketActivity: 0,
    };
    const bearPrice = calculateAuctionReservePrice(bearTrend, baseReserve);

    expect(bullPrice).toBeGreaterThan(neutralPrice);
    expect(bearPrice).toBeLessThan(neutralPrice);
  });

  it("calculateYearlingPriceAdjustment scales with index", () => {
    const basePrice = 10000;
    const neutralTrend = createEconomicState();
    const neutralAdj = calculateYearlingPriceAdjustment(neutralTrend, basePrice);

    const bullTrend: EconomicTrend = {
      studFeeTrend: 0.05,
      yearlingPriceIndex: 120,
      claimingMarketActivity: 0,
    };
    const bullAdj = calculateYearlingPriceAdjustment(bullTrend, basePrice);

    expect(bullAdj).toBeGreaterThan(neutralAdj);
  });

  it("calculateDynamicStudFee adjusts with trend and progeny performance", () => {
    const baseFee = 5000;
    const neutralTrend = createEconomicState();
    const neutralFee = calculateDynamicStudFee(neutralTrend, baseFee, 0.5, false);

    const bullTrend: EconomicTrend = {
      studFeeTrend: 0.15,
      yearlingPriceIndex: 120,
      claimingMarketActivity: 0,
    };
    const bullFee = calculateDynamicStudFee(bullTrend, baseFee, 0.8, false);

    expect(bullFee).toBeGreaterThan(neutralFee);
  });
});

describe("Cross-System: Diplomacy → Race Entry Avoidance", () => {
  it("a racing coalition suppresses an entry that the same stable would otherwise make", () => {
    const stable = createTestStable({ id: "stable-1", personality: "aggressive" });
    const ally = createTestStable({ id: "stable-2", personality: "aggressive" });
    const ownHorse = createTestHorse({
      id: "own-horse",
      ownership: { type: "npc", stableId: stable.id },
      stats: {
        speed: 85,
        stamina: 85,
        acceleration: 85,
        consistency: 85,
        temperament: 70,
        conformation: 70,
      },
      energy: 100,
    });
    const allyHorse = createTestHorse({
      id: "ally-horse",
      ownership: { type: "npc", stableId: ally.id },
      energy: 100,
    });
    const race: Race = {
      id: asRaceId("coalition-race"),
      name: "Coalition Check Stakes",
      day: 10,
      distance: 1600,
      raceClass: "Allowance",
      entryFee: 1000,
      purse: 50000,
      fieldSize: 10,
      entries: [{ horseId: allyHorse.id, ownership: allyHorse.ownership }],
      resolved: false,
      surface: "Turf",
      handedness: "balanced",
      trackCondition: "fast",
    };
    const state: GameState = {
      ...createDefaultGameState(),
      day: 10,
      horses: h2r([ownHorse, allyHorse]),
      npcStables: [stable, ally],
      jockeys: [createTestJockey({ stableId: stable.id })],
    };
    const horseMap = new Map(Object.values(state.horses).map((horse) => [horse.id, horse]));
    const score = calculateStrategicEntryScore(
      createRaceEntryAIState(stable),
      ownHorse,
      race,
      stable,
      10,
      horseMap,
    );
    expect(score).toBeGreaterThan(0);
    const calibratedWeight = 65 / score;

    const neutral = generateNpcRaceEntryIntents(
      state,
      stable,
      undefined,
      10,
      [ownHorse],
      [race],
      new Map(),
      horseMap,
      calibratedWeight,
      "healthy",
      undefined,
      new Map<string, RaceCompetitorIndex>(),
    );
    expect(neutral).toHaveLength(1);

    const alliedAI = {
      ...createStableAIState(stable, 10),
      raceEntryAI: createRaceEntryAIState(stable),
      npcRelationships: {
        [ally.id]: {
          trust: 80,
          allianceType: "racing_coalition" as const,
          history: [],
        },
      },
    };
    const allied = generateNpcRaceEntryIntents(
      state,
      stable,
      alliedAI,
      10,
      [ownHorse],
      [race],
      new Map(),
      horseMap,
      calibratedWeight,
      "healthy",
      undefined,
      new Map<string, RaceCompetitorIndex>(),
    );
    expect(allied).toEqual([]);
  });
});

describe("Cross-System: Facility → Training Type Unlock", () => {
  it("upgrading the exercise pool makes swimming available through the shared selector", () => {
    const facilities = createDefaultPlayerFacilities(1);
    expect(getAvailableTrainingTypes(facilities)).not.toContain("swimming");

    facilities.exercise_pool = createFacility("exercise_pool", "standard", 10);

    expect(getAvailableTrainingTypes(facilities)).toContain("swimming");
  });
});

describe("Cross-System: Staff → Training Effectiveness", () => {
  function contextFor(state: GameState, intents: TrainingIntent[]): PipelineContext {
    return {
      previousDay: 9,
      newDay: 10,
      state,
      logs: [],
      dailyRng: createRng(12345),
      intents,
      impacts: [],
      impactLog: [],
      horseMap: new Map(Object.values(state.horses).map((horse) => [horse.id, horse])),
      raceMap: new Map(Object.values(state.races).map((race) => [race.id, race])),
      stableMap: new Map((state.npcStables ?? []).map((stable) => [stable.id, stable])),
      jockeyMap: new Map((state.jockeys ?? []).map((jockey) => [jockey.id, jockey])),
    };
  }

  it("a hired nutritionist reduces the energy cost emitted for an NPC workout", () => {
    const stable = createTestStable({ id: "stable-1" });
    const horse = createTestHorse({
      id: "horse-1",
      ownership: { type: "npc", stableId: stable.id },
      energy: 100,
    });
    const intent: TrainingIntent = {
      id: "training-1",
      entityId: horse.id,
      source: "npc",
      sourceId: stable.id,
      day: 10,
      priority: 50,
      type: "training",
      horseId: horse.id,
      trainingType: "speed",
    };
    const baseState: GameState = {
      ...createDefaultGameState(),
      day: 10,
      horses: h2r([horse]),
      npcStables: [stable],
      hiredStaff: [],
    };
    const staffedState: GameState = {
      ...baseState,
      hiredStaff: [
        {
          id: asStaffId("nutritionist-1"),
          name: "Nutritionist",
          role: "nutritionist",
          tier: "elite",
          salary: 1000,
          bonusValue: 0.25,
          traits: [],
          fame: 50,
          stableId: stable.id,
        } satisfies StaffMember,
      ],
    };

    const base = trainingResolutionPhase.execute(contextFor(baseState, [intent]));
    const staffed = trainingResolutionPhase.execute(contextFor(staffedState, [intent]));
    const baseEnergy = base.impacts.find((impact) => impact.type === "energy_change");
    const staffedEnergy = staffed.impacts.find((impact) => impact.type === "energy_change");

    expect(baseEnergy?.type).toBe("energy_change");
    expect(staffedEnergy?.type).toBe("energy_change");
    if (baseEnergy?.type === "energy_change" && staffedEnergy?.type === "energy_change") {
      expect(staffedEnergy.delta).toBeGreaterThan(baseEnergy.delta);
      expect(staffedEnergy.delta).toBeCloseTo(baseEnergy.delta * 0.75);
    }
  });
});
