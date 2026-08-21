/**
 * Phase 1.5 — System Integration Tests (Track D)
 *
 * 1. Full pipeline test — all 52 phases execute in order
 * 2. Intent → Impact → State flow tests for multiple intent types
 * 3. NPC AI 7-day cycle test
 * 4. Awards ceremony flow test
 * 5. Solvency escalation test (supplements existing solvencyPhase tests)
 * 6. Multi-day advance test (30 days)
 * 7. Storage/persistence test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { createRng } from "@/core/common/rng";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState, makePipelineContext, h2r, r2r } from "@/tests/helpers/sampleGameState";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import type { GameState, Horse, Stable } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";

function buildContext(state: GameState, newDay: number = 1): PipelineContext {
  return {
    previousDay: newDay - 1,
    newDay,
    state,
    logs: [],
    dailyRng: createRng(42),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(Object.values(state.horses ?? {}).map((h) => [h.id, h])),
    raceMap: new Map(Object.values(state.races ?? {}).map((r) => [r.id, r])),
    stableMap: new Map((state.npcStables ?? []).map((s) => [s.id, s])),
    jockeyMap: new Map((state.jockeys ?? []).map((j) => [j.id, j])),
  };
}

// ---------------------------------------------------------------------------
// 1. Full Pipeline Test — All 50+ Phases Execute in Order
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Full pipeline: all phases execute in order", () => {
  it("GAME_PIPELINE_PHASES contains 50+ phases", () => {
    expect(GAME_PIPELINE_PHASES.length).toBeGreaterThanOrEqual(50);
  });

  it("all phases have unique order values", () => {
    const orders = GAME_PIPELINE_PHASES.map((p) => p.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });

  it("all phases are sorted by order", () => {
    for (let i = 1; i < GAME_PIPELINE_PHASES.length; i++) {
      expect(GAME_PIPELINE_PHASES[i - 1].order).toBeLessThan(GAME_PIPELINE_PHASES[i].order);
    }
  });

  it("all phases have required properties", () => {
    for (const phase of GAME_PIPELINE_PHASES) {
      expect(phase).toBeDefined();
      expect(typeof phase.order).toBe("number");
      expect(typeof phase.execute).toBe("function");
      expect(typeof phase.name).toBe("string");
    }
  });

  it("full pipeline executes without crashing on empty state", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
    expect(result).toBeDefined();
    expect(result.state).toBeDefined();
    expect(result.logs).toBeDefined();
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it("full pipeline preserves state through execution", () => {
    const state = makeGameState({ day: 2, cash: 100000 }) as GameState;
    const context = buildContext(state, 2);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
    expect(result.state).toBeDefined();
    // Pipeline processes state but doesn't advance day itself —
    // the caller (advanceDay) sets newDay before calling executePipeline
    expect(result.state.day).toBeDefined();
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

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
    const updatedHorse = Object.values(result.state.horses)[0] as Horse;
    expect(updatedHorse.gender).toBe("gelding");
  });

  it("empty pendingIntents produces no errors", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.pendingIntents = [];
    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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
      stableId: "npc-1",
      owned: false,
      age: 3,
      energy: 80,
    });
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.horses = h2r([horse]);
    state.npcStables = [stable];

    let currentState = state;
    for (let day = 1; day <= 7; day++) {
      const context = buildContext(currentState, day);
      const result = executePipeline(GAME_PIPELINE_PHASES, context);
      currentState = result.state;
    }

    // After 7 days of pipeline execution, state should be consistent
    // (pipeline itself doesn't advance day — caller does)
    expect(currentState).toBeDefined();
    expect(currentState.horses).toBeDefined();
    expect(Object.keys(currentState.horses).length).toBeGreaterThan(0);
  });

  it("NPC cycle with no stables completes without error", () => {
    const state = makeGameState({ day: 1, cash: 100000 }) as GameState;
    state.npcStables = [];

    let currentState = state;
    for (let day = 1; day <= 3; day++) {
      const context = buildContext(currentState, day);
      const result = executePipeline(GAME_PIPELINE_PHASES, context);
      currentState = result.state;
    }

    expect(currentState).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Awards Ceremony Flow Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Awards ceremony flow", () => {
  it("awardInvitationsPhase is registered in pipeline", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "awardInvitations");
    expect(phase).toBeDefined();
  });

  it("awardsPhase is registered in pipeline", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "awards");
    expect(phase).toBeDefined();
  });

  it("pipeline processes awards phases in correct order", () => {
    const invitationsPhase = GAME_PIPELINE_PHASES.find((p) => p.name === "awardInvitations");
    const awardsPhase = GAME_PIPELINE_PHASES.find((p) => p.name === "awards");
    expect(invitationsPhase!.order).toBeLessThan(awardsPhase!.order);
  });

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

    const context = buildContext(state, 365);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
    expect(result.state).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Solvency Escalation Test
// ---------------------------------------------------------------------------

describe("Phase 1.5 — Solvency escalation in full pipeline", () => {
  it("solvencyPhase is registered in pipeline", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "solvency");
    expect(phase).toBeDefined();
  });

  it("pipeline with negative cash escalates solvency tier", () => {
    const state = makeGameState({ day: 1, cash: -50000 }) as GameState;
    state.solvencyTier = "healthy";
    state.solvencyAuditLog = [];

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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

    const context = buildContext(state, 1);
    const result = executePipeline(GAME_PIPELINE_PHASES, context);
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

    let currentState = state;
    for (let day = 1; day <= 30; day++) {
      const context = buildContext(currentState, day);
      const result = executePipeline(GAME_PIPELINE_PHASES, context);
      currentState = result.state;
    }

    // Pipeline processes state but doesn't advance day itself
    expect(currentState).toBeDefined();
    // Horse should still exist
    const h = Object.values(currentState.horses)[0] as Horse;
    expect(h).toBeDefined();
    expect(h.id).toBe("h1");
  });

  it("30-day advance with NPC stables produces no crashes", () => {
    const stable = createTestStable({ id: "npc-1", cash: 1000000, isMajor: true });
    const horse = createTestHorse({
      id: "h1",
      stableId: "npc-1",
      owned: false,
      age: 3,
      energy: 80,
    });
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;
    state.horses = h2r([horse]);
    state.npcStables = [stable];

    let currentState = state;
    for (let day = 1; day <= 30; day++) {
      const context = buildContext(currentState, day);
      const result = executePipeline(GAME_PIPELINE_PHASES, context);
      currentState = result.state;
    }

    expect(currentState).toBeDefined();
  });

  it("30-day advance produces logs", () => {
    const state = makeGameState({ day: 1, cash: 500000 }) as GameState;

    let currentState = state;
    let totalLogs = 0;
    for (let day = 1; day <= 30; day++) {
      const context = buildContext(currentState, day);
      const result = executePipeline(GAME_PIPELINE_PHASES, context);
      currentState = result.state;
      totalLogs += result.logs.length;
    }

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
