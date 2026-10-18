/**
 * Tests for the NPC hidden-information observation boundary.
 *
 * The boundary guarantees: generators see public world facts plus their own
 * stable's internals — never player-private ledgers, rival AI internals,
 * queued intents, or hidden horse condition/potential.
 */
import { describe, it, expect } from "vitest";
import {
  buildNpcObservation,
  buildPublicWorldView,
  ensureNpcObservation,
  estimatePublicPlayerCash,
  estimateStableCash,
  isNpcObservation,
  prepareObservationWorkspace,
  publicHorseView,
  PUBLIC_WORLD_OBSERVER,
} from "@/domains/agents/simulation/agentObservation";
import { createInitialState } from "@/game/store/initialization";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { AnyIntent } from "@/core/resolver/intents";
import type { GameState } from "@/game/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  Object.assign(base, overrides);
  return base;
}

describe("hidden-information observation boundary", () => {
  it("redacts player-private fields from the observation", () => {
    const stable = createTestStable({ id: "s1" });
    const state = makeState({
      npcStables: [stable],
      cash: 500_000,
      inbox: [{ id: "m1" } as any],
      scoutReports: [{ id: "r1" } as any],
      transactions: [{ id: "t1" } as any],
      expenses: [{ id: "e1" } as any],
      pendingIntents: [{ id: "i1", type: "training" } as unknown as AnyIntent],
      campaigns: [{ id: "c1" } as any],
      playerBiddingHistory: [{ id: "b1" } as any],
      strategyJournal: [{ id: "j1" } as any],
      savedMatingPlans: [{ id: "p1" } as any],
      privateSaleOffers: [{ id: "o1", fromStableId: "other" } as any],
      reservedHorseNames: [{ name: "Secret" } as any],
      solvencyTier: "insolvent",
      engineRevision: 42,
      engineGeneration: 7,
    });

    const obs = buildNpcObservation(state, stable.id);

    expect(obs.inbox).toEqual([]);
    expect(obs.scoutReports).toEqual([]);
    expect(obs.transactions).toEqual([]);
    expect(obs.expenses).toEqual([]);
    expect(obs.pendingIntents).toEqual([]);
    expect(obs.campaigns).toEqual([]);
    expect(obs.playerBiddingHistory).toEqual([]);
    expect(obs.strategyJournal).toBeUndefined();
    expect(obs.savedMatingPlans).toEqual([]);
    expect(obs.privateSaleOffers).toEqual([]);
    expect(obs.reservedHorseNames).toEqual([]);
    expect(obs.solvencyTier).toBeUndefined();
    expect(obs.engineRevision).toBeUndefined();
    expect(obs.engineGeneration).toBeUndefined();
    expect(obs.execution).toBeUndefined();
  });

  it("replaces exact player cash with a bounded public estimate", () => {
    const state = makeState({ cash: 1_000_000, reputation: { score: 400 } as any });
    const obs = buildPublicWorldView(state);
    expect(obs.cash).not.toBe(1_000_000);
    expect(obs.cash).toBe(estimatePublicPlayerCash(state));
    expect(obs.cash).toBeGreaterThan(0);
  });

  it("hides rival AI state but keeps the acting stable's own", () => {
    const acting = createTestStable({ id: "me" });
    const rival = createTestStable({ id: "rival" });
    const state = makeState({ npcStables: [acting, rival] });
    const manager = {
      stableStates: {
        me: { stableId: "me" },
        rival: { stableId: "rival" },
      },
      globalDay: 5,
      regionalKings: {},
    } as any;
    state.npcAIManager = manager;

    const obs = buildNpcObservation(state, acting.id);
    expect(Object.keys(obs.npcAIManager!.stableStates)).toEqual(["me"]);
    expect(obs.npcAIManager!.stableStates.me).toBe(manager.stableStates.me);
    expect(obs.npcAIManager!.pendingNewsItems).toEqual([]);

    const world = buildPublicWorldView(state);
    expect(Object.keys(world.npcAIManager!.stableStates)).toEqual([]);
  });

  it("estimates rival stable cash and hides rival facilities", () => {
    const acting = createTestStable({ id: "me", cash: 123_456 });
    const rival = createTestStable({ id: "rival", cash: 9_999_999 });
    const facilities = { me: { barnLevel: 3 }, rival: { barnLevel: 9 } } as any;
    const state = makeState({ npcStables: [acting, rival], npcFacilities: facilities });

    const obs = buildNpcObservation(state, acting.id);
    const observedRival = obs.npcStables.find((s) => s.id === "rival")!;
    expect(observedRival.cash).toBe(estimateStableCash(rival));
    expect(observedRival.cash).not.toBe(9_999_999);
    expect(obs.npcStables.find((s) => s.id === "me")!.cash).toBe(123_456);

    expect(Object.keys(obs.npcFacilities!)).toEqual(["me"]);
  });

  it("redacts hidden horse fields for non-owned horses, keeps own horses exact", () => {
    const acting = createTestStable({ id: "me" });
    const mine = createTestHorse({
      id: "mine",
      ownership: { type: "npc", stableId: "me" },
      potential: 91,
      energy: 37,
    });
    const theirs = createTestHorse({
      id: "theirs",
      ownership: { type: "player" },
      potential: 91,
      energy: 37,
      fertility: 0.8,
      fame: 10,
    });
    const state = makeState({
      day: 50,
      npcStables: [acting],
      horses: { mine, theirs } as any,
    });

    const obs = buildNpcObservation(state, acting.id);
    expect(obs.horses["mine" as keyof typeof obs.horses].potential).toBe(91);
    expect(obs.horses["mine" as keyof typeof obs.horses].energy).toBe(37);

    const publicTheirs = obs.horses["theirs" as keyof typeof obs.horses];
    expect(publicTheirs.potential).not.toBe(91);
    expect(publicTheirs.energy).not.toBe(37);
    expect(publicTheirs.fertility).toBeUndefined();
    expect(publicTheirs.geneticMarkers).toBeUndefined();
    // Public surface stays observable.
    expect(publicTheirs.name).toBe(theirs.name);
    expect(publicTheirs.raceHistory).toBe(theirs.raceHistory);
  });

  it("keeps famous horses' stats exact and fuzzes unknown horses deterministically", () => {
    const famous = createTestHorse({ id: "famous-1", fame: 90 });
    famous.stats = { ...famous.stats, speed: 77 };
    const obscure = createTestHorse({ id: "obscure-1", fame: 5 });
    obscure.stats = { ...obscure.stats, speed: 77 };

    const famousView = publicHorseView(famous, 10);
    expect(famousView.stats.speed).toBe(77);

    const a = publicHorseView(obscure, 10);
    const b = publicHorseView(obscure, 10);
    expect(a.stats.speed).toBe(b.stats.speed);
    expect(a.stats.speed).toBeGreaterThanOrEqual(74);
    expect(a.stats.speed).toBeLessThanOrEqual(80);
  });

  it("is deterministic and reusable across workspaces", () => {
    const stable = createTestStable({ id: "s1" });
    const state = makeState({ npcStables: [stable] });
    const ws = prepareObservationWorkspace(state);
    const a = buildNpcObservation(state, "s1", ws);
    const b = buildNpcObservation(state, "s1", ws);
    expect(a).toEqual(b);
    expect(isNpcObservation(a)).toBe(true);
    expect(isNpcObservation(state)).toBe(false);
    expect(ensureNpcObservation(a, "s1")).toBe(a);
  });

  it("the observation brand does not leak into serialization", () => {
    const state = makeState({ npcStables: [createTestStable({ id: "s1" })] });
    const obs = buildNpcObservation(state, "s1");
    // Brand is a non-enumerable symbol: present for runtime detection,
    // invisible to Object.keys and JSON.stringify (no checksum impact).
    expect(isNpcObservation(obs)).toBe(true);
    expect(Object.getOwnPropertySymbols(obs).length).toBeGreaterThan(0);
    expect(JSON.stringify(obs)).not.toContain("npcObservation");
  });

  it("public world observer sees no stable's private internals", () => {
    const s1 = createTestStable({ id: "a", cash: 100 });
    const s2 = createTestStable({ id: "b", cash: 200 });
    const state = makeState({ npcStables: [s1, s2] });
    const obs = buildNpcObservation(state, PUBLIC_WORLD_OBSERVER);
    expect(obs.npcStables.every((s) => s.cash === estimateStableCash(s))).toBe(true);
  });
});
