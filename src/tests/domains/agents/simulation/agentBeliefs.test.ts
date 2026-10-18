/**
 * Tests for the typed agent belief model: confidence, freshness, bounds,
 * personality variation, and the observation-only source rule.
 */
import { describe, it, expect } from "vitest";
import {
  deriveBeliefs,
  decayBeliefs,
  beliefConfidence,
  beliefFreshnessDays,
  MAX_RIVAL_BELIEFS,
  type AgentBeliefs,
} from "@/domains/agents/simulation/agentBeliefs";
import { buildNpcObservation } from "@/domains/agents/simulation/agentObservation";
import { createInitialState } from "@/platform/game/store/initialization";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { GameState } from "@/platform/game/types";
import type { WorldAssessment } from "@/domains/agents/simulation/strategicCoordinator";

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  Object.assign(base, overrides);
  return base;
}

const assessment: WorldAssessment = {
  playerDominance: 0.4,
  regionalPowerBalance: { US: 1 },
  economicTrends: { studFeeTrend: 5, yearlingPriceIndex: 120, claimingMarketActivity: 10 },
  breedingMarketSaturation: 0.3,
  upcomingMajorRaces: [],
};

describe("agent belief model", () => {
  it("derives typed beliefs with confidence and freshness from an observation", () => {
    const me = createTestStable({ id: "me", personality: "aggressive" });
    const rival = createTestStable({ id: "rival", reputation: 80 });
    const mine = createTestHorse({
      id: "h1",
      ownership: { type: "npc", stableId: "me" },
      age: 4,
    });
    const state = makeState({ day: 40, npcStables: [me, rival], horses: { h1: mine } as any });
    const obs = buildNpcObservation(state, "me");

    const beliefs = deriveBeliefs(obs, me, assessment, 40, "healthy");

    expect(beliefs.updatedDay).toBe(40);
    expect(beliefs.economicOutlook.value).toBeCloseTo(0.4); // (120-100)/50
    expect(beliefs.economicOutlook.source).toBe("observation");
    expect(beliefs.playerDominance.value).toBe(0.4);
    expect(beliefs.self.value.cash).toBe(me.cash);
    expect(beliefs.self.value.rosterSize).toBe(1);
    expect(beliefs.self.confidence).toBe(1);
    expect(beliefs.rivals.rival.value.reputation).toBe(80);
    expect(beliefs.rivals.rival.source).toBe("observation");
  });

  it("decays confidence with belief age", () => {
    const me = createTestStable({ id: "me" });
    const state = makeState({ day: 10, npcStables: [me] });
    const beliefs = deriveBeliefs(buildNpcObservation(state, "me"), me, assessment, 10);

    const fresh = beliefConfidence(beliefs.economicOutlook, 10);
    const stale = beliefConfidence(beliefs.economicOutlook, 40); // one half-life
    const ancient = beliefConfidence(beliefs.economicOutlook, 130); // three half-lives

    expect(fresh).toBeGreaterThan(stale);
    expect(stale).toBeGreaterThan(ancient);
    expect(ancient).toBeGreaterThan(0);
    expect(beliefFreshnessDays(beliefs.economicOutlook, 40)).toBe(30);
  });

  it("produces different belief confidence from identical public state by personality", () => {
    const cautious = createTestStable({ id: "a", personality: "conservative" });
    const bold = createTestStable({ id: "b", personality: "aggressive" });
    const state = makeState({ day: 10, npcStables: [cautious, bold] });
    const obsA = buildNpcObservation(state, "a");
    const obsB = buildNpcObservation(state, "b");

    const beliefsA = deriveBeliefs(obsA, cautious, assessment, 10);
    const beliefsB = deriveBeliefs(obsB, bold, assessment, 10);

    expect(beliefsB.rivals.a.confidence).toBeGreaterThan(beliefsA.rivals.b.confidence);
  });

  it("carries forward rivals absent from the latest observation and bounds the store", () => {
    const me = createTestStable({ id: "me" });
    const rivals = Array.from({ length: 40 }, (_, i) => createTestStable({ id: `rival-${i}` }));
    const state = makeState({ day: 10, npcStables: [me, ...rivals] });
    const obs = buildNpcObservation(state, "me");

    const first = deriveBeliefs(obs, me, assessment, 10);
    expect(Object.keys(first.rivals).length).toBeLessThanOrEqual(MAX_RIVAL_BELIEFS);

    // Second observation drops all rivals — beliefs persist but bounded.
    const emptyState = makeState({ day: 11, npcStables: [me] });
    const second = deriveBeliefs(
      buildNpcObservation(emptyState, "me"),
      me,
      undefined,
      11,
      "healthy",
      first,
    );
    expect(Object.keys(second.rivals).length).toBeLessThanOrEqual(MAX_RIVAL_BELIEFS);
    expect(Object.keys(second.rivals).length).toBeGreaterThan(0);
    expect(second.economicOutlook.source).toBe("inference");
  });

  it("decayBeliefs advances the update day without touching values", () => {
    const me = createTestStable({ id: "me" });
    const state = makeState({ day: 10, npcStables: [me] });
    const beliefs = deriveBeliefs(buildNpcObservation(state, "me"), me, assessment, 10);
    const aged: AgentBeliefs = decayBeliefs(beliefs, 20);
    expect(aged.updatedDay).toBe(20);
    expect(aged.rivals).toBe(beliefs.rivals);
    expect(aged.playerDominance).toBe(beliefs.playerDominance);
  });

  it("is deterministic for identical inputs", () => {
    const me = createTestStable({ id: "me" });
    const rival = createTestStable({ id: "r" });
    const state = makeState({ day: 10, npcStables: [me, rival] });
    const a = deriveBeliefs(buildNpcObservation(state, "me"), me, assessment, 10);
    const b = deriveBeliefs(buildNpcObservation(state, "me"), me, assessment, 10);
    expect(a).toEqual(b);
  });
});
