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

describe("GradeBreakdown — multi-grade owned entries", () => {
  it("correctly counts owned entries per grade", () => {
    const horse1 = mkHorse("h1", 60, 40);
    const horse2 = mkHorse("h2", 55, 35);
    const raceG1 = mkRace("r1", "G1", "h1");
    const raceG2 = mkRace("r2", "G2", "h2");

    const { container } = render(
      <GradeBreakdown races={[raceG1, raceG2]} horses={[horse1, horse2]} day={1} />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("1 entered");
  });

  it("counts only owned entries, not NPC entries", () => {
    const horse = mkHorse("h1", 60, 40);
    const race = {
      ...mkRace("r1", "G1", "h1"),
      entries: [
        { horseId: "h1", owned: true },
        { horseId: "h2", owned: false },
        { horseId: "h3", owned: false },
      ],
    } as unknown as Race;

    const { container } = render(<GradeBreakdown races={[race]} horses={[horse]} day={1} />);

    const text = container.textContent ?? "";
    // Should show 1 owned entry, not 3
    expect(text).toContain("1 entered");
  });
});
