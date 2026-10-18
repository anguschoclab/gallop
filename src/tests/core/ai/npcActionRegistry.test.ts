import { describe, expect, it } from "vitest";
import { createRng, hashStr } from "@/core/common/rng";
import { withUuidStream } from "@/core/uuid";
import { createStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import {
  generateNpcActions,
  NPC_ACTION_REGISTRY,
  type NpcActionContext,
} from "@/domains/agents/simulation/npcActionRegistry";
import type { AnyIntent } from "@/core/resolver/intents";
import type { AuctionSale, GameState, Race } from "@/game/types";
import { createInitialState } from "@/game/store/initialization";
import { createDefaultPlayerFacilities } from "@/core/facilities";
import { asJockeyId, asOutpostId, asRaceId } from "@/core/types/branded";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import type { NpcActionId } from "@/domains/agents/simulation/npcActionRegistry";

const BASE_STATE = createInitialState();

function gameStateFor(overrides: Partial<GameState>): GameState {
  const state = structuredClone(BASE_STATE);
  Object.assign(state, overrides);
  return state;
}

function createContext(overrides: Partial<NpcActionContext> = {}): NpcActionContext {
  const stable = createTestStable({ id: "stable-1" });
  const state = gameStateFor({ day: 10, npcStables: [stable] });
  return {
    state,
    stable,
    stableAI: createStableAIState(stable, 10),
    day: 10,
    ownedHorses: [],
    relevantRaces: [],
    activePregnanciesByDam: new Set<string>(),
    raceEntrySets: new Map(),
    raceCompetitorIndex: new Map(),
    horseMap: new Map(),
    aiManager: state.npcAIManager,
    ...overrides,
  };
}

function weightsFor(overrides: Partial<NonNullable<NpcActionContext["weights"]>> = {}) {
  return {
    raceEntry: 1,
    training: 1,
    auction: 1,
    claiming: 1,
    breeding: 1,
    facility: 1,
    market: 1,
    upkeep: 1,
    ...overrides,
  };
}

function stableHash(id: string): number {
  return id.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
}

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: asRaceId("scenario-race"),
    name: "Scenario Race",
    day: 10,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  };
}

function budgetAllocation(
  overrides: Partial<
    Record<"training" | "facilities" | "auctions" | "claiming" | "breeding", number>
  > = {},
) {
  return {
    total: 200000,
    training: 50000,
    facilities: 50000,
    auctions: 50000,
    claiming: 50000,
    breeding: 50000,
    ...overrides,
  };
}

