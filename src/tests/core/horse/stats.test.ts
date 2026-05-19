import { describe, it, expect } from "vitest";
import { calculateOverallRating, getAbility, abilityGrade } from "@/core/horse/stats";
import type { Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(
  speed: number,
  stamina: number,
  acceleration: number,
  consistency: number,
  potential = 80,
): Horse {
  return createTestHorse({
    id: "h",
    name: "Test",
    age: 4,
    stats: { speed, stamina, acceleration, consistency, temperament: 50, conformation: 50 },
    energy: 100,
    form: 0,
    potential,
    raceHistory: [],
    owned: false,
    fame: 0,
  });
}

describe("calculateOverallRating", () => {
  it("all-60 → 60", () => expect(calculateOverallRating(mkHorse(60, 60, 60, 60))).toBe(60));
  it("60+70+80+90 → 75", () => expect(calculateOverallRating(mkHorse(60, 70, 80, 90))).toBe(75));
  it("rounds correctly — 61+62+63+64 = 250/4 = 62.5 → 63", () =>
    expect(calculateOverallRating(mkHorse(61, 62, 63, 64))).toBe(63));
  it("all-100 → 100", () => expect(calculateOverallRating(mkHorse(100, 100, 100, 100))).toBe(100));
  it("all-1 → 1", () => expect(calculateOverallRating(mkHorse(1, 1, 1, 1))).toBe(1));
});

describe("getAbility", () => {
  it("returns current = overall rating and potential = horse.potential", () => {
    const h = mkHorse(80, 80, 80, 80, 90);
    const { current, potential } = getAbility(h);
    expect(current).toBe(calculateOverallRating(h));
    expect(potential).toBe(90);
  });

  it("current updates with stats", () => {
    const h = mkHorse(50, 50, 50, 50, 70);
    expect(getAbility(h).current).toBe(50);
  });
});

describe("abilityGrade", () => {
  it("90 → S", () => expect(abilityGrade(90)).toBe("S"));
  it("89 → A", () => expect(abilityGrade(89)).toBe("A"));
  it("80 → A", () => expect(abilityGrade(80)).toBe("A"));
  it("79 → B", () => expect(abilityGrade(79)).toBe("B"));
  it("70 → B", () => expect(abilityGrade(70)).toBe("B"));
  it("69 → C", () => expect(abilityGrade(69)).toBe("C"));
  it("60 → C", () => expect(abilityGrade(60)).toBe("C"));
  it("59 → D", () => expect(abilityGrade(59)).toBe("D"));
  it("50 → D", () => expect(abilityGrade(50)).toBe("D"));
  it("49 → F", () => expect(abilityGrade(49)).toBe("F"));
  it("0 → F", () => expect(abilityGrade(0)).toBe("F"));
  it("100 → S", () => expect(abilityGrade(100)).toBe("S"));
});
