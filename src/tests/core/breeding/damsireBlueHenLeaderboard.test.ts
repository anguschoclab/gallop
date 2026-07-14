import { describe, it, expect } from "bun:test";
import type { Horse } from "@/game/types";
import { computeDamsireLeaderboard } from "@/core/breeding/damsireLeaderboard";
import { computeBlueHenLeaderboard } from "@/core/breeding/blueHenLeaderboard";

function makeHorse(overrides: Partial<Horse> & { id: string; name: string }): Horse {
  return {
    age: 5,
    gender: "colt",
    sireName: "Unknown Sire",
    damName: "Unknown Dam",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    pedigree: { name: "Unknown", generation: 0 },
    raceHistory: [],
    careerStarts: 0,
    careerWins: 0,
    lifetimeEarnings: 0,
    fertility: 0.85,
    fame: 50,
    hemisphere: "Northern",
    distanceAptitude: 1600,
    bloodline: "",
    silk: "#CCCCCC",
    genotype: { speed: 0.7, stamina: 0.7, acceleration: 0.7, consistency: 0.7 },
    energy: 100,
    form: 100,
    ...overrides,
  } as unknown as Horse;
}

function makeRaceEntry(position: number, grade?: string, purse?: number) {
  return {
    raceId: `race-${position}-${Math.random()}`,
    raceName: "Test Race",
    position,
    beyer: 90,
    surface: "Turf",
    distance: 1600,
    grade,
    purse: purse ?? 50000,
    day: 100,
    fieldSize: 10,
    raceClass: "Stakes",
  };
}

