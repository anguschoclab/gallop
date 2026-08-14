import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateTieBreakFields,
  assertTieBreakFields,
} from "@/core/race/engine/validateTieBreakFields";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    owned: false,
    position: 0,
    velocity: 15,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    barrier: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

describe("validateTieBreakFields", () => {
  it("returns no issues for valid runners with null finishTime", () => {
    const runners = [makeRunner({ horseId: "h1", barrier: 1, finishTime: null })];
    expect(validateTieBreakFields(runners)).toEqual([]);
  });

  it("returns no issues for valid runners with positive finishTime", () => {
    const runners = [makeRunner({ horseId: "h1", barrier: 1, finishTime: 95.5 })];
    expect(validateTieBreakFields(runners)).toEqual([]);
  });

  it("returns no issues for empty runners array", () => {
    expect(validateTieBreakFields([])).toEqual([]);
  });

  it("reports issue for empty string horseId", () => {
    const runners = [makeRunner({ horseId: "" })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("horseId");
  });

  it("reports issue for undefined horseId", () => {
    const runners = [makeRunner({ horseId: undefined as any })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("horseId");
  });

  it("reports issue for NaN barrier", () => {
    const runners = [makeRunner({ barrier: NaN })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("barrier");
  });

  it("reports issue for undefined barrier", () => {
    const runners = [makeRunner({ barrier: undefined as any })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("barrier");
  });

  it("reports issue for barrier of 0", () => {
    const runners = [makeRunner({ barrier: 0 })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("barrier");
  });

  it("reports issue for negative barrier", () => {
    const runners = [makeRunner({ barrier: -1 })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("barrier");
  });

  it("reports issue for Infinity barrier", () => {
    const runners = [makeRunner({ barrier: Infinity })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("barrier");
  });

  it("reports issue for undefined finishTime", () => {
    const runners = [makeRunner({ finishTime: undefined as any })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("finishTime");
  });

  it("reports issue for NaN finishTime", () => {
    const runners = [makeRunner({ finishTime: NaN })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("finishTime");
  });

  it("reports issue for finishTime of 0", () => {
    const runners = [makeRunner({ finishTime: 0 })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("finishTime");
  });

  it("reports issue for negative finishTime", () => {
    const runners = [makeRunner({ finishTime: -5 })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("finishTime");
  });

  it("reports issue for Infinity finishTime", () => {
    const runners = [makeRunner({ finishTime: Infinity })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("finishTime");
  });

  it("reports all issues when a runner has multiple problems", () => {
    const runners = [makeRunner({ horseId: "", barrier: NaN, finishTime: -1 })];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(3);
    expect(issues.map((i: { field: string }) => i.field)).toEqual([
      "horseId",
      "barrier",
      "finishTime",
    ]);
  });

  it("collects issues across multiple runners", () => {
    const runners = [
      makeRunner({ horseId: "a", barrier: 0 }),
      makeRunner({ horseId: "b", finishTime: NaN }),
    ];
    const issues = validateTieBreakFields(runners);
    expect(issues).toHaveLength(2);
    expect(issues[0].horseId).toBe("a");
    expect(issues[0].field).toBe("barrier");
    expect(issues[1].horseId).toBe("b");
    expect(issues[1].field).toBe("finishTime");
  });
});

describe("assertTieBreakFields", () => {
  let originalDev: boolean | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalDev = (import.meta.env as any).DEV;
    originalNodeEnv = process.env.NODE_ENV;
    (import.meta.env as any).DEV = true;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    (import.meta.env as any).DEV = originalDev;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not throw for valid runners", () => {
    const runners = [makeRunner({ horseId: "h1", barrier: 1, finishTime: null })];
    expect(() => assertTieBreakFields(runners)).not.toThrow();
  });

  it("throws in dev mode when runners have issues", () => {
    const runners = [makeRunner({ horseId: "", barrier: NaN })];
    expect(() => assertTieBreakFields(runners)).toThrow();
  });

  it("does not throw in production mode", () => {
    (import.meta.env as any).DEV = false;
    process.env.NODE_ENV = "production";
    const runners = [makeRunner({ horseId: "", barrier: NaN })];
    expect(() => assertTieBreakFields(runners)).not.toThrow();
  });

  it("includes context label in error message", () => {
    const runners = [makeRunner({ horseId: "" })];
    try {
      assertTieBreakFields(runners, "useLeaderboardState");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("useLeaderboardState");
    }
  });

  it("includes issue count in error message", () => {
    const runners = [makeRunner({ horseId: "", barrier: NaN, finishTime: -1 })];
    try {
      assertTieBreakFields(runners, "test");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("3");
    }
  });
});