function scenarioForAction(actionId: NpcActionId): NpcActionContext {
  switch (actionId) {
    case "training": {
      const stable = createTestStable({ id: "act-training", cash: 200000 });
      const horse = createTestHorse({
        id: "act-training-horse",
        ownership: { type: "npc", stableId: stable.id },
        energy: 100,
      });
      return createContext({
        state: gameStateFor({ day: 10, npcStables: [stable], horses: { [horse.id]: horse } }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
      });
    }
    case "race_entry": {
      const stable = createTestStable({ id: "act-entry", cash: 200000 });
      const horse = createTestHorse({
        id: "act-entry-horse",
        ownership: { type: "npc", stableId: stable.id },
      });
      const jockey = createTestJockey({ id: asJockeyId("act-entry-jockey"), stableId: stable.id });
      const race = makeRace({ id: asRaceId("act-entry-race") });
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          horses: { [horse.id]: horse },
          races: { [race.id]: race },
          jockeys: [jockey],
        }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
        relevantRaces: [race],
        horseMap: new Map([[horse.id, horse]]),
        weights: weightsFor({ raceEntry: 3 }),
      });
    }
    case "claiming": {
      const stable = createTestStable({ id: "act-claimer", cash: 200000 });
      const target = createTestHorse({
        id: "act-claim-target",
        ownership: { type: "player" },
        form: 80,
        stats: {
          speed: 30,
          stamina: 30,
          acceleration: 30,
          consistency: 30,
          temperament: 50,
          conformation: 50,
        },
      });
      const race = makeRace({
        id: asRaceId("act-claim-race"),
        raceClass: "Claiming",
        claimingPrice: 25000,
        entries: [{ horseId: target.id, ownership: target.ownership }],
      });
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          horses: { [target.id]: target },
          races: { [race.id]: race },
        }),
        stable,
        stableAI: {
          ...createStableAIState(stable, 10),
          budgetAllocation: budgetAllocation({ claiming: 100000 }),
        },
        relevantRaces: [race],
        horseMap: new Map([[target.id, target]]),
        weights: weightsFor({ claiming: 2 }),
      });
    }
    case "withdrawal": {
      const stable = createTestStable({ id: "act-withdraw", cash: 200000 });
      const horse = createTestHorse({
        id: "act-withdraw-horse",
        ownership: { type: "npc", stableId: stable.id },
        mudAptitude: 0,
      });
      const race = makeRace({
        id: asRaceId("act-withdraw-race"),
        trackCondition: "heavy",
        entries: [{ horseId: horse.id, ownership: horse.ownership }],
      });
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          horses: { [horse.id]: horse },
          races: { [race.id]: race },
        }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
        relevantRaces: [race],
        horseMap: new Map([[horse.id, horse]]),
      });
    }
    case "breeding": {
      const stable = createTestStable({ id: "act-breeding", cash: 200000 });
      const horse = createTestHorse({
        id: "act-stud",
        age: 6,
        gender: "horse",
        ownership: { type: "npc", stableId: stable.id },
        stud: {
          atStud: true,
          standingFee: 10000,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          bookSize: 0,
          seasonBookings: 0,
          lifetimeFoals: 0,
        },
      });
      return createContext({
        state: gameStateFor({ day: 10, npcStables: [stable], horses: { [horse.id]: horse } }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
        distressLevel: "caution",
      });
    }
    case "diplomacy": {
      const stable = createTestStable({ id: "act-diplomat", cash: 200000 });
      const day = 7 - (stableHash(stable.id) % 7);
      return createContext({
        state: gameStateFor({ day, npcStables: [stable] }),
        stable,
        stableAI: {
          ...createStableAIState(stable, day),
          npcRelationships: {
            "act-rival": { trust: 80, allianceType: null, history: [] },
          },
        },
        day,
      });
    }
    case "auction_consignment": {
      const stable = createTestStable({ id: "act-consignor", cash: 200000 });
      const horse = createTestHorse({
        id: "act-consign-horse",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
      });
      const sale: AuctionSale = {
        id: "act-sale",
        name: "Act Sale",
        day: 10,
        kind: "racing_age",
        lots: [],
        resolved: false,
      };
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          horses: { [horse.id]: horse },
          auctions: [sale],
        }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
        distressLevel: "critical",
      });
    }
    case "transport": {
      const stable = createTestStable({
        id: "act-transporter",
        cash: 100000,
        outposts: [
          {
            id: asOutpostId("act-east"),
            name: "East",
            region: "North America (East)",
            totalSlots: 4,
            facilities: {},
            acclimatizationDays: { "act-transport-horse": 0 },
          },
          {
            id: asOutpostId("act-west"),
            name: "West",
            region: "North America (West)",
            totalSlots: 4,
            facilities: {
              0: {
                type: "main_track",
                level: "basic",
                branch: "turf",
                maintenanceCost: 10,
                upgradeCost: 0,
                builtDay: 1,
              },
            },
            acclimatizationDays: {},
          },
        ],
      });
      const ownedHorse = createTestHorse({
        id: "act-transport-horse",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
        surfaceAptitude: { Turf: 80, Dirt: 20, Synthetic: 50 },
      });
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          horses: { [ownedHorse.id]: ownedHorse },
        }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [ownedHorse],
        horseMap: new Map([[ownedHorse.id, ownedHorse]]),
      });
    }
    case "facility_upgrade": {
      const stable = createTestStable({
        id: "act-facility",
        cash: 100000,
        personality: "aggressive",
      });
      return createContext({
        state: gameStateFor({
          day: 10,
          npcStables: [stable],
          npcFacilities: { [stable.id]: createDefaultPlayerFacilities(1) },
        }),
        stable,
        stableAI: {
          ...createStableAIState(stable, 10),
          budgetAllocation: budgetAllocation({ facilities: 50000 }),
        },
        npcFacilities: { [stable.id]: createDefaultPlayerFacilities(1) },
      });
    }
    case "insurance": {
      const stable = createTestStable({
        id: "act-insurer",
        cash: 200000,
        personality: "prestige",
      });
      const horse = createTestHorse({
        id: "act-insured-horse",
        ownership: { type: "npc", stableId: stable.id },
        stats: {
          speed: 80,
          stamina: 70,
          acceleration: 70,
          consistency: 70,
          temperament: 50,
          conformation: 50,
        },
      });
      return createContext({
        state: gameStateFor({ day: 10, npcStables: [stable], horses: { [horse.id]: horse } }),
        stable,
        stableAI: createStableAIState(stable, 10),
        ownedHorses: [horse],
      });
    }
    case "outpost": {
      const stable = createTestStable({ id: "act-expander", cash: 100000, outposts: [] });
      const day = 14 - (stableHash(stable.id) % 14);
      return createContext({
        state: gameStateFor({ day, npcStables: [stable] }),
        stable,
        stableAI: {
          ...createStableAIState(stable, day),
          budgetAllocation: budgetAllocation({ facilities: 100000 }),
        },
        day,
      });
    }
  }
}

