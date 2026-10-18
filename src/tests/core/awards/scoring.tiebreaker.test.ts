import { describe, it, expect } from "vitest";
import { determineRegionalWinners } from "@/domains/awards/simulation/scoring";
import type { Horse, Race } from "@/platform/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkRace(
  id: string,
  track: string,
  surface: "Dirt" | "Turf" | "Synthetic",
  distance: number,
  day: number = 100,
  grade: string = "G1",
): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance,
    raceClass: "Graded",
    entryFee: 500,
    purse: 1000000,
    minStat: 80,
    fieldSize: 8,
    entries: [],
    resolved: true,
    graded: {
      key: `key-${id}`,
      grade: grade as any,
      track,
      trackId: `track-${id}`,
      surface,
    },
  } as Race;
}

function mkHorse(
  id: string,
  raceHistory: Horse["raceHistory"],
  age: number = 3,
  gender: "colt" | "filly" | "mare" | "horse" = "colt",
): Horse {
  return createTestHorse({ id, name: `Horse ${id}`, age, gender, raceHistory });
}

type HistorySpec = {
  raceId: string;
  position: number;
  day?: number;
  grade?: string;
  beyer?: number;
  purse?: number;
  purseEarned?: number;
  distance?: number;
  surface?: string;
};

function history(specs: HistorySpec[]): Horse["raceHistory"] {
  return specs.map((s) => ({
    raceId: s.raceId,
    raceName: `Race ${s.raceId}`,
    position: s.position,
    day: s.day ?? 100,
    beyer: s.beyer,
    grade: s.grade as any,
    distance: s.distance ?? 2000,
    surface: s.surface ?? "Dirt",
    purse: s.purse,
    purseEarned: s.purseEarned,
    fieldSize: 8,
  }));
}

function hotyWinner(horses: Horse[], raceMap: Map<string, Race>) {
  return determineRegionalWinners(horses, 1, "north_america", raceMap).find(
    (w) => w.category === "horse_of_the_year",
  );
}