describe("damsireLeaderboard", () => {
  it("ranks sires by their daughters' produce", () => {
    const horses: Horse[] = [];

    // Damsire "ds1" has 2 daughters, each with winning foals
    const dam1 = makeHorse({
      id: "dam1",
      name: "Dam 1",
      gender: "filly",
      age: 10,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds1", damId: "gd1" },
    });
    const dam2 = makeHorse({
      id: "dam2",
      name: "Dam 2",
      gender: "filly",
      age: 8,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds1", damId: "gd2" },
    });
    horses.push(dam1, dam2);

    // Grandfoals from dam1 — stakes winners
    for (let i = 0; i < 3; i++) {
      horses.push(
        makeHorse({
          id: `gf1-${i}`,
          name: `Grandfoal 1-${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "dam1" },
          raceHistory: [makeRaceEntry(1, "G3", 100000)],
          lifetimeEarnings: 150000,
        }),
      );
    }

    // Grandfoals from dam2 — G1 winners
    for (let i = 0; i < 2; i++) {
      horses.push(
        makeHorse({
          id: `gf2-${i}`,
          name: `Grandfoal 2-${i}`,
          age: 4,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-y", damId: "dam2" },
          raceHistory: [makeRaceEntry(1, "G1", 500000)],
          lifetimeEarnings: 400000,
        }),
      );
    }

    // Damsire "ds2" has 2 daughters but lower-quality produce
    const dam3 = makeHorse({
      id: "dam3",
      name: "Dam 3",
      gender: "filly",
      age: 9,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds2", damId: "gd3" },
    });
    const dam4 = makeHorse({
      id: "dam4",
      name: "Dam 4",
      gender: "filly",
      age: 7,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds2", damId: "gd4" },
    });
    horses.push(dam3, dam4);

    for (let i = 0; i < 2; i++) {
      horses.push(
        makeHorse({
          id: `gf3-${i}`,
          name: `Grandfoal 3-${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-z", damId: "dam3" },
          raceHistory: [makeRaceEntry(2, undefined, 30000)],
          lifetimeEarnings: 30000,
        }),
      );
    }
    for (let i = 0; i < 2; i++) {
      horses.push(
        makeHorse({
          id: `gf4-${i}`,
          name: `Grandfoal 4-${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-z", damId: "dam4" },
          raceHistory: [makeRaceEntry(3, undefined, 20000)],
          lifetimeEarnings: 20000,
        }),
      );
    }

    const leaderboard = computeDamsireLeaderboard(horses, 100);

    expect(leaderboard.type).toBe("damsire_rankings");
    expect(leaderboard.rankings.length).toBe(2);

    // ds1 should rank higher (G1 + stakes winners, higher earnings)
    expect(leaderboard.rankings[0].damsireId).toBe("ds1");
    expect(leaderboard.rankings[0].metrics.daughtersBred).toBe(2);
    expect(leaderboard.rankings[0].metrics.stakesFoals).toBeGreaterThan(0);
    expect(leaderboard.rankings[0].metrics.g1Foals).toBeGreaterThan(0);
    expect(leaderboard.rankings[0].rank).toBe(1);

    // ds2 should rank lower
    expect(leaderboard.rankings[1].damsireId).toBe("ds2");
    expect(leaderboard.rankings[1].rank).toBe(2);
    expect(leaderboard.rankings[1].value).toBeLessThan(leaderboard.rankings[0].value);
  });

  it("excludes damsires with fewer than 2 daughters bred", () => {
    const horses: Horse[] = [];

    // Only 1 daughter
    const dam = makeHorse({
      id: "dam-solo",
      name: "Solo Dam",
      gender: "filly",
      age: 10,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds-solo", damId: "gd" },
    });
    horses.push(dam);

    horses.push(
      makeHorse({
        id: "gf-solo",
        name: "Solo Grandfoal",
        age: 3,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "dam-solo" },
        raceHistory: [makeRaceEntry(1, "G1", 500000)],
        lifetimeEarnings: 500000,
      }),
    );

    const leaderboard = computeDamsireLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(0);
  });

  it("only counts racing-age grandfoals", () => {
    const horses: Horse[] = [];

    const dam1 = makeHorse({
      id: "dam-young",
      name: "Young Dam",
      gender: "filly",
      age: 10,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds-test", damId: "gd1" },
    });
    const dam2 = makeHorse({
      id: "dam-young2",
      name: "Young Dam 2",
      gender: "filly",
      age: 8,
      pedigree: { name: "Unknown", generation: 0, sireId: "ds-test", damId: "gd2" },
    });
    horses.push(dam1, dam2);

    // Yearling (age 1) — should not count
    horses.push(
      makeHorse({
        id: "gf-yearling",
        name: "Yearling",
        age: 1,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "dam-young" },
        lifetimeEarnings: 0,
      }),
    );

    // Racing-age foal
    horses.push(
      makeHorse({
        id: "gf-racer",
        name: "Racer",
        age: 3,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "dam-young2" },
        raceHistory: [makeRaceEntry(1, "G3", 100000)],
        lifetimeEarnings: 100000,
      }),
    );

    const leaderboard = computeDamsireLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(1);
    const ranking = leaderboard.rankings[0];
    expect(ranking.damsireId).toBe("ds-test");
    // Only 1 racing-age foal counted
    expect(ranking.metrics.totalEarnings).toBe(100000);
  });
});

describe("blueHenLeaderboard", () => {
  it("ranks mares by their produce record", () => {
    const horses: Horse[] = [];

    // Mare "m1" — excellent producer with stakes and G1 winners
    for (let i = 0; i < 5; i++) {
      horses.push(
        makeHorse({
          id: `foal-m1-${i}`,
          name: `M1 Foal ${i}`,
          age: 3 + i,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-a", damId: "m1" },
          raceHistory: [makeRaceEntry(1, i < 2 ? "G1" : "G3", i < 2 ? 500000 : 100000)],
          lifetimeEarnings: i < 2 ? 400000 : 100000,
        }),
      );
    }

    // Mare "m2" — modest producer
    for (let i = 0; i < 3; i++) {
      horses.push(
        makeHorse({
          id: `foal-m2-${i}`,
          name: `M2 Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-b", damId: "m2" },
          raceHistory: [makeRaceEntry(2, undefined, 30000)],
          lifetimeEarnings: 30000,
        }),
      );
    }

    const leaderboard = computeBlueHenLeaderboard(horses, 100);

    expect(leaderboard.type).toBe("blue_hen");
    expect(leaderboard.rankings.length).toBe(2);

    // m1 should rank higher
    expect(leaderboard.rankings[0].mareId).toBe("m1");
    expect(leaderboard.rankings[0].metrics.stakesWinnersProduced).toBeGreaterThan(0);
    expect(leaderboard.rankings[0].metrics.g1WinnersProduced).toBeGreaterThan(0);
    expect(leaderboard.rankings[0].metrics.isBlueHen).toBe(true);
    expect(leaderboard.rankings[0].rank).toBe(1);

    // m2 should rank lower
    expect(leaderboard.rankings[1].mareId).toBe("m2");
    expect(leaderboard.rankings[1].value).toBeLessThan(leaderboard.rankings[0].value);
  });

  it("excludes mares with no racing-age foals", () => {
    const horses: Horse[] = [];

    // Mare with only a yearling
    horses.push(
      makeHorse({
        id: "foal-yearling",
        name: "Yearling",
        age: 1,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "m-empty" },
      }),
    );

    const leaderboard = computeBlueHenLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(0);
  });

  it("only counts racing-age foals in stats", () => {
    const horses: Horse[] = [];

    // One yearling + one racer
    horses.push(
      makeHorse({
        id: "foal-young",
        name: "Young Foal",
        age: 1,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "m-mixed" },
      }),
    );
    horses.push(
      makeHorse({
        id: "foal-racer",
        name: "Racer Foal",
        age: 3,
        pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "m-mixed" },
        raceHistory: [makeRaceEntry(1, "G3", 100000)],
        lifetimeEarnings: 100000,
      }),
    );

    const leaderboard = computeBlueHenLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(1);
    const ranking = leaderboard.rankings[0];
    expect(ranking.mareId).toBe("m-mixed");
    expect(ranking.metrics.foalsProduced).toBe(2); // total foals
    // But only 1 racing-age foal counted in earnings
    expect(ranking.metrics.totalFoalEarnings).toBe(100000);
  });

  it("uses persisted blueHenStatus.isBlueHen when available", () => {
    const horses: Horse[] = [];

    // Mare with persisted blueHenStatus
    horses.push(
      makeHorse({
        id: "m-persisted",
        name: "Persisted Mare",
        gender: "filly",
        age: 12,
        blueHenStatus: {
          isBlueHen: true,
          stakesWinnersProduced: 3,
          group1WinnersProduced: 1,
          blueHenScore: 75,
          foalsProduced: 8,
        },
      }),
    );

    for (let i = 0; i < 3; i++) {
      horses.push(
        makeHorse({
          id: `foal-p-${i}`,
          name: `Persisted Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: "m-persisted" },
          raceHistory: [makeRaceEntry(1, i === 0 ? "G1" : "G3", i === 0 ? 500000 : 100000)],
          lifetimeEarnings: i === 0 ? 400000 : 100000,
        }),
      );
    }

    const leaderboard = computeBlueHenLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(1);
    expect(leaderboard.rankings[0].metrics.isBlueHen).toBe(true);
  });

  it("ranks are sequential and sorted by score descending", () => {
    const horses: Horse[] = [];

    // Create 3 mares with varying produce quality
    for (let m = 0; m < 3; m++) {
      const mareId = `m-rank-${m}`;
      const earnings = (3 - m) * 100000;
      for (let i = 0; i < 3; i++) {
        horses.push(
          makeHorse({
            id: `${mareId}-foal-${i}`,
            name: `${mareId} Foal ${i}`,
            age: 3,
            pedigree: { name: "Unknown", generation: 0, sireId: "sire-x", damId: mareId },
            raceHistory: [makeRaceEntry(1, m === 0 ? "G1" : undefined, earnings)],
            lifetimeEarnings: earnings,
          }),
        );
      }
    }

    const leaderboard = computeBlueHenLeaderboard(horses, 100);
    expect(leaderboard.rankings.length).toBe(3);
    expect(leaderboard.rankings[0].rank).toBe(1);
    expect(leaderboard.rankings[1].rank).toBe(2);
    expect(leaderboard.rankings[2].rank).toBe(3);
    expect(leaderboard.rankings[0].value).toBeGreaterThanOrEqual(leaderboard.rankings[1].value);
    expect(leaderboard.rankings[1].value).toBeGreaterThanOrEqual(leaderboard.rankings[2].value);
  });
});
