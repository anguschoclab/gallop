import { describe, it, expect } from "vitest";
import {
  createTrainingAIState,
  shouldTrainToday,
  getPeriodizedFocus,
  detectOvertraining,
  shouldDoMaintenanceTraining,
  getFacilityTrainingMultiplier,
  type HorseTrainingTrack,
} from "@/core/ai/trainingAI";
import type { Horse, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    ...overrides,
  });
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    cash: 100000,
    personality: "developer",
    ...overrides,
  });
}

describe("getPeriodizedFocus", () => {
  const horse = createMockHorse();

  it("returns balanced when no upcoming race", () => {
    expect(getPeriodizedFocus(horse, null)).toBe("balanced");
  });

  it("returns speed for sprint races (< 1400m)", () => {
    expect(getPeriodizedFocus(horse, 1200)).toBe("speed");
  });

  it("returns acceleration for middle distance (1400-1800m)", () => {
    expect(getPeriodizedFocus(horse, 1600)).toBe("acceleration");
  });

  it("returns stamina for stayer races (> 1800m)", () => {
    expect(getPeriodizedFocus(horse, 2200)).toBe("stamina");
  });
});

describe("detectOvertraining", () => {
  it("detects overtraining when energy is critically low", () => {
    const horse = createMockHorse({ energy: 15 });
    expect(detectOvertraining(horse, undefined)).toBe(true);
  });

  it("does not flag overtraining when energy is adequate", () => {
    const horse = createMockHorse({ energy: 60 });
    expect(detectOvertraining(horse, undefined)).toBe(false);
  });

  it("detects declining energy pattern in training history", () => {
    const horse = createMockHorse({ energy: 25 });
    const devTrack: HorseTrainingTrack = {
      horseId: "horse-1",
      targetStats: ["speed"],
      currentFocus: "speed",
      trainingHistory: [
        { day: 10, type: "speed", energyBefore: 40, energyAfter: 28 },
        { day: 12, type: "speed", energyBefore: 28, energyAfter: 22 },
        { day: 14, type: "speed", energyBefore: 22, energyAfter: 18 },
      ],
      statGains: {},
      lastTrainingDay: 14,
    };
    expect(detectOvertraining(horse, devTrack)).toBe(true);
  });

  it("does not flag overtraining when energy is recovering", () => {
    const horse = createMockHorse({ energy: 50 });
    const devTrack: HorseTrainingTrack = {
      horseId: "horse-1",
      targetStats: ["speed"],
      currentFocus: "speed",
      trainingHistory: [
        { day: 10, type: "speed", energyBefore: 30, energyAfter: 25 },
        { day: 12, type: "speed", energyBefore: 40, energyAfter: 35 },
        { day: 14, type: "speed", energyBefore: 50, energyAfter: 45 },
      ],
      statGains: {},
      lastTrainingDay: 14,
    };
    expect(detectOvertraining(horse, devTrack)).toBe(false);
  });
});

describe("shouldDoMaintenanceTraining", () => {
  const horse = createMockHorse();

  it("returns true when race is within 3 days", () => {
    expect(shouldDoMaintenanceTraining(horse, 2)).toBe(true);
  });

  it("returns false when race is more than 3 days away", () => {
    expect(shouldDoMaintenanceTraining(horse, 7)).toBe(false);
  });

  it("returns false when no upcoming race", () => {
    expect(shouldDoMaintenanceTraining(horse, null)).toBe(false);
  });
});

describe("getFacilityTrainingMultiplier", () => {
  it("returns 1.0 for level 1 facility", () => {
    expect(getFacilityTrainingMultiplier(1)).toBe(1.0);
  });

  it("returns higher multiplier for higher-level facilities", () => {
    expect(getFacilityTrainingMultiplier(3)).toBeGreaterThan(1.0);
  });

  it("caps at 1.4 for level 5+", () => {
    expect(getFacilityTrainingMultiplier(5)).toBe(1.4);
    expect(getFacilityTrainingMultiplier(10)).toBe(1.4);
  });
});

describe("shouldTrainToday", () => {
  it("does not train when energy is too low", () => {
    const stable = createMockStable();
    const state = createTrainingAIState(stable);
    const horse = createMockHorse({ energy: 10 });
    expect(shouldTrainToday(state, horse, 100)).toBe(false);
  });

  it("trains when energy is adequate and no recent training", () => {
    const stable = createMockStable();
    const state = createTrainingAIState(stable);
    const horse = createMockHorse({ energy: 80 });
    expect(shouldTrainToday(state, horse, 100)).toBe(true);
  });
});
