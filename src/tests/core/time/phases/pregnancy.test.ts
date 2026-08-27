/**
 * Tests for pregnancy phase
 */

import { describe, it, expect } from "vitest";
import {
  pregnancyPhase,
  buildNpcAIManagerUpdate,
  buildPregnancyImpacts,
} from "@/core/time/phases/pregnancy";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { createTestHorse, createTestMare, createTestStable } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Pregnancy, Horse } from "@/game/types";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import type { AnyImpact } from "@/core/resolver/impacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { asNpcStableId } from "@/core/types/branded";
import { makeNpcOwned, makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function createLiveFoalScenario(
  overrides: {
    damOwned?: boolean;
    sireStableId?: string;
    liveFoalGuarantee?: boolean;
  } = {},
) {
  const sire = createTestHorse({
    id: "sire-1",
    name: "Test Sire",
    gender: "horse",
    age: 5,
    ownership: overrides.sireStableId
      ? makeNpcOwned(asNpcStableId(overrides.sireStableId))
      : makeUnowned(),
    stud: {
      atStud: true,
      standingFee: 1000,
      seasonBookings: 0,
      bookSize: 40,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      lifetimeFoals: 0,
      retiredOnDay: 0,
    },
  });

  const dam = createTestMare({
    id: "dam-1",
    name: "Test Dam",
    age: 3, // Younger mare for lower complication rate
    ownership: (overrides.damOwned ?? true)
      ? makePlayerOwned()
      : makeNpcOwned(asNpcStableId("npc-dam-stable")),
  });

  const pregnancy: Pregnancy = {
    id: "preg-1",
    sireId: sire.id,
    damId: dam.id,
    sireName: sire.name,
    damName: dam.name,
    conceivedDay: 1,
    dueDay: 31,
    resolved: false,
    liveFoalGuarantee: overrides.liveFoalGuarantee ?? false,
    reBreedingAttempts: 0,
    refunded: false,
    isPlayerOwned: true,
  };

  return { sire, dam, pregnancy };
}

describe("pregnancyPhase", () => {
  it("should call resolvePregnancies and update state", () => {
    const { pregnancy } = createLiveFoalScenario();
    const state: GameState = makeGameState({
      day: 31,
      pregnancies: [pregnancy],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 30,
      newDay: 31,
      state,
    }) as PipelineContext;

    const result = pregnancyPhase.execute(context);
    expect(result.state).toBeDefined();
    expect(result.state.pregnancies).toBeDefined();
    expect(result.logs).toBeDefined();
  });

  it("should emit horse_creation, mare_foaling_update, and stud_career impacts for a live foal", () => {
    const { sire, dam, pregnancy } = createLiveFoalScenario();
    const state: GameState = makeGameState({
      day: 31,
      cash: 10000,
      horses: h2r([sire, dam]),
      npcStables: [],
      pregnancies: [pregnancy],
      usedHorseNames: [],
      reputation: {
        score: 0,
        tier: "unknown",
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
      },
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    const horseCreation = result.impacts.filter((i: AnyImpact) => i.type === "horse_creation");
    const mareFoaling = result.impacts.filter((i: AnyImpact) => i.type === "mare_foaling_update");
    const studCareer = result.impacts.filter((i: AnyImpact) => i.type === "stud_career");

    expect(horseCreation.length).toBe(1);
    expect(mareFoaling.length).toBe(1);
    expect(studCareer.length).toBe(1);

    const horseCreationImpact = horseCreation[0] as any;
    const mareFoalingImpact = mareFoaling[0] as any;
    const studCareerImpact = studCareer[0] as any;

    expect(mareFoalingImpact.horseId).toBe(dam.id);
    expect(mareFoalingImpact.lastFoaledDay).toBe(31);
    expect(mareFoalingImpact.foalsProduced).toContain(horseCreationImpact.horse.id);

    expect(studCareerImpact.horseId).toBe(sire.id);
    expect(studCareerImpact.studCareer.lifetimeFoals).toBe(1);
  });

  it("should emit reputation_change and inbox_message for player-owned dams", () => {
    const { sire, dam, pregnancy } = createLiveFoalScenario({ damOwned: true });
    const state: GameState = makeGameState({
      day: 31,
      cash: 10000,
      horses: h2r([sire, dam]),
      npcStables: [],
      pregnancies: [pregnancy],
      usedHorseNames: [],
      inbox: [],
      reputation: {
        score: 0,
        tier: "unknown",
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
      },
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    const reputationChanges = result.impacts.filter(
      (i: AnyImpact) => i.type === "reputation_change",
    );
    const inboxMessages = result.impacts.filter((i: AnyImpact) => i.type === "inbox_message");

    expect(reputationChanges.length).toBe(1);
    expect(inboxMessages.length).toBe(1);

    const repImpact = reputationChanges[0] as any;
    expect(repImpact.source).toBe("breeding_success");
    expect(repImpact.delta).toBeGreaterThan(0);

    const inboxImpact = inboxMessages[0] as any;
    expect(inboxImpact.message.category).toBe("foaling");
    expect(inboxImpact.message.cta.route).toBe("stable.$horseId");
  });

  it("should not directly mutate state.horses, state.reputation, state.inbox, or state.cash", () => {
    const { sire, dam, pregnancy } = createLiveFoalScenario({ damOwned: true });
    const initialHorses = h2r([sire, dam]);
    const initialInbox: any[] = [];
    const state: GameState = makeGameState({
      day: 31,
      cash: 10000,
      horses: initialHorses,
      npcStables: [],
      pregnancies: [pregnancy],
      usedHorseNames: [],
      inbox: initialInbox,
      reputation: {
        score: 0,
        tier: "unknown",
        events: [],
        gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
        totalWins: 0,
        yearsActive: 0,
      },
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    // Direct state fields should not be mutated by the phase itself
    expect(result.state.horses).toBe(initialHorses);
    expect(result.state.inbox).toBe(initialInbox);
    expect(result.state.reputation?.events).toHaveLength(0);
    expect(result.state.cash).toBe(10000);
  });

  it("should update state.usedHorseNames from resolvePregnancies", () => {
    const { sire, dam, pregnancy } = createLiveFoalScenario();
    const state: GameState = makeGameState({
      day: 31,
      horses: h2r([sire, dam]),
      npcStables: [],
      pregnancies: [pregnancy],
      usedHorseNames: ["existing-name"],
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    expect(result.state.usedHorseNames.length).toBeGreaterThan(1);
    expect(result.state.usedHorseNames).toContain("existing-name");
  });

  it("should emit cash_change for live foal guarantee refunds", () => {
    const { sire, dam, pregnancy } = createLiveFoalScenario({
      liveFoalGuarantee: true,
    });

    // Force a guaranteed complication by using an extremely old mare
    dam.age = 60;

    const state: GameState = makeGameState({
      day: 31,
      cash: 10000,
      horses: h2r([sire, dam]),
      npcStables: [],
      pregnancies: [pregnancy],
      usedHorseNames: [],
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    const cashChanges = result.impacts.filter((i: AnyImpact) => i.type === "cash_change");
    const refund = cashChanges.find((i: AnyImpact) => (i as any).entityId === "player");
    expect(refund).toBeDefined();
    expect((refund as any).amount).toBeGreaterThan(0);
  });

  it("should update npcAIManager when sire is NPC-owned", () => {
    const npcStable = createTestStable({ id: "npc-stable-1", name: "NPC Stable" });
    const { sire, dam, pregnancy } = createLiveFoalScenario({
      sireStableId: npcStable.id,
    });

    const manager: NpcAIManager = {
      stableStates: {},
      globalDay: 1,
      regionalKings: {},
    };

    const state: GameState = makeGameState({
      day: 31,
      horses: h2r([sire, dam]),
      npcStables: [npcStable],
      pregnancies: [pregnancy],
      usedHorseNames: [],
      npcAIManager: manager,
    }) as GameState;

    const context = createMockPipelineContext({ state, newDay: 31 });
    const result = pregnancyPhase.execute(context);

    expect(result.state.npcAIManager).toBeDefined();
    expect(result.state.npcAIManager?.stableStates[npcStable.id]).toBeDefined();
  });

  it("should append logs from pregnancy resolution", () => {
    const { pregnancy } = createLiveFoalScenario();
    const state: GameState = makeGameState({
      day: 31,
      pregnancies: [pregnancy],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 30,
      newDay: 31,
      state,
      logs: [{ day: 30, text: "Existing log" }],
    }) as PipelineContext;

    const result = pregnancyPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 30, text: "Existing log" });
    expect(result.logs.length).toBeGreaterThan(1);
  });

  it("should have correct order", () => {
    expect(pregnancyPhase.order).toBe(68);
  });

  it("should have correct name", () => {
    expect(pregnancyPhase.name).toBe("pregnancy");
  });
});

describe("buildNpcAIManagerUpdate", () => {
  it("returns undefined when npcAIManager is absent", () => {
    const foal = createTestHorse({ id: "foal-1" }) as Horse;
    const result = buildNpcAIManagerUpdate([], [], [], [], undefined, 1);
    expect(result).toBeUndefined();
  });
});

describe("buildPregnancyImpacts", () => {
  it("emits reputation and inbox only for player-owned dams", () => {
    const sire = createTestHorse({ id: "sire-1", name: "Sire", gender: "horse" });
    const playerDam = createTestMare({
      id: "dam-1",
      name: "Player Dam",
      ownership: makePlayerOwned(),
    });
    const npcDam = createTestMare({
      id: "dam-2",
      name: "NPC Dam",
      ownership: makeNpcOwned(asNpcStableId("npc-stable")),
    });

    const playerPregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: playerDam.id,
      sireName: sire.name,
      damName: playerDam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: true,
      foalId: "foal-1",
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
      isPlayerOwned: true,
    };

    const npcPregnancy: Pregnancy = {
      id: "preg-2",
      sireId: sire.id,
      damId: npcDam.id,
      sireName: sire.name,
      damName: npcDam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: true,
      foalId: "foal-2",
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
      isPlayerOwned: true,
    };

    const foal1 = createTestHorse({ id: "foal-1", name: "Foal One" });
    const foal2 = createTestHorse({ id: "foal-2", name: "Foal Two" });

    const impacts = buildPregnancyImpacts(
      [foal1, foal2],
      [playerPregnancy, npcPregnancy],
      [sire, playerDam, npcDam],
      31,
      0,
    );

    const reputationChanges = impacts.filter((i: AnyImpact) => i.type === "reputation_change");
    const inboxMessages = impacts.filter((i: AnyImpact) => i.type === "inbox_message");

    expect(reputationChanges.length).toBe(1);
    expect(inboxMessages.length).toBe(1);
    expect((reputationChanges[0] as any).metadata.horseId).toBe("foal-1");
  });
});
