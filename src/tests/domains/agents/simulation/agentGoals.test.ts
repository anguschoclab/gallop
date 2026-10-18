/**
 * Tests for multi-horizon agent goals: derivation, ranking, invalidation,
 * repair, persistence of surviving goals, and bounded history.
 */
import { describe, it, expect } from "vitest";
import {
  deriveAgentGoals,
  repairAgentGoals,
  ACTION_GOAL_MAP,
  GOAL_HORIZON_DAYS,
  MAX_GOALS_PER_HORIZON,
  NPC_ACTION_GOAL_COMPATIBILITY,
  type AgentGoal,
  type GoalContext,
} from "@/domains/agents/simulation/agentGoals";
import { NPC_ACTION_REGISTRY } from "@/domains/agents/simulation/npcActionRegistry";
import { buildNpcObservation } from "@/domains/agents/simulation/agentObservation";
import { createInitialState } from "@/game/store/initialization";
import { createTestStable } from "@/tests/helpers/createTestStable";
import type { GameState } from "@/game/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  Object.assign(base, overrides);
  return base;
}

function makeContext(overrides: Partial<GoalContext> = {}): GoalContext {
  const stable = overrides.stable ?? createTestStable({ id: "s1" });
  const state = makeState({ day: overrides.day ?? 10, npcStables: [stable] });
  return {
    observation: buildNpcObservation(state, stable.id),
    stable,
    distressLevel: "healthy",
    ownedHorseCount: 3,
    eligibleHorseCount: 2,
    day: 10,
    ...overrides,
  };
}