describe("NPC action registry", () => {
  it("uses unique, typed action contracts instead of anonymous generator calls", () => {
    const ids = NPC_ACTION_REGISTRY.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const action of NPC_ACTION_REGISTRY) {
      expect(action.capability).toBeTruthy();
      expect(action.intentTypes.length).toBeGreaterThan(0);
      expect(action.parity).toBeTruthy();
      expect(action.cadence).toBeTruthy();
      expect(Number.isInteger(action.cooldownDays)).toBe(true);
      expect(action.preconditions.length).toBeGreaterThan(0);
      expect(action.candidateSources.length).toBeGreaterThan(0);
      expect(action.resourceClaims.length).toBeGreaterThan(0);
      expect(action.expectedEffects.length).toBeGreaterThan(0);
      expect(action.utilityFeatures.length).toBeGreaterThan(0);
      expect(typeof action.generate).toBe("function");
      expect(typeof action.evaluateOutcome).toBe("function");
    }
  });

  it("registers every NPC gameplay domain that emits intents", () => {
    const ids = new Set(NPC_ACTION_REGISTRY.map((action) => action.id));
    expect(ids).toEqual(
      new Set([
        "training",
        "race_entry",
        "claiming",
        "withdrawal",
        "breeding",
        "diplomacy",
        "auction_consignment",
        "transport",
        "facility_upgrade",
        "insurance",
        "outpost",
      ]),
    );
  });

  it("produces bounded plans carrying beliefs, resources, commitments, and outcomes", () => {
    const context = createContext();
    const result = withUuidStream(createRng(hashStr("npc-actions")), () =>
      generateNpcActions(context),
    );
    const traceById = new Map(result.traces.map((trace) => [trace.actionId, trace]));

    expect(result.plans).toHaveLength(NPC_ACTION_REGISTRY.length);
    for (const plan of result.plans) {
      expect(plan.actionId).toBe(traceById.get(plan.actionId)?.actionId);
      expect(plan.goal).toBe(traceById.get(plan.actionId)?.capability);
      expect(plan.beliefs.stableId).toBe("stable-1");
      expect(plan.beliefs.confidence).toBeGreaterThanOrEqual(0);
      expect(plan.beliefs.confidence).toBeLessThanOrEqual(1);
      expect(plan.beliefs.freshnessDays).toBe(0);
      expect(plan.resources.cash).toBe(context.stable.cash);
      expect(plan.resources.estimatedCost).toBe(0);
      expect(plan.resources.estimatedCost).toBeLessThanOrEqual(plan.resources.cash);
      expect(plan.commitments.map((intent) => intent.id)).toEqual(
        traceById.get(plan.actionId)?.intentIds,
      );
      expect(plan.outcome.intentCount).toBe(traceById.get(plan.actionId)?.intentCount);
    }
  });

  it("produces deterministic intents and one bounded trace per registered action", () => {
    const context = createContext();
    const run = () =>
      withUuidStream(createRng(hashStr("npc-actions")), () => generateNpcActions(context));
    const first = run();
    const second = run();

    const intentKey = (intent: AnyIntent) => `${intent.type}:${intent.entityId}:${intent.priority}`;
    expect(first.intents.map(intentKey)).toEqual(second.intents.map(intentKey));
    expect(first.traces).toHaveLength(NPC_ACTION_REGISTRY.length);
    expect(first.traces.every((trace) => trace.stableId === "stable-1")).toBe(true);
    expect(first.traces.every((trace) => trace.day === 10)).toBe(true);
    expect(first.traces.every((trace) => Number.isInteger(trace.intentCount))).toBe(true);
  });

  it("keeps persisted decision traces limited to public-safe summary fields", () => {
    const result = generateNpcActions(createContext());
    const allowedKeys = new Set([
      "stableId",
      "day",
      "actionId",
      "capability",
      "intentTypes",
      "intentIds",
      "intentCount",
      "status",
      "rejectionReason",
      "resourceRejectedCount",
    ]);

    for (const trace of result.traces) {
      expect(Object.keys(trace).every((key) => allowedKeys.has(key))).toBe(true);
      expect(trace).not.toHaveProperty("beliefs");
      expect(trace).not.toHaveProperty("resources");
      expect(trace).not.toHaveProperty("commitments");
      expect(trace).not.toHaveProperty("candidates");
    }
  });

  it("executes claiming in a valid underpriced seeded scenario", () => {
    const claimant = createTestStable({ id: "claimant", cash: 200000 });
    const target = createTestHorse({
      id: "claim-target",
      ownership: { type: "player" },
      form: 80,
      stats: {
        speed: 30,
        stamina: 30,
        acceleration: 30,
        consistency: 30,
        temperament: 50,
        conformation: 50,
      },
    });
    const race = {
      id: asRaceId("claiming-race"),
      name: "Claiming Test",
      day: 10,
      distance: 1600,
      raceClass: "Claiming" as const,
      entryFee: 0,
      purse: 10000,
      fieldSize: 8,
      entries: [{ horseId: target.id, ownership: target.ownership }],
      resolved: false,
      claimingPrice: 25000 as const,
    };
    const state = gameStateFor({
      day: 10,
      horses: { [target.id]: target },
      races: { [race.id]: race },
      npcStables: [claimant],
    });
    const stableAI = {
      ...createStableAIState(claimant, 10),
      budgetAllocation: {
        total: 200000,
        training: 0,
        facilities: 0,
        auctions: 0,
        claiming: 100000,
        breeding: 0,
      },
    };
    const context = createContext({
      state,
      stable: claimant,
      stableAI,
      relevantRaces: [race],
      horseMap: new Map([[target.id, target]]),
      weights: weightsFor({ claiming: 2 }),
    });

    const result = withUuidStream(createRng(hashStr("claim-action")), () =>
      generateNpcActions(context),
    );
    const trace = result.traces.find((entry) => entry.actionId === "claiming");

    expect(result.intents).toEqual([
      expect.objectContaining({
        type: "claiming",
        raceId: race.id,
        horseId: target.id,
        claimantStableId: claimant.id,
      }),
    ]);
    expect(trace?.status).toBe("executed");
  });

  it("reserves cash across action plans and records rejected commitments", () => {
    const stable = createTestStable({
      id: "stable-1",
      cash: 5100,
      outposts: [
        {
          id: asOutpostId("east"),
          name: "East",
          region: "North America (East)",
          totalSlots: 4,
          facilities: {},
          acclimatizationDays: { h1: 0, h2: 0 },
        },
        {
          id: asOutpostId("west"),
          name: "West",
          region: "North America (West)",
          totalSlots: 4,
          facilities: {
            0: {
              type: "main_track",
              level: "basic",
              branch: "turf",
              maintenanceCost: 10,
              upgradeCost: 0,
              builtDay: 1,
            },
          },
          acclimatizationDays: {},
        },
      ],
    });
    const horses = [
      createTestHorse({
        id: "h1",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
        surfaceAptitude: { Turf: 90, Dirt: 10, Synthetic: 50 },
      }),
      createTestHorse({
        id: "h2",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
        surfaceAptitude: { Turf: 90, Dirt: 10, Synthetic: 50 },
      }),
    ];
    const state = gameStateFor({ day: 10, npcStables: [stable] });
    const context: NpcActionContext = {
      ...createContext(),
      state,
      stable,
      ownedHorses: horses,
      horseMap: new Map(horses.map((horse) => [horse.id, horse])),
    };

    const result = generateNpcActions(context);
    const transportPlan = result.plans.find((plan) => plan.actionId === "transport");
    const transportTrace = result.traces.find((trace) => trace.actionId === "transport");

    expect(result.intents.filter((intent) => intent.type === "transport")).toHaveLength(0);
    expect(transportPlan?.resources.estimatedCost).toBe(0);
    expect(transportPlan?.resources.estimatedCost).toBeLessThanOrEqual(stable.cash);
    expect(transportTrace?.status).toBe("no_candidates");
    expect(transportTrace?.resourceRejectedCount).toBe(1);
  });

  for (const action of NPC_ACTION_REGISTRY) {
    it(`becomes eligible in a valid seeded scenario: ${action.id}`, () => {
      const context = scenarioForAction(action.id);
      const result = withUuidStream(createRng(hashStr(`action-${action.id}`)), () =>
        generateNpcActions(context),
      );
      const trace = result.traces.find((entry) => entry.actionId === action.id);

      expect(trace?.status).toBe("executed");
      expect(trace?.intentCount ?? 0).toBeGreaterThan(0);
      expect(trace?.intentTypes.every((type) => action.intentTypes.includes(type))).toBe(true);
      for (const intentId of trace?.intentIds ?? []) {
        expect(result.intents.some((intent) => intent.id === intentId)).toBe(true);
      }
    });
  }
});