describe("determineRegionalWinners - deterministic tiebreakers", () => {
  // Chain: points desc -> graded wins desc -> earnings desc -> horseId asc.
  // Every case asserts identical results for both input orderings, since
  // determinism relative to game state (not array insertion order) is the fix.

  it("breaks tied points on earnings regardless of insertion order", () => {
    const race1 = mkRace("r1", "Churchill Downs", "Dirt", 2000, 100, "G1");
    const race2 = mkRace("r2", "Churchill Downs", "Dirt", 2000, 110, "G1");
    const raceMap = new Map([
      [race1.id, race1],
      [race2.id, race2],
    ]);

    // Identical points (G1 Win + 115 Beyer = 16) and identical graded wins (1).
    const h1 = mkHorse(
      "h1",
      history([{ raceId: "r1", position: 1, grade: "G1", beyer: 115, purse: 1000000, day: 100 }]),
    );
    const h2 = mkHorse(
      "h2",
      history([{ raceId: "r2", position: 1, grade: "G1", beyer: 115, purse: 5000000, day: 110 }]),
    );

    const forward = hotyWinner([h1, h2], raceMap);
    expect(forward?.points).toBe(16);
    expect(forward?.runnerUpPoints).toBe(16);
    expect(forward?.horseId).toBe("h2"); // Higher earnings wins
    expect(forward?.runnerUpId).toBe("h1");

    const reverse = hotyWinner([h2, h1], raceMap);
    expect(reverse?.points).toBe(16);
    expect(reverse?.runnerUpPoints).toBe(16);
    expect(reverse?.horseId).toBe("h2"); // Same outcome in reverse order
    expect(reverse?.runnerUpId).toBe("h1");
  });

  it("breaks tied points on graded wins before earnings", () => {
    const r1 = mkRace("r1", "Churchill Downs", "Dirt", 2000, 100, "G2");
    const r2 = mkRace("r2", "Churchill Downs", "Dirt", 2000, 110, "G2");
    const r3 = mkRace("r3", "Churchill Downs", "Dirt", 2000, 100, "G1");
    const r4 = mkRace("r4", "Churchill Downs", "Dirt", 2000, 110, "G1");
    const raceMap = new Map([
      [r1.id, r1],
      [r2.id, r2],
      [r3.id, r3],
      [r4.id, r4],
    ]);

    // h-multi: two G2 wins = 12 pts, 2 graded wins, modest earnings.
    const hMulti = mkHorse(
      "h-multi",
      history([
        { raceId: "r1", position: 1, grade: "G2", purse: 100000, day: 100 },
        { raceId: "r2", position: 1, grade: "G2", purse: 100000, day: 110 },
      ]),
    );
    // h-rich: one G1 win + one G1 place = 12 pts, 1 graded win, huge earnings.
    const hRich = mkHorse(
      "h-rich",
      history([
        { raceId: "r3", position: 1, grade: "G1", purse: 50000000, day: 100 },
        { raceId: "r4", position: 2, grade: "G1", purse: 5000000, day: 110 },
      ]),
    );

    const forward = hotyWinner([hMulti, hRich], raceMap);
    expect(forward?.points).toBe(12);
    expect(forward?.runnerUpPoints).toBe(12);
    expect(forward?.horseId).toBe("h-multi"); // 2 graded wins beats richer earnings
    expect(forward?.runnerUpId).toBe("h-rich");

    const reverse = hotyWinner([hRich, hMulti], raceMap);
    expect(reverse?.horseId).toBe("h-multi");
    expect(reverse?.runnerUpId).toBe("h-rich");
  });

  it("prefers purseEarned over purse and honors an explicit zero", () => {
    const r1 = mkRace("r1", "Churchill Downs", "Dirt", 2000, 100, "G1");
    const r2 = mkRace("r2", "Churchill Downs", "Dirt", 2000, 110, "G1");
    const raceMap = new Map([
      [r1.id, r1],
      [r2.id, r2],
    ]);

    // h-zero: explicit purseEarned 0 must NOT fall back to its 5M purse.
    const hZero = mkHorse(
      "h-zero",
      history([
        {
          raceId: "r1",
          position: 1,
          grade: "G1",
          beyer: 115,
          purseEarned: 0,
          purse: 5000000,
          day: 100,
        },
      ]),
    );
    // h-one: purseEarned 1 beats h-zero's 0 despite the far smaller purse.
    const hOne = mkHorse(
      "h-one",
      history([
        {
          raceId: "r2",
          position: 1,
          grade: "G1",
          beyer: 115,
          purseEarned: 1,
          purse: 1000000,
          day: 110,
        },
      ]),
    );

    const forward = hotyWinner([hZero, hOne], raceMap);
    expect(forward?.points).toBe(16);
    expect(forward?.horseId).toBe("h-one");
    expect(forward?.runnerUpId).toBe("h-zero");

    const reverse = hotyWinner([hOne, hZero], raceMap);
    expect(reverse?.horseId).toBe("h-one");
    expect(reverse?.runnerUpId).toBe("h-zero");
  });

  it("falls back to horseId when points, graded wins, and earnings all tie", () => {
    const r1 = mkRace("r1", "Churchill Downs", "Dirt", 2000, 100, "G1");
    const r2 = mkRace("r2", "Churchill Downs", "Dirt", 2000, 110, "G1");
    const raceMap = new Map([
      [r1.id, r1],
      [r2.id, r2],
    ]);

    const h1 = mkHorse(
      "h1",
      history([{ raceId: "r1", position: 1, grade: "G1", beyer: 115, purse: 1000000, day: 100 }]),
    );
    const h2 = mkHorse(
      "h2",
      history([{ raceId: "r2", position: 1, grade: "G1", beyer: 115, purse: 1000000, day: 110 }]),
    );

    const forward = hotyWinner([h1, h2], raceMap);
    expect(forward?.points).toBe(16);
    expect(forward?.horseId).toBe("h1"); // "h1" < "h2" lexicographically
    expect(forward?.runnerUpId).toBe("h2");

    const reverse = hotyWinner([h2, h1], raceMap);
    expect(reverse?.horseId).toBe("h1"); // Same outcome in reverse order
    expect(reverse?.runnerUpId).toBe("h2");
  });
});
