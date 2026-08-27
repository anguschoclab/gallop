/**
 * Tests for race entry resolution phase
 */

import { describe, it, expect } from "vitest";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { createTestHorse, createUnownedHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { RaceEntryIntent, RaceWithdrawalIntent } from "@/core/resolver/intents";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import type { RaceEntryImpact } from "@/core/resolver/impacts/raceImpacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { createJockeyAIState } from "@/core/ai/jockeyAI";
import { asNpcStableId } from "@/core/types/branded";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";

describe("raceEntryResolutionPhase", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
      pendingIntents: [],
    }) as GameState;

  const createTestContext = (state: GameState, intents: RaceEntryIntent[] = []): PipelineContext =>
    createMockPipelineContext({ state, intents });

  it("should process race entry intent and generate race entry impact", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
      races: r2r([
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      ]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const context = createTestContext(state, [intent]);
    const result = raceEntryResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(2);
    expect(result.impacts[0].type).toBe("race_entry");
    expect(result.impacts[1].type).toBe("cash_change");
  });

  it("should skip non-race entry intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
    };

    const context = createTestContext(state, [] as any);
    const result = raceEntryResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should have correct order", () => {
    expect(raceEntryResolutionPhase.order).toBe(15);
  });

  it("should have correct name", () => {
    expect(raceEntryResolutionPhase.name).toBe("raceEntryResolution");
  });

  describe("CPU bump", () => {
    it("generates a race_entry impact with bumpEntryHorseId when NPC challenger outclasses weakest entry", () => {
      const weakHorse = createTestHorse({
        id: "weak-npc",
        ownership: makeNpcOwned("s-other"),
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
      });
      const challenger = createTestHorse({
        id: "strong-challenger",
        ownership: makeNpcOwned("s1"),
        stats: {
          speed: 80,
          stamina: 80,
          acceleration: 80,
          consistency: 80,
          temperament: 80,
          conformation: 80,
        },
      });
      const state: GameState = {
        ...(makeGameState() as GameState),
        horses: h2r([weakHorse, challenger]),
        npcStables: [
          { id: "s1", name: "S1", cash: 10000, horses: ["strong-challenger"] } as any,
          { id: "s-other", name: "S-other", cash: 10000, horses: ["weak-npc"] } as any,
        ],
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 200,
            purse: 10000,
            fieldSize: 1,
            entries: [
              {
                horseId: "weak-npc",
                ownership: makeNpcOwned(asNpcStableId("s-other")),
                
              },
            ],
            resolved: false,
          },
        ]),
        jockeys: [{ id: "j1", name: "J", fame: 50, ridingFee: 100 } as any],
      };

      const intent: RaceEntryIntent = {
        id: "intent-bump",
        day: 1,
        type: "race_entry",
        entityId: "race-1",
        priority: 50,
        source: "npc",
        sourceId: "s1",
        horseId: "strong-challenger",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      expect(entryImpact.bumpEntryHorseId).toBe("weak-npc");
    });

    it("does NOT bump when challenger rating is within BUMP_RATING_MARGIN of weakest", () => {
      const weakHorse = createTestHorse({
        id: "weak-npc",
        ownership: makeNpcOwned("s-other"),
        stats: {
          speed: 65,
          stamina: 65,
          acceleration: 65,
          consistency: 65,
          temperament: 65,
          conformation: 65,
        },
      });
      const challenger = createTestHorse({
        id: "challenger",
        ownership: makeNpcOwned("s1"),
        stats: {
          speed: 66,
          stamina: 66,
          acceleration: 66,
          consistency: 66,
          temperament: 66,
          conformation: 66,
        },
      });
      const state: GameState = {
        ...(makeGameState() as GameState),
        horses: h2r([weakHorse, challenger]),
        npcStables: [
          { id: "s1", name: "S1", cash: 10000, horses: ["challenger"] } as any,
          { id: "s-other", name: "S-other", cash: 10000, horses: ["weak-npc"] } as any,
        ],
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 200,
            purse: 10000,
            fieldSize: 1,
            entries: [
              {
                horseId: "weak-npc",
                ownership: makeNpcOwned(asNpcStableId("s-other")),
                
              },
            ],
            resolved: false,
          },
        ]),
        jockeys: [{ id: "j1", name: "J", fame: 50, ridingFee: 100 } as any],
      };

      const intent: RaceEntryIntent = {
        id: "intent-no-bump",
        day: 1,
        type: "race_entry",
        entityId: "race-1",
        priority: 50,
        source: "npc",
        sourceId: "s1",
        horseId: "challenger",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
    });

    it("does NOT bump a player-owned entry", () => {
      const playerHorse = createTestHorse({ id: "player-horse", ownership: makePlayerOwned() });
      const challenger = createTestHorse({
        id: "strong-challenger",
        ownership: makeNpcOwned("s1"),
        stats: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          consistency: 90,
          temperament: 90,
          conformation: 90,
        },
      });
      const state: GameState = {
        ...(makeGameState() as GameState),
        horses: h2r([playerHorse, challenger]),
        npcStables: [{ id: "s1", name: "S1", cash: 10000, horses: ["strong-challenger"] } as any],
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 200,
            purse: 10000,
            fieldSize: 1,
            entries: [{ horseId: "player-horse", ownership: makePlayerOwned()}],
            resolved: false,
          },
        ]),
        jockeys: [{ id: "j1", name: "J", fame: 50, ridingFee: 100 } as any],
      };

      const intent: RaceEntryIntent = {
        id: "intent-no-player-bump",
        day: 1,
        type: "race_entry",
        entityId: "race-1",
        priority: 50,
        source: "npc",
        sourceId: "s1",
        horseId: "strong-challenger",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
    });
  });

  describe("player bump passthrough", () => {
    it("processes a player intent with bumpEntryHorseId on a full race", () => {
      const npcHorse = createTestHorse({ id: "npc-weak", ownership: makeNpcOwned("s-npc") });
      const playerHorse = createTestHorse({ id: "player-horse" });
      const state: GameState = {
        ...(makeGameState() as GameState),
        horses: h2r([npcHorse, playerHorse]),
        npcStables: [{ id: "s-npc", name: "S-NPC", cash: 10000, horses: ["npc-weak"] } as any],
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 200,
            purse: 10000,
            fieldSize: 1,
            entries: [
              {
                horseId: "npc-weak",
                ownership: makeNpcOwned(asNpcStableId("s-npc")),
                
              },
            ],
            resolved: false,
          },
        ]),
      };

      const intent: RaceEntryIntent = {
        id: "intent-player-bump",
        day: 1,
        type: "race_entry",
        entityId: "player-horse",
        priority: 100,
        source: "player",
        horseId: "player-horse",
        raceId: "race-1",
        bumpEntryHorseId: "npc-weak",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      expect(entryImpact.bumpEntryHorseId).toBe("npc-weak");
      expect(entryImpact.horseId).toBe("player-horse");
    });

    it("skips a player intent on a full race with no bumpEntryHorseId", () => {
      const npcHorse = createTestHorse({ id: "npc-horse", ownership: makeNpcOwned("s-npc") });
      const playerHorse = createTestHorse({ id: "player-horse" });
      const state: GameState = {
        ...(makeGameState() as GameState),
        horses: h2r([npcHorse, playerHorse]),
        npcStables: [],
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 200,
            purse: 10000,
            fieldSize: 1,
            entries: [
              {
                horseId: "npc-horse",
                ownership: makeNpcOwned(asNpcStableId("s-npc")),
                
              },
            ],
            resolved: false,
          },
        ]),
      };

      const intent: RaceEntryIntent = {
        id: "intent-no-bump",
        day: 1,
        type: "race_entry",
        entityId: "player-horse",
        priority: 100,
        source: "player",
        horseId: "player-horse",
        raceId: "race-1",
        // no bumpEntryHorseId
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
    });
  });

  describe("NPC jockey assignment via stableMap and jockeysByStableId", () => {
    it("should assign retained jockey for NPC entry", () => {
      const npcHorse = createTestHorse({ id: "npc-horse", ownership: makeNpcOwned("s-npc") });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([npcHorse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [{ id: "s-npc", name: "NPC Stable", horses: h2r([npcHorse]) } as any],
        jockeys: [
          {
            id: "j-retainer",
            name: "Retainer",
            stableId: "s-npc",
            fame: 50,
            lastRaceDay: 0,
          } as any,
        ],
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "npc-horse",
        priority: 100,
        source: "npc",
        sourceId: "s-npc",
        horseId: "npc-horse",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      expect(entryImpact.jockeyId).toBe("j-retainer");
    });

    it("should handle NPC entry from non-existent stable gracefully", () => {
      const npcHorse = createTestHorse({ id: "npc-horse", ownership: makeNpcOwned("s-nonexistent") });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([npcHorse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [],
        jockeys: [],
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "npc-horse",
        priority: 100,
        source: "npc",
        sourceId: "s-nonexistent",
        horseId: "npc-horse",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
    });

    it("should process multiple NPC entries from different stables with retainers", () => {
      const h1 = createTestHorse({ id: "npc-h1", ownership: makeNpcOwned("s-a") });
      const h2 = createTestHorse({ id: "npc-h2", ownership: makeNpcOwned("s-b") });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([h1, h2]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [
          { id: "s-a", name: "Stable A", horses: h2r([h1]) } as any,
          { id: "s-b", name: "Stable B", horses: h2r([h2]) } as any,
        ],
        jockeys: [
          { id: "j-a", name: "Jockey A", stableId: "s-a", fame: 50, lastRaceDay: 0 } as any,
          { id: "j-b", name: "Jockey B", stableId: "s-b", fame: 60, lastRaceDay: 0 } as any,
        ],
      };

      const intents: RaceEntryIntent[] = [
        {
          id: "i1",
          day: 1,
          type: "race_entry",
          entityId: "npc-h1",
          priority: 100,
          source: "npc",
          sourceId: "s-a",
          horseId: "npc-h1",
          raceId: "race-1",
        },
        {
          id: "i2",
          day: 1,
          type: "race_entry",
          entityId: "npc-h2",
          priority: 100,
          source: "npc",
          sourceId: "s-b",
          horseId: "npc-h2",
          raceId: "race-1",
        },
      ];

      const context = createTestContext(state, intents);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpacts = result.impacts.filter((i) => i.type === "race_entry");
      expect(entryImpacts).toHaveLength(2);
      const jockeyIds = entryImpacts.map((e: any) => e.jockeyId).sort();
      expect(jockeyIds).toEqual(["j-a", "j-b"]);
    });
  });

  describe("chemistry-aware backup jockey selection", () => {
    it("selects free agent with affinity over higher-fame jockey when no retainer and no AI manager", () => {
      const npcHorse = createTestHorse({ id: "npc-horse", ownership: makeNpcOwned("s-npc"), runningStyle: "P" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([npcHorse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [{ id: "s-npc", name: "NPC Stable", horses: h2r([npcHorse]) } as any],
        jockeys: [
          {
            id: "j-famous",
            name: "Famous Jockey",
            fame: 90,
            ridingFee: 100,
            archetype: "versatile",
            affinityMap: {},
            stableAffinity: 0,
            lastRaceDay: 0,
          } as any,
          {
            id: "j-affinity",
            name: "Affinity Jockey",
            fame: 30,
            ridingFee: 100,
            archetype: "versatile",
            affinityMap: { "npc-horse": 500 },
            stableAffinity: 0,
            lastRaceDay: 0,
          } as any,
        ],
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "npc-horse",
        priority: 100,
        source: "npc",
        sourceId: "s-npc",
        horseId: "npc-horse",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      expect(entryImpact.jockeyId).toBe("j-affinity");
    });
  });

  describe("retainer vs free agent comparison", () => {
    it("NPC entry with Poor-compatibility retainer + zero affinity selects free agent with High compatibility", () => {
      const npcHorse = createTestHorse({
        id: "npc-horse",
        ownership: makeNpcOwned("s-npc"),
        runningStyle: "S",
      });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([npcHorse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 0,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [
          {
            id: "s-npc",
            name: "NPC Stable",
            horses: h2r([npcHorse]),
            personality: "conservative",
            cash: 100000,
          } as any,
        ],
        jockeys: [
          {
            id: "j-retainer",
            name: "Retainer Jockey",
            fame: 50,
            ridingFee: 100,
            archetype: "front_runner",
            affinityMap: {},
            stableAffinity: 0,
            stableId: "s-npc",
            lastRaceDay: 0,
            stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
          } as any,
          {
            id: "j-freeagent",
            name: "Free Agent Jockey",
            fame: 50,
            ridingFee: 100,
            archetype: "closer",
            affinityMap: {},
            stableAffinity: 0,
            traits: ["closer_instinct"],
            lastRaceDay: 0,
            stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
          } as any,
        ],
        npcAIManager: {
          stableStates: {
            "s-npc": {
              jockeyAI: createJockeyAIState({
                id: "s-npc",
                name: "NPC Stable",
                personality: "conservative",
              } as any),
            },
          },
        } as any,
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "npc-horse",
        priority: 100,
        source: "npc",
        sourceId: "s-npc",
        horseId: "npc-horse",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      // Free agent with closer_instinct trait + S running style = High compatibility
      // should be selected over retainer with front_runner archetype + S = Poor
      expect(entryImpact.jockeyId).toBe("j-freeagent");
    });

    it("NPC entry with High-affinity retainer keeps retainer", () => {
      const npcHorse = createTestHorse({
        id: "npc-horse",
        ownership: makeNpcOwned("s-npc"),
        runningStyle: "E",
      });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([npcHorse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 0,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
        npcStables: [
          {
            id: "s-npc",
            name: "NPC Stable",
            horses: h2r([npcHorse]),
            personality: "conservative",
            cash: 100000,
          } as any,
        ],
        jockeys: [
          {
            id: "j-retainer",
            name: "Retainer Jockey",
            fame: 50,
            ridingFee: 100,
            archetype: "front_runner",
            affinityMap: { "npc-horse": 500 },
            stableAffinity: 50,
            stableId: "s-npc",
            traits: ["gate_master"],
            lastRaceDay: 0,
            stats: { pacing: 80, positioning: 80, vigor: 80, gateSkill: 80, temperament: 80 },
          } as any,
          {
            id: "j-freeagent",
            name: "Free Agent Jockey",
            fame: 50,
            ridingFee: 100,
            archetype: "versatile",
            affinityMap: {},
            stableAffinity: 0,
            lastRaceDay: 0,
            stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
          } as any,
        ],
        npcAIManager: {
          stableStates: {
            "s-npc": {
              jockeyAI: createJockeyAIState({
                id: "s-npc",
                name: "NPC Stable",
                personality: "conservative",
              } as any),
            },
          },
        } as any,
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "npc-horse",
        priority: 100,
        source: "npc",
        sourceId: "s-npc",
        horseId: "npc-horse",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      const entryImpact = result.impacts.find((i) => i.type === "race_entry") as any;
      expect(entryImpact).toBeDefined();
      expect(entryImpact.jockeyId).toBe("j-retainer");
    });
  });

  describe("unowned horse transport cost", () => {
    it("should NOT charge transport cost for an unowned horse", () => {
      const horse = createUnownedHorse({ id: "unowned-1" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([horse]),
        races: r2r([
          {
            id: "race-1",
            name: "Test Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
          },
        ]),
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "unowned-1",
        priority: 100,
        source: "player",
        horseId: "unowned-1",
        raceId: "race-1",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      // Should have race_entry impact but NO cash_change for transport
      const entryImpact = result.impacts.find((i) => i.type === "race_entry");
      expect(entryImpact).toBeDefined();

      const transportImpact = result.impacts.find(
        (i) => i.type === "cash_change" && (i as any).reason?.includes("Transport"),
      );
      expect(transportImpact).toBeUndefined();
    });
  });

  describe("cancelled races", () => {
    it("25. should skip cancelled race — no race_entry impact emitted", () => {
      const horse = createTestHorse({ id: "horse-1" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([horse]),
        races: r2r([
          {
            id: "race-cancelled",
            name: "Cancelled Race",
            day: 5,
            distance: 2000,
            raceClass: "Maiden",
            entryFee: 500,
            purse: 10000,
            minStat: 70,
            fieldSize: 8,
            entries: [],
            resolved: false,
            cancelled: true,
            cancelledReason: "Insufficient entries",
          } as any,
        ]),
      };

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "horse-1",
        priority: 100,
        source: "player",
        horseId: "horse-1",
        raceId: "race-cancelled",
      };

      const context = createTestContext(state, [intent]);
      const result = raceEntryResolutionPhase.execute(context);

      expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
    });
  });

  describe("race_withdrawal resolution", () => {
    it("should convert race_withdrawal intent into race_withdrawal impact", () => {
      const horse = createTestHorse({ id: "horse-w" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([horse]),
        races: r2r([
          {
            id: "race-w",
            name: "Withdraw Test",
            day: 1,
            distance: 2000,
            entryFee: 500,
            fieldSize: 8,
            entries: [{ horseId: "horse-w", ownership: makePlayerOwned() }],
            resolved: false,
          } as any,
        ]),
      } as any;

      const withdrawalIntent: RaceWithdrawalIntent = {
        id: "w-intent-1",
        entityId: "horse-w",
        source: "player",
        day: 1,
        priority: 100,
        type: "race_withdrawal",
        raceId: "race-w" as any,
        horseId: "horse-w" as any,
      };

      const context = createMockPipelineContext({ state, intents: [withdrawalIntent] } as any);
      const result = raceEntryResolutionPhase.execute(context);

      const withdrawalImpacts = result.impacts.filter((i) => i.type === "race_withdrawal");
      expect(withdrawalImpacts).toHaveLength(1);
      expect((withdrawalImpacts[0] as any).raceId).toBe("race-w");
      expect((withdrawalImpacts[0] as any).horseId).toBe("horse-w");
      expect((withdrawalImpacts[0] as any).refundAmount).toBe(500);
    });

    it("should skip withdrawal intent for non-existent race", () => {
      const horse = createTestHorse({ id: "horse-w2" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([horse]),
        races: r2r([]),
      } as any;

      const withdrawalIntent: RaceWithdrawalIntent = {
        id: "w-intent-2",
        entityId: "horse-w2",
        source: "player",
        day: 1,
        priority: 100,
        type: "race_withdrawal",
        raceId: "race-missing" as any,
        horseId: "horse-w2" as any,
      };

      const context = createMockPipelineContext({ state, intents: [withdrawalIntent] } as any);
      const result = raceEntryResolutionPhase.execute(context);

      const withdrawalImpacts = result.impacts.filter((i) => i.type === "race_withdrawal");
      expect(withdrawalImpacts).toHaveLength(0);
    });

    it("should skip withdrawal intent for resolved race", () => {
      const horse = createTestHorse({ id: "horse-w3" });
      const state: GameState = {
        ...createTestState(),
        horses: h2r([horse]),
        races: r2r([
          {
            id: "race-resolved",
            name: "Resolved Race",
            day: 1,
            distance: 2000,
            entryFee: 500,
            fieldSize: 8,
            entries: [{ horseId: "horse-w3", ownership: makePlayerOwned() }],
            resolved: true,
          } as any,
        ]),
      } as any;

      const withdrawalIntent: RaceWithdrawalIntent = {
        id: "w-intent-3",
        entityId: "horse-w3",
        source: "player",
        day: 1,
        priority: 100,
        type: "race_withdrawal",
        raceId: "race-resolved" as any,
        horseId: "horse-w3" as any,
      };

      const context = createMockPipelineContext({ state, intents: [withdrawalIntent] } as any);
      const result = raceEntryResolutionPhase.execute(context);

      const withdrawalImpacts = result.impacts.filter((i) => i.type === "race_withdrawal");
      expect(withdrawalImpacts).toHaveLength(0);
    });
  });

  describe("transport balanceAfter accounting", () => {
    it("transport transaction balanceAfter should account for entry fee", () => {
      const horse = createTestHorse({ id: "horse-t" });
      const state: GameState = {
        ...createTestState(),
        cash: 10000,
        horses: h2r([horse]),
        races: r2r([
          {
            id: "race-t",
            name: "Transport Test",
            day: 1,
            distance: 2000,
            entryFee: 1000,
            fieldSize: 8,
            entries: [],
            resolved: false,
          } as any,
        ]),
      } as any;

      const entryIntent: RaceEntryIntent = {
        id: "t-intent-1",
        entityId: "horse-t",
        source: "player",
        day: 1,
        priority: 100,
        type: "race_entry",
        raceId: "race-t" as any,
        horseId: "horse-t" as any,
      };

      const context = createMockPipelineContext({ state, intents: [entryIntent] } as any);
      const result = raceEntryResolutionPhase.execute(context);

      const transportTx = (result.state as any).transactions.find(
        (t: any) => t.subcategory === "transport",
      );
      expect(transportTx).toBeDefined();
      // Entry fee (1000) + transport cost (150 for non-graded) = 1150 total
      // balanceAfter should be 10000 - 1000 - 150 = 8850
      expect(transportTx.balanceAfter).toBe(10000 - 1000 - 150);
    });
  });
});