describe("multi-horizon agent goals", () => {
  it("derives ranked goals across short, medium, and long horizons", () => {
    const goals = deriveAgentGoals(makeContext());
    const horizons = new Set(goals.map((g) => g.horizon));
    expect(horizons).toEqual(new Set(["short", "medium", "long"]));

    for (const horizon of ["short", "medium", "long"] as const) {
      const inHorizon = goals.filter((g) => g.horizon === horizon);
      expect(inHorizon.length).toBeLessThanOrEqual(MAX_GOALS_PER_HORIZON[horizon]);
      expect(inHorizon.length).toBeGreaterThan(0);
      // Ranks are 1-based and contiguous within the horizon.
      expect(inHorizon.map((g) => g.rank).sort()).toEqual(inHorizon.map((_, i) => i + 1));
      // Scores are non-increasing down the ranking.
      for (let i = 1; i < inHorizon.length; i++) {
        expect(inHorizon[i - 1].score).toBeGreaterThanOrEqual(inHorizon[i].score);
      }
    }
    for (const g of goals) {
      expect(g.status).toBe("active");
      expect(g.validUntilDay).toBe(10 + GOAL_HORIZON_DAYS[g.horizon]);
    }
  });

  it("is deterministic for identical inputs", () => {
    const a = deriveAgentGoals(makeContext());
    const b = deriveAgentGoals(makeContext());
    expect(a).toEqual(b);
  });

  it("produces different goal rankings by personality", () => {
    const breeder = deriveAgentGoals(
      makeContext({ stable: createTestStable({ id: "b", personality: "breeder" }) }),
    );
    const aggressive = deriveAgentGoals(
      makeContext({ stable: createTestStable({ id: "a", personality: "aggressive" }) }),
    );
    const score = (goals: AgentGoal[], type: string) =>
      goals.find((g) => g.type === type)?.score ?? 0;
    expect(score(breeder, "grow_breeding_program")).toBeGreaterThan(
      score(aggressive, "grow_breeding_program"),
    );
    expect(score(aggressive, "compete")).toBeGreaterThan(score(breeder, "compete"));
  });

  it("prioritizes financial goals when distressed", () => {
    const goals = deriveAgentGoals(makeContext({ distressLevel: "critical" }));
    const stabilize = goals.find((g) => g.type === "stabilize_finances");
    expect(stabilize).toBeDefined();
    expect(stabilize!.horizon).toBe("short");
    expect(stabilize!.rank).toBe(1);
    // Long-horizon ambition is suppressed under distress.
    expect(goals.filter((g) => g.horizon === "long")).toHaveLength(0);
  });

  it("invalidates goals whose enabling condition disappears and repairs the set", () => {
    const ctx = makeContext({ day: 10 });
    const initial = deriveAgentGoals(ctx);
    expect(initial.some((g) => g.type === "compete" && g.status === "active")).toBe(true);

    // Next day: no eligible horses → compete invalidates; surviving goals keep identity.
    const repaired = repairAgentGoals(initial, makeContext({ day: 11, eligibleHorseCount: 0 }));
    const compete = repaired.find((g) => g.type === "compete")!;
    expect(compete.status).toBe("invalidated");
    expect(compete.invalidationReason).toBe("no_eligible_horses");
    expect(compete.createdDay).toBe(10); // history retains origin

    const training = repaired.find((g) => g.type === "condition_roster")!;
    expect(training.status).toBe("active");
    expect(training.createdDay).toBe(10); // surviving goal keeps its age
  });

  it("marks stabilize/liquidate goals achieved (not invalidated) when solvency returns", () => {
    const distressedStable = createTestStable({ id: "s1", cash: 10_000 });
    const initial = deriveAgentGoals(
      makeContext({ stable: distressedStable, distressLevel: "warning" }),
    );
    expect(initial.some((g) => g.type === "stabilize_finances")).toBe(true);

    const recovered = createTestStable({ id: "s1", cash: 500_000 });
    const repaired = repairAgentGoals(
      initial,
      makeContext({ stable: recovered, distressLevel: "healthy", day: 11 }),
    );
    const stabilize = repaired.find((g) => g.type === "stabilize_finances")!;
    expect(stabilize.status).toBe("achieved");
  });

  it("expires goals past their horizon and re-derives replacements", () => {
    const initial = deriveAgentGoals(makeContext({ day: 10 }));
    const later = repairAgentGoals(initial, makeContext({ day: 200 }));
    for (const g of initial) {
      const after = later.find((x) => x.id === g.id && x.createdDay === g.createdDay);
      // Every original goal is expired (invalidated) by day 200; fresh
      // replacements may share the type but get a new createdDay.
      if (after) expect(after.status).not.toBe("active");
    }
    expect(later.some((g) => g.status === "active")).toBe(true);
  });

  it("returns the same reference when nothing changed (identity stability)", () => {
    const ctx = makeContext({ day: 10 });
    const goals = deriveAgentGoals(ctx);
    const same = repairAgentGoals(goals, ctx);
    expect(same).toBe(goals);
  });

  it("bounds closed-goal history", () => {
    const stable = createTestStable({ id: "s1" });
    const state = makeState({ day: 1, npcStables: [stable] });
    const observation = buildNpcObservation(state, "s1");
    const base = {
      observation,
      stable,
      distressLevel: "healthy" as const,
      ownedHorseCount: 3,
    };
    let goals = deriveAgentGoals({ ...base, day: 1, eligibleHorseCount: 2 });
    // Drive invalidations over many days by toggling eligibility.
    for (let day = 2; day <= 60; day++) {
      goals = repairAgentGoals(goals, {
        ...base,
        day,
        eligibleHorseCount: day % 2 === 0 ? 2 : 0,
      });
    }
    const closed = goals.filter((g) => g.status !== "active");
    expect(closed.length).toBeLessThanOrEqual(16);
  });

  it("every registered action maps to a goal type it can serve", () => {
    for (const action of NPC_ACTION_REGISTRY) {
      expect(ACTION_GOAL_MAP[action.id]).toBeTruthy();
      expect(NPC_ACTION_GOAL_COMPATIBILITY[action.id]).toContain(ACTION_GOAL_MAP[action.id]);
    }
    // Coverage: the goal types a healthy stable derives are servable by actions.
    const goals = deriveAgentGoals(makeContext());
    const mapped = new Set(Object.values(ACTION_GOAL_MAP));
    for (const g of goals) expect(mapped.has(g.type)).toBe(true);
  });
});
