import { describe, it, expect } from "vitest";
import {
  buildRaceField,
  type RaceSimulationDependencies,
} from "@/services/race/raceSimulationService";
import { createTestHorse, createTestJockey, createTestStable } from "@/tests/helpers";
import type { Race } from "@/core/race/types";
import type { Horse, Stable } from "@/game/types";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "test-race-rivals",
    name: "Rival Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    purse: 50000,
    trackId: "test-track",
    trackCondition: "Fast",
    surface: "Dirt",
    fieldSize: 4,
    entries: [],
    resolved: false,
    cancelled: false,
    ...overrides,
  } as unknown as Race;
}

function makeNpcManager(stableStates: Record<string, any>): NpcAIManager {
  return {
    stableStates,
    globalDay: 1,
    regionalKings: {},
  };
}

describe("populateRivalHorseIds — via buildRaceField", () => {
  it("populates rivalHorseIds when two rival stables have horses in the same race", () => {
    const stableA = createTestStable({ id: "stable-a", name: "Stable A" });
    const stableB = createTestStable({ id: "stable-b", name: "Stable B" });

    const horseA1 = createTestHorse({
      id: "ha1",
      name: "Horse A1",
      ownership: makeNpcOwned(asNpcStableId("stable-a")),
    });
    const horseA2 = createTestHorse({
      id: "ha2",
      name: "Horse A2",
      ownership: makeNpcOwned(asNpcStableId("stable-a")),
    });
    const horseB1 = createTestHorse({
      id: "hb1",
      name: "Horse B1",
      ownership: makeNpcOwned(asNpcStableId("stable-b")),
    });
    const horseB2 = createTestHorse({
      id: "hb2",
      name: "Horse B2",
      ownership: makeNpcOwned(asNpcStableId("stable-b")),
    });

    const race = makeRace({
      fieldSize: 4,
      entries: [
        { horseId: "ha1" as any, ownership: makeNpcOwned(asNpcStableId("stable-a")) },
        { horseId: "ha2" as any, ownership: makeNpcOwned(asNpcStableId("stable-a")) },
        { horseId: "hb1" as any, ownership: makeNpcOwned(asNpcStableId("stable-b")) },
        { horseId: "hb2" as any, ownership: makeNpcOwned(asNpcStableId("stable-b")) },
      ],
    });

    const npcAIManager = makeNpcManager({
      "stable-a": {
        npcRelationships: {
          "stable-b": { trust: -50, allianceType: null, history: [] },
        },
      },
      "stable-b": {
        npcRelationships: {
          "stable-a": { trust: -50, allianceType: null, history: [] },
        },
      },
    });

    const deps: RaceSimulationDependencies = {
      race,
      horses: [horseA1, horseA2, horseB1, horseB2],
      jockeys: [createTestJockey()],
      npcStables: [stableA, stableB],
      npcAIManager,
    };

    const { runners } = buildRaceField(deps);

    // Runners from stable-a should have rivalHorseIds containing stable-b horses
    const aRunners = runners.filter((r) => r.horseId === "ha1" || r.horseId === "ha2");
    expect(aRunners.length).toBe(2);
    for (const r of aRunners) {
      expect(r.rivalHorseIds).toBeDefined();
      expect(r.rivalHorseIds!.length).toBe(2);
      // Should contain both stable-b horse IDs, but NOT its own
      expect(r.rivalHorseIds).toContain("hb1");
      expect(r.rivalHorseIds).toContain("hb2");
      expect(r.rivalHorseIds).not.toContain(r.horseId);
    }

    // Runners from stable-b should have rivalHorseIds containing stable-a horses
    const bRunners = runners.filter((r) => r.horseId === "hb1" || r.horseId === "hb2");
    expect(bRunners.length).toBe(2);
    for (const r of bRunners) {
      expect(r.rivalHorseIds).toBeDefined();
      expect(r.rivalHorseIds!.length).toBe(2);
      expect(r.rivalHorseIds).toContain("ha1");
      expect(r.rivalHorseIds).toContain("ha2");
      expect(r.rivalHorseIds).not.toContain(r.horseId);
    }
  });

  it("does not populate rivalHorseIds when trust >= -40", () => {
    const stableA = createTestStable({ id: "stable-a", name: "Stable A" });
    const stableB = createTestStable({ id: "stable-b", name: "Stable B" });

    const horseA1 = createTestHorse({
      id: "ha1",
      name: "Horse A1",
      ownership: makeNpcOwned(asNpcStableId("stable-a")),
    });
    const horseB1 = createTestHorse({
      id: "hb1",
      name: "Horse B1",
      ownership: makeNpcOwned(asNpcStableId("stable-b")),
    });

    const race = makeRace({
      fieldSize: 2,
      entries: [
        { horseId: "ha1" as any, ownership: makeNpcOwned(asNpcStableId("stable-a")) },
        { horseId: "hb1" as any, ownership: makeNpcOwned(asNpcStableId("stable-b")) },
      ],
    });

    // trust = -30, which is above the -40 rivalry threshold
    const npcAIManager = makeNpcManager({
      "stable-a": {
        npcRelationships: {
          "stable-b": { trust: -30, allianceType: null, history: [] },
        },
      },
      "stable-b": {
        npcRelationships: {
          "stable-a": { trust: -30, allianceType: null, history: [] },
        },
      },
    });

    const deps: RaceSimulationDependencies = {
      race,
      horses: [horseA1, horseB1],
      jockeys: [createTestJockey()],
      npcStables: [stableA, stableB],
      npcAIManager,
    };

    const { runners } = buildRaceField(deps);

    for (const r of runners) {
      expect(r.rivalHorseIds).toBeUndefined();
    }
  });

  it("excludes the runner's own horseId from rivalHorseIds", () => {
    const stableA = createTestStable({ id: "stable-a", name: "Stable A" });
    const stableB = createTestStable({ id: "stable-b", name: "Stable B" });

    const horseA1 = createTestHorse({
      id: "ha1",
      name: "Horse A1",
      ownership: makeNpcOwned(asNpcStableId("stable-a")),
    });
    const horseB1 = createTestHorse({
      id: "hb1",
      name: "Horse B1",
      ownership: makeNpcOwned(asNpcStableId("stable-b")),
    });

    const race = makeRace({
      fieldSize: 2,
      entries: [
        { horseId: "ha1" as any, ownership: makeNpcOwned(asNpcStableId("stable-a")) },
        { horseId: "hb1" as any, ownership: makeNpcOwned(asNpcStableId("stable-b")) },
      ],
    });

    const npcAIManager = makeNpcManager({
      "stable-a": {
        npcRelationships: {
          "stable-b": { trust: -50, allianceType: null, history: [] },
        },
      },
      "stable-b": {
        npcRelationships: {
          "stable-a": { trust: -50, allianceType: null, history: [] },
        },
      },
    });

    const deps: RaceSimulationDependencies = {
      race,
      horses: [horseA1, horseB1],
      jockeys: [createTestJockey()],
      npcStables: [stableA, stableB],
      npcAIManager,
    };

    const { runners } = buildRaceField(deps);

    const aRunner = runners.find((r) => r.horseId === "ha1");
    expect(aRunner).toBeDefined();
    expect(aRunner!.rivalHorseIds).toBeDefined();
    expect(aRunner!.rivalHorseIds).toContain("hb1");
    expect(aRunner!.rivalHorseIds).not.toContain("ha1");
  });

  it("no-op when npcAIManager is undefined", () => {
    const horseA1 = createTestHorse({
      id: "ha1",
      name: "Horse A1",
      ownership: makePlayerOwned(),
    });

    const race = makeRace({
      fieldSize: 2,
      entries: [{ horseId: "ha1" as any, ownership: makePlayerOwned() }],
    });

    const deps: RaceSimulationDependencies = {
      race,
      horses: [horseA1],
      jockeys: [createTestJockey()],
      // No npcAIManager, no npcStables
    };

    const { runners } = buildRaceField(deps);

    for (const r of runners) {
      expect(r.rivalHorseIds).toBeUndefined();
    }
  });

  it("no-op when no rivalries exist", () => {
    const stableA = createTestStable({ id: "stable-a", name: "Stable A" });
    const stableB = createTestStable({ id: "stable-b", name: "Stable B" });

    const horseA1 = createTestHorse({
      id: "ha1",
      name: "Horse A1",
      ownership: makeNpcOwned(asNpcStableId("stable-a")),
    });
    const horseB1 = createTestHorse({
      id: "hb1",
      name: "Horse B1",
      ownership: makeNpcOwned(asNpcStableId("stable-b")),
    });

    const race = makeRace({
      fieldSize: 2,
      entries: [
        { horseId: "ha1" as any, ownership: makeNpcOwned(asNpcStableId("stable-a")) },
        { horseId: "hb1" as any, ownership: makeNpcOwned(asNpcStableId("stable-b")) },
      ],
    });

    // npcRelationships exist but trust is high (no rivalry)
    const npcAIManager = makeNpcManager({
      "stable-a": {
        npcRelationships: {
          "stable-b": { trust: 50, allianceType: null, history: [] },
        },
      },
      "stable-b": {
        npcRelationships: {
          "stable-a": { trust: 50, allianceType: null, history: [] },
        },
      },
    });

    const deps: RaceSimulationDependencies = {
      race,
      horses: [horseA1, horseB1],
      jockeys: [createTestJockey()],
      npcStables: [stableA, stableB],
      npcAIManager,
    };

    const { runners } = buildRaceField(deps);

    for (const r of runners) {
      expect(r.rivalHorseIds).toBeUndefined();
    }
  });
});
