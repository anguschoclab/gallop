import { describe, it, expect } from "vitest";
import { calculateBeyerProjections, formatProjectionMessage } from "@/core/race/projections";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(id: string, speed = 70, stamina = 70, acceleration = 70, consistency = 70): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    age: 4,
    stats: { speed, stamina, acceleration, consistency, temperament: 50, conformation: 50 },
    energy: 100,
    form: 0,
    potential: 80,
    owned: false,
    fame: 0,
  });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: overrides.distance ?? 1600,
    raceClass: "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  };
}

describe("calculateBeyerProjections", () => {
  const h1 = mkHorse("h1");
  const h2 = mkHorse("h2");
  const h3 = mkHorse("h3");
  const horses = [h1, h2, h3];

  it("only returns projections for owned horse IDs", () => {
    const owned = new Set(["h1", "h3"]);
    const result = calculateBeyerProjections(horses, mkRace(), owned);
    expect(result.map((p) => p.horseId)).toEqual(expect.arrayContaining(["h1", "h3"]));
    expect(result.map((p) => p.horseId)).not.toContain("h2");
  });

  it("returns empty array when no horses are in ownedHorseIds", () => {
    const result = calculateBeyerProjections(horses, mkRace(), new Set());
    expect(result).toHaveLength(0);
  });

  it("projections include horseName and expectedBeyer", () => {
    const result = calculateBeyerProjections([h1], mkRace(), new Set(["h1"]));
    expect(result[0].horseName).toBe("Horse h1");
    expect(typeof result[0].expectedBeyer).toBe("number");
  });

  it("distance ≥ 1600 gives higher beyer than distance < 1200 (other factors equal)", () => {
    const [longDist] = calculateBeyerProjections([h1], mkRace({ distance: 1600 }), new Set(["h1"]));
    const [shortDist] = calculateBeyerProjections(
      [h1],
      mkRace({ distance: 1000 }),
      new Set(["h1"]),
    );
    expect(longDist.expectedBeyer).toBeGreaterThan(shortDist.expectedBeyer);
  });

  it("distance ≥ 1200 and < 1600 gives intermediate beyer", () => {
    const [long] = calculateBeyerProjections([h1], mkRace({ distance: 1600 }), new Set(["h1"]));
    const [mid] = calculateBeyerProjections([h1], mkRace({ distance: 1200 }), new Set(["h1"]));
    const [short] = calculateBeyerProjections([h1], mkRace({ distance: 1000 }), new Set(["h1"]));
    expect(mid.expectedBeyer).toBeGreaterThan(short.expectedBeyer);
    expect(mid.expectedBeyer).toBeLessThan(long.expectedBeyer);
  });

  it("G1 grade gives higher beyer than no grade (class bonus)", () => {
    const [graded] = calculateBeyerProjections(
      [h1],
      mkRace({ graded: { key: "k", grade: "G1", track: "T", trackId: "t1", surface: "Turf" } }),
      new Set(["h1"]),
    );
    const [ungraded] = calculateBeyerProjections([h1], mkRace(), new Set(["h1"]));
    expect(graded.expectedBeyer).toBeGreaterThan(ungraded.expectedBeyer);
  });
});

describe("formatProjectionMessage", () => {
  it("empty array → 'No horses entered.'", () => {
    expect(formatProjectionMessage([])).toBe("No horses entered.");
  });

  it("all non-owned projections → 'No owned horses entered.'", () => {
    const projections = [{ horseId: "h1", horseName: "H1", expectedBeyer: 80, isOwned: false }];
    expect(formatProjectionMessage(projections)).toBe("No owned horses entered.");
  });

  it("owned projection → includes horse name and beyer figure", () => {
    const projections = [
      { horseId: "h1", horseName: "Thunder Star", expectedBeyer: 85, isOwned: true },
    ];
    const msg = formatProjectionMessage(projections);
    expect(msg).toContain("Thunder Star");
    expect(msg).toContain("85");
    expect(msg).toContain("Beyer");
  });

  it("multiple owned projections → all included", () => {
    const projections = [
      { horseId: "h1", horseName: "Alpha", expectedBeyer: 80, isOwned: true },
      { horseId: "h2", horseName: "Bravo", expectedBeyer: 90, isOwned: true },
    ];
    const msg = formatProjectionMessage(projections);
    expect(msg).toContain("Alpha");
    expect(msg).toContain("Bravo");
  });
});
