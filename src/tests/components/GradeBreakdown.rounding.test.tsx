import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GradeBreakdown } from "@/components/race/GradeBreakdown";
import type { Race, Horse } from "@/game/types";

function mkHorse(id: string, speed: number, acceleration: number): Horse {
  return {
    id,
    name: `Horse-${id}`,
    stats: { speed, acceleration, stamina: 50, temperament: 40, conformation: 35, consistency: 30 },
  } as unknown as Horse;
}

function mkRace(id: string, grade: string, horseId: string): Race {
  return {
    id,
    name: `Race-${id}`,
    day: 10,
    resolved: false,
    graded: { grade, track: "Test", surface: "Turf" },
    entries: [{ horseId, owned: true }],
  } as unknown as Race;
}

describe("GradeBreakdown — projection rounding", () => {
  it("displays rounded projection value", () => {
    const horse = mkHorse("h1", 50.7, 40.3);
    const race = mkRace("r1", "G1", "h1");

    const { container } = render(<GradeBreakdown races={[race]} horses={[horse]} day={1} />);

    const text = container.textContent ?? "";
    // 50.7 + 40.3 = 91.0 → Math.round → 91
    expect(text).toContain("~91 Beyer");
    expect(text).not.toContain("~91.0");
    expect(text).not.toContain("~90.999");
  });
});
