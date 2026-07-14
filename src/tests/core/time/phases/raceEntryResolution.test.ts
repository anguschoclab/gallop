/**
 * Tests for race entry resolution phase
 */

import { describe, it, expect } from "vitest";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { RaceEntryIntent } from "@/core/resolver/intents";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import type { RaceEntryImpact } from "@/core/resolver/impacts/raceImpacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

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
        stableId: "s-other",
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
        stableId: "s1",
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
            entries: [{ horseId: "weak-npc", owned: false, stableId: "s-other", npc: true }],
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
        stableId: "s-other",
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
        stableId: "s1",
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
            entries: [{ horseId: "weak-npc", owned: false, stableId: "s-other", npc: true }],
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
      const playerHorse = createTestHorse({ id: "player-horse", owned: true });
      const challenger = createTestHorse({
        id: "strong-challenger",
        stableId: "s1",
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
            entries: [{ horseId: "player-horse", owned: true, npc: false }],
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
      const npcHorse = createTestHorse({ id: "npc-weak", stableId: "s-npc" });
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
            entries: [{ horseId: "npc-weak", owned: false, stableId: "s-npc", npc: true }],
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
      const npcHorse = createTestHorse({ id: "npc-horse", stableId: "s-npc" });
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
            entries: [{ horseId: "npc-horse", owned: false, stableId: "s-npc", npc: true }],
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
      const npcHorse = createTestHorse({ id: "npc-horse", stableId: "s-npc" });
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
      const npcHorse = createTestHorse({ id: "npc-horse", stableId: "s-nonexistent" });
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
      const h1 = createTestHorse({ id: "npc-h1", stableId: "s-a" });
      const h2 = createTestHorse({ id: "npc-h2", stableId: "s-b" });
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
});
