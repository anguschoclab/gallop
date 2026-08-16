import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateProjectedBeyer } from "@/core/race/beyerProjections";
import { createTestHorse } from "@/tests/helpers";
import type { Race } from "@/core/race/types";
import { calculateClassBonus } from "@/core/common/classBonus";
import { expectedBeyer } from "@/core/race/beyer";
import { getCourseForRace } from "@/data/tracks";

vi.mock("@/core/common/classBonus", () => ({
  calculateClassBonus: vi.fn(() => 5),
}));

vi.mock("@/core/race/beyer", () => ({
  expectedBeyer: vi.fn(() => 100),
}));

vi.mock("@/data/tracks", () => ({
  getCourseForRace: vi.fn(() => ({ name: "Mock Track" })),
}));

function createTestHorseBase() {
  return createTestHorse({
    stats: {
      speed: 80,
      stamina: 80,
      acceleration: 80,
      consistency: 80,
      temperament: 50,
      conformation: 50,
    },
    energy: 100,
    form: 10,
    raceHistory: [],
  });
}

function createTestRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 0,
    purse: 100000,
    fieldSize: 2,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("calculateProjectedBeyer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates a projected beyer without recent history", () => {
    const horse = createTestHorseBase();
    const race = createTestRace({ distance: 1600, raceClass: "Group" });
    const projected = calculateProjectedBeyer(horse, race);

    // Model base is mocked as 100
    // distance bonus for 1600 is 5
    // blended = 100
    // result = 100 + 5 = 105

    expect(projected).toBe(105);
    expect(calculateClassBonus).toHaveBeenCalled();
    expect(expectedBeyer).toHaveBeenCalled();
    expect(getCourseForRace).toHaveBeenCalled();
  });

  it("blends recent history if available (max 3 races)", () => {
    const horse = createTestHorseBase();
    horse.raceHistory = [{ beyer: 120 }, { beyer: 130 }] as any;

    const race = createTestRace({ distance: 1000, raceClass: "Group" });
    const projected = calculateProjectedBeyer(horse, race);

    // avg recent = (120 + 130) / 2 = 125
    // blended = 100 * 0.6 + 125 * 0.4 = 60 + 50 = 110
    // distance bonus for 1000 is 0
    // result = 110 + 0 = 110
    expect(projected).toBe(110);
  });

  it("ignores non-beyer races in recent history", () => {
    const horse = createTestHorseBase();
    horse.raceHistory = [{ beyer: undefined }, { beyer: 130 }] as any;

    const race = createTestRace({ distance: 1000, raceClass: "Group" });
    const projected = calculateProjectedBeyer(horse, race);

    // recent length = 2 (slices first 3), but filters for typeof b === "number"
    // wait, slice(0,3) happens BEFORE filter, so it looks at first 3 races, then filters out undefined.
    // avg recent = 130 / 1 = 130
    // blended = 100 * 0.6 + 130 * 0.4 = 60 + 52 = 112

    expect(projected).toBe(112);
  });

  it("adds distance bonus correctly based on distance thresholds", () => {
    const horse = createTestHorseBase();

    // Model base is mocked as 100

    const raceShort = createTestRace({ distance: 1000 });
    const projShort = calculateProjectedBeyer(horse, raceShort);
    expect(projShort).toBe(100); // +0

    const raceMed = createTestRace({ distance: 1200 });
    const projMed = calculateProjectedBeyer(horse, raceMed);
    expect(projMed).toBe(102); // +2

    const raceLong = createTestRace({ distance: 1600 });
    const projLong = calculateProjectedBeyer(horse, raceLong);
    expect(projLong).toBe(105); // +5
  });

  it("passes calibratedPars to the model calculation", () => {
    const horse = createTestHorseBase();
    const race = createTestRace({ distance: 1600, raceClass: "Group" });
    const calibratedPars = { 1600: 95 };
    calculateProjectedBeyer(horse, race, calibratedPars);

    expect(expectedBeyer).toHaveBeenCalledWith(
      horse,
      race.distance,
      5,
      { name: "Mock Track" },
      calibratedPars,
    );
  });
});
