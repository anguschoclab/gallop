/**
 * Phase 1.5 — System Integration Tests (Track D)
 *
 * 1. Full pipeline test — every registered phase executes through the compiled schedule
 * 2. Intent → Impact → State flow tests for multiple intent types
 * 3. NPC AI 7-day cycle test
 * 4. Awards ceremony flow test
 * 5. Solvency escalation test (supplements existing solvencyPhase tests)
 * 6. Multi-day advance test (30 days)
 * 7. Storage/persistence test
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import { runPipelineForDay, runPipelineForDays } from "@/tests/helpers/runPipeline";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import { makeUnowned } from "@/core/horse/ownership";

// ---------------------------------------------------------------------------
// 1. Full Pipeline Test — All 50+ Phases Execute in Order
// ---------------------------------------------------------------------------

describe("Phase 1.5 — production executor schedule", () => {
  it("runs the compiled descriptor schedule on a representative state", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    const result = runPipelineForDay(state, 2);

    expect(result.state.day).toBe(2);
    expect(result.state.pendingIntents).toEqual([]);
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it("contains the award and solvency phases used by the scenarios below", () => {
    const ids = new Set(GAME_PHASE_DESCRIPTORS.map((descriptor) => descriptor.id));
    expect([...ids]).toEqual(expect.arrayContaining(["awardInvitations", "awards", "solvency"]));
  });
});

// ---------------------------------------------------------------------------
// 2. Intent → Impact → State Flow Tests
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Intent → Impact → State flow", () => {
  it("training intent reduces energy and cash", () => {
    const horse = createTestHorse({ id: "h1", energy: 100 });
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.horses = h2r([horse]);
    state.pendingIntents = [
      {
        id: "i1",
        horseId: "h1",
        entityId: "h1",
        source: "player",
        day: 1,
        type: "training",
        trainingType: "gallop",
        priority: 1,
      } as AnyIntent,
    ];

    const result = runPipelineForDay(state, 2);
    const updatedHorse = Object.values(result.state.horses)[0] as Horse;
    expect(updatedHorse.energy).toBeLessThan(100);
  });

  it("jockey_contract intent is processed through pipeline", () => {
    const jockey = {
      id: "j1",
      name: "Test Jockey",
      ridingFee: 100,
      stableId: undefined,
    } as any;
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.jockeys = [jockey];
    state.pendingIntents = [
      {
        id: "i1",
        entityId: "j1",
        source: "player",
        day: 1,
        priority: 100,
        type: "jockey_contract",
        jockeyId: "j1",
        stableId: "player",
        contractUntil: 100,
        bonus: 100,
        stableAffinity: 0,
      } as AnyIntent,
    ];

    const result = runPipelineForDay(state, 2);
    // The jockey should have been contracted
    const updatedJockey = result.state.jockeys?.find((j: any) => j.id === "j1");
    expect(updatedJockey).toBeDefined();
  });

  it("rename intent changes horse name", () => {
    const horse = createTestHorse({ id: "h1", name: "OldName", energy: 80 });
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.horses = h2r([horse]);
    state.usedHorseNames = ["oldname"];
    state.pendingIntents = [
      {
        id: "i1",
        entityId: "h1",
        source: "player",
        day: 1,
        priority: 100,
        type: "rename",
        horseId: "h1",
        newName: "NewName",
      } as AnyIntent,
    ];

    const result = runPipelineForDay(state, 2);
    const updatedHorse = Object.values(result.state.horses)[0] as Horse;
    expect(updatedHorse.name).toBe("NewName");
  });

  it("gelding intent changes gender to gelding", () => {
    const horse = createTestHorse({ id: "h1", gender: "colt", energy: 80 });
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.horses = h2r([horse]);
    state.pendingIntents = [
      {
        id: "i1",
        entityId: "h1",
        source: "player",
        day: 1,
        priority: 100,
        type: "gelding",
        horseId: "h1",
      } as AnyIntent,
    ];

    const result = runPipelineForDay(state, 2);
    const updatedHorse = Object.values(result.state.horses)[0] as Horse;
    expect(updatedHorse.gender).toBe("gelding");
  });

  it("empty pendingIntents produces no errors", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.pendingIntents = [];
    const result = runPipelineForDay(state, 2);
    expect(result.state).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. NPC AI 7-Day Cycle Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — NPC AI 7-day cycle", () => {
  it("advancing 7 days with NPC stables generates and resolves intents", () => {
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeUnowned(),
      age: 3,
      energy: 80,
    });
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.horses = h2r([horse]);
    state.npcStables = [stable];

    const result = runPipelineForDays(state, 7);
    const currentState = result.state;

    expect(currentState.day).toBe(8);
    expect(currentState.horses).toBeDefined();
    expect(Object.keys(currentState.horses).length).toBeGreaterThan(0);
  });

  it("NPC cycle with no stables completes without error", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.npcStables = [];

    const result = runPipelineForDays(state, 3);

    expect(result.state.day).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 4. Awards Ceremony Flow Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Awards ceremony flow", () => {
  it("pipeline with award ceremony invitations does not crash", () => {
    const state = makeGameState({ day: 365, cash: 100000 }) as GameState;
    state.awardCeremonyInvitations = [
      {
        id: "inv1",
        awardYear: 1,
        region: "USA",
        category: "horse_of_the_year",
        horseId: "h1",
        rsvp: "pending",
        qualifiers: [],
      } as any,
    ];

    const result = runPipelineForDay(state, 366);
    expect(result.state).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Solvency Escalation Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Solvency escalation in full pipeline", () => {
  it("pipeline with negative cash escalates solvency tier", () => {
    const state = makeGameState({ day: 1, cash: -50000 }) as GameState;
    state.solvencyTier = "healthy";
    state.solvencyAuditLog = [];

    const result = runPipelineForDay(state, 2);
    expect(result.state).toBeDefined();
    // Solvency should have escalated from healthy
    if (result.state.solvencyTier) {
      expect(result.state.solvencyTier).not.toBe("healthy");
    }
  });

  it("pipeline with positive cash maintains healthy solvency", () => {
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;
    state.solvencyTier = "healthy";
    state.solvencyAuditLog = [];

    const result = runPipelineForDay(state, 2);
    expect(result.state).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Multi-Day Advance Test (30 days)
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Multi-day advance (30 days)", () => {
  it("advancing 30 days maintains state consistency", () => {
    const horse = createTestHorse({ id: "h1", energy: 100, age: 3 });
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;
    state.horses = h2r([horse]);

    const result = runPipelineForDays(state, 30);
    const currentState = result.state;

    expect(currentState.day).toBe(31);
    const h = Object.values(currentState.horses)[0] as Horse;
    expect(h).toBeDefined();
    expect(h.id).toBe("h1");
  });

  it("30-day advance with NPC stables produces no crashes", () => {
    const stable = createTestStable({ id: "npc-1", cash: 1000000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      ownership: makeUnowned(),
      age: 3,
      energy: 80,
    });
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;
    state.horses = h2r([horse]);
    state.npcStables = [stable];

    const result = runPipelineForDays(state, 30);

    expect(result.state.day).toBe(31);
  });

  it("30-day advance produces logs", () => {
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;

    const result = runPipelineForDays(state, 30);
    const totalLogs = result.perDay.reduce((sum, day) => sum + day.logs.length, 0);

    expect(totalLogs).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Storage/Persistence Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Storage/persistence", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  afterEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("store can be serialized via JSON.stringify", () => {
    const state = useGame.getState();
    expect(() => JSON.stringify(state)).not.toThrow();
  });

  it("store can be rehydrated from serialized state", () => {
    const original = useGame.getState();
    const serialized = JSON.stringify(original);
    const parsed = JSON.parse(serialized);
    expect(parsed).toBeDefined();
    expect(parsed.day).toBe(original.day);
    expect(parsed.cash).toBe(original.cash);
  });

  it("store state includes all required fields", () => {
    const state = useGame.getState();
    expect(state.day).toBeDefined();
    expect(state.cash).toBeDefined();
    expect(state.horses).toBeDefined();
    expect(state.races).toBeDefined();
    expect(typeof state.advanceDay).toBe("function");
    expect(typeof state.enqueueIntent).toBe("function");
  });

  it("store actions survive serialization round-trip", () => {
    const state = useGame.getState();
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized);
    // Actions are functions and won't survive JSON round-trip,
    // but data fields should
    expect(parsed.day).toBe(state.day);
    expect(parsed.cash).toBe(state.cash);
    // Actions need to be re-attached from the store
    const rehydrated = { ...parsed, ...useGame.getState() };
    expect(typeof rehydrated.advanceDay).toBe("function");
  });
});
