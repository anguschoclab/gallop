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
import type { GameState } from "@/game/types";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

function createContext(): NpcActionContext {
  const stable = createTestStable({ id: "stable-1" });
  const state = makeGameState({ day: 10, npcStables: [stable] }) as GameState;
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
  };
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

  it("reserves cash across action plans and records rejected commitments", () => {
    const stable = createTestStable({
      id: "stable-1",
      cash: 5100,
      outposts: [
        {
          id: "east",
          name: "East",
          region: "North America (East)",
          totalSlots: 4,
          facilities: {},
          acclimatizationDays: { h1: 0, h2: 0 },
        },
        {
          id: "west",
          name: "West",
          region: "North America (West)",
          totalSlots: 4,
          facilities: {
            0: { type: "main_track", level: "basic", branch: "turf" },
          },
          acclimatizationDays: {},
        },
      ] as any,
    });
    const horses = [
      createTestHorse({
        id: "h1",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
        surfaceAptitude: { Turf: 90, Dirt: 10 } as any,
      }),
      createTestHorse({
        id: "h2",
        age: 4,
        ownership: { type: "npc", stableId: stable.id },
        surfaceAptitude: { Turf: 90, Dirt: 10 } as any,
      }),
    ];
    const state = makeGameState({ day: 10, npcStables: [stable] }) as GameState;
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
});
