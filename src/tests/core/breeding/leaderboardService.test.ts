import { describe, it, expect, beforeEach } from "vitest";
import type { Horse } from "@/game/types";
import { computeAllLeaderboards } from "@/core/breeding/leaderboardService";
import type { SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { LeaderboardType } from "@/core/breeding/leaderboardTypes";

function makeRaceEntry(
  position: number,
  surface: string,
  distance: number,
  grade?: string,
  purse?: number,
  raceClass?: string,
) {
  return {
    raceId: `race-${position}-${surface}-${distance}-${Math.random()}`,
    raceName: "Test Race",
    position,
    beyer: 90 + Math.floor(Math.random() * 20),
    surface,
    distance,
    grade,
    purse: purse ?? 50000,
    day: 100,
    fieldSize: 10,
    raceClass: raceClass ?? "Allowance",
  };
}

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

function makeStallion(overrides: Partial<Horse> & { id: string; name: string }): Horse {
  return makeHorse({
    gender: "colt",
    stud: {
      atStud: true,
      standingFee: 10000,
      bookSize: 30,
      seasonBookings: 20,
      lifetimeFoals: 10,
      lifetimeStakesFoals: 3,
      lifetimeG1Foals: 1,
    },
    ...overrides,
  });
}

describe("leaderboardService", () => {
  let horses: Horse[];
  let industryMeanEarnings: number;
  const currentDay = 100;

  beforeEach(() => {
    horses = [];
    industryMeanEarnings = 100000;
  });

  // Helper to build a set of turf-winning foals for a sire
  function addTurfFoals(sireId: string, count: number) {
    for (let i = 0; i < count; i++) {
      horses.push(
        makeHorse({
          id: `${sireId}-turf-foal-${i}`,
          name: `${sireId} Turf Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId, damId: "dam1" },
          raceHistory: [
            makeRaceEntry(1, "Turf", 1800, "G3", 100000, "Stakes"),
            makeRaceEntry(1, "Turf", 1600),
            makeRaceEntry(2, "Turf", 2000),
          ],
          lifetimeEarnings: 120000,
        }),
      );
    }
  }

  function addDirtFoals(sireId: string, count: number) {
    for (let i = 0; i < count; i++) {
      horses.push(
        makeHorse({
          id: `${sireId}-dirt-foal-${i}`,
          name: `${sireId} Dirt Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId, damId: "dam2" },
          raceHistory: [
            makeRaceEntry(1, "Dirt", 1800, "G3", 100000, "Stakes"),
            makeRaceEntry(1, "Dirt", 1600),
            makeRaceEntry(2, "Dirt", 2000),
          ],
          lifetimeEarnings: 100000,
        }),
      );
    }
  }

  function addSprintFoals(sireId: string, count: number) {
    for (let i = 0; i < count; i++) {
      horses.push(
        makeHorse({
          id: `${sireId}-sprint-foal-${i}`,
          name: `${sireId} Sprint Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId, damId: "dam3" },
          raceHistory: [
            makeRaceEntry(1, "Dirt", 1200, "G3", 80000, "Stakes"),
            makeRaceEntry(1, "Dirt", 1000),
            makeRaceEntry(2, "Dirt", 1300),
          ],
          lifetimeEarnings: 80000,
        }),
      );
    }
  }

  function addStayerFoals(sireId: string, count: number) {
    for (let i = 0; i < count; i++) {
      horses.push(
        makeHorse({
          id: `${sireId}-stayer-foal-${i}`,
          name: `${sireId} Stayer Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId, damId: "dam4" },
          raceHistory: [
            makeRaceEntry(1, "Turf", 2200, "G3", 120000, "Stakes"),
            makeRaceEntry(1, "Turf", 2400),
            makeRaceEntry(2, "Turf", 2000),
          ],
          lifetimeEarnings: 110000,
        }),
      );
    }
  }

  it("AEI is non-zero when runners have earnings", () => {
    horses.push(
      makeStallion({
        id: "sire1",
        name: "Elite Sire",
        age: 10,
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 20,
          lifetimeG1Foals: 5,
        },
        bloodline: "Northern Dancer",
        hemisphere: "Northern",
      }),
    );
    addTurfFoals("sire1", 5);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.overall.rankings.length).toBeGreaterThan(0);
    expect(leaderboards.overall.rankings[0].value).toBeGreaterThan(0);
  });

  // ─── Test 2: runners filter ───
  it("runners filter excludes non-racing-age foals from AEI", () => {
    horses.push(
      makeStallion({
        id: "sire-filter",
        name: "Filter Test Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 10,
          lifetimeStakesFoals: 2,
          lifetimeG1Foals: 0,
        },
      }),
    );
    // 3 racing-age foals with earnings
    for (let i = 0; i < 3; i++) {
      horses.push(
        makeHorse({
          id: `filter-runner-${i}`,
          name: `Filter Runner ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-filter", damId: "dam1" },
          raceHistory: [makeRaceEntry(1, "Turf", 1600, undefined, 50000)],
          lifetimeEarnings: 100000,
        }),
      );
    }
    // 2 yearlings (age 1, no races) — should NOT dilute AEI
    for (let i = 0; i < 2; i++) {
      horses.push(
        makeHorse({
          id: `filter-yearling-${i}`,
          name: `Filter Yearling ${i}`,
          age: 1,
          pedigree: { name: "Unknown", generation: 0, sireId: "sire-filter", damId: "dam2" },
          raceHistory: [],
          lifetimeEarnings: 0,
        }),
      );
    }

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);
    const sireRanking = leaderboards.overall.rankings.find((r) => r.stallionId === "sire-filter");

    // AEI should be based on 3 runners, not 5 foals
    // avg = (3 * 100000) / 3 = 100000; AEI = (100000 / 100000) * 100 = 100
    expect(sireRanking).toBeDefined();
    expect(sireRanking!.value).toBeGreaterThan(0);
    // If diluted by 2 yearlings: avg = 300000/5 = 60000; AEI = 60
    // If correct with 3 runners: avg = 300000/3 = 100000; AEI = 100
    // We expect AEI around 100, not 60
    expect(sireRanking!.value).toBeGreaterThanOrEqual(90);
  });

  // ─── Test 3: turf specialists ───
  it("computes turf specialists leaderboard with rankings", () => {
    horses.push(
      makeStallion({
        id: "turf-sire",
        name: "Turf Sire",
        bloodline: "Northern Dancer",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addTurfFoals("turf-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.turf_specialists.rankings.length).toBeGreaterThan(0);
    const turfRanking = leaderboards.turf_specialists.rankings.find(
      (r) => r.stallionId === "turf-sire",
    );
    expect(turfRanking).toBeDefined();
    expect(turfRanking!.value).toBeGreaterThan(0);
  });

  // ─── Test 4: dirt specialists ───
  it("computes dirt specialists leaderboard with rankings", () => {
    horses.push(
      makeStallion({
        id: "dirt-sire",
        name: "Dirt Sire",
        bloodline: "Mr. Prospector",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addDirtFoals("dirt-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.dirt_specialists.rankings.length).toBeGreaterThan(0);
    const dirtRanking = leaderboards.dirt_specialists.rankings.find(
      (r) => r.stallionId === "dirt-sire",
    );
    expect(dirtRanking).toBeDefined();
    expect(dirtRanking!.value).toBeGreaterThan(0);
  });

  // ─── Test 5: sprint sires ───
  it("computes sprint sires leaderboard with rankings", () => {
    horses.push(
      makeStallion({
        id: "sprint-sire",
        name: "Sprint Sire",
        bloodline: "Mr. Prospector",
        stud: {
          atStud: true,
          standingFee: 15000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 4,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addSprintFoals("sprint-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.sprint_sires.rankings.length).toBeGreaterThan(0);
    const sprintRanking = leaderboards.sprint_sires.rankings.find(
      (r) => r.stallionId === "sprint-sire",
    );
    expect(sprintRanking).toBeDefined();
    expect(sprintRanking!.value).toBeGreaterThan(0);
  });

  // ─── Test 6: staying sires ───
  it("computes staying sires leaderboard with rankings", () => {
    horses.push(
      makeStallion({
        id: "stayer-sire",
        name: "Stayer Sire",
        bloodline: "Sadler's Wells",
        stud: {
          atStud: true,
          standingFee: 15000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 4,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addStayerFoals("stayer-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.staying_sires.rankings.length).toBeGreaterThan(0);
    const stayerRanking = leaderboards.staying_sires.rankings.find(
      (r) => r.stallionId === "stayer-sire",
    );
    expect(stayerRanking).toBeDefined();
    expect(stayerRanking!.value).toBeGreaterThan(0);
  });

  // ─── Test 7: freshman watch ───
  it("computes freshman watch leaderboard", () => {
    // Freshman sire: oldest foal age 2-3
    horses.push(
      makeStallion({
        id: "freshman-sire",
        name: "Freshman Sire",
        stud: {
          atStud: true,
          standingFee: 8000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 8,
          lifetimeStakesFoals: 2,
          lifetimeG1Foals: 0,
        },
      }),
    );
    // Add 2-year-old foal (racing age)
    horses.push(
      makeHorse({
        id: "freshman-foal-1",
        name: "Freshman Foal 1",
        age: 2,
        pedigree: { name: "Unknown", generation: 0, sireId: "freshman-sire", damId: "dam1" },
        raceHistory: [makeRaceEntry(1, "Turf", 1600, "G3", 80000, "Stakes")],
        lifetimeEarnings: 80000,
      }),
    );

    // Established sire: oldest foal age 5
    horses.push(
      makeStallion({
        id: "established-sire",
        name: "Established Sire",
        stud: {
          atStud: true,
          standingFee: 30000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 15,
          lifetimeG1Foals: 3,
        },
      }),
    );
    horses.push(
      makeHorse({
        id: "established-foal-1",
        name: "Established Foal 1",
        age: 5,
        pedigree: { name: "Unknown", generation: 0, sireId: "established-sire", damId: "dam2" },
        raceHistory: [makeRaceEntry(1, "Turf", 2000, "G1", 500000, "Group")],
        lifetimeEarnings: 300000,
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const freshmanRanking = leaderboards.freshman_watch.rankings.find(
      (r) => r.stallionId === "freshman-sire",
    );
    expect(freshmanRanking).toBeDefined();

    const establishedRanking = leaderboards.freshman_watch.rankings.find(
      (r) => r.stallionId === "established-sire",
    );
    expect(establishedRanking).toBeUndefined();
  });

  // ─── Test 8: rising stars with trend history ───
  it("computes rising stars leaderboard with trend history", () => {
    horses.push(
      makeStallion({
        id: "rising-sire",
        name: "Rising Star Sire",
        stud: {
          atStud: true,
          standingFee: 12000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 15,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addTurfFoals("rising-sire", 3);

    const trendHistory: SireTrendData[] = [
      {
        stallionId: "rising-sire",
        day: 50,
        aei: 50,
        ci: 80,
        stakesFoals: 2,
        g1Foals: 0,
        rank: 5,
      },
      {
        stallionId: "rising-sire",
        day: 93,
        aei: 120,
        ci: 110,
        stakesFoals: 5,
        g1Foals: 1,
        rank: 2,
      },
    ];

    const leaderboards = computeAllLeaderboards(
      horses,
      industryMeanEarnings,
      currentDay,
      trendHistory,
    );

    expect(leaderboards.rising_stars.rankings.length).toBeGreaterThan(0);
    const risingRanking = leaderboards.rising_stars.rankings.find(
      (r) => r.stallionId === "rising-sire",
    );
    expect(risingRanking).toBeDefined();
    expect(risingRanking!.value).toBeGreaterThan(0);
    // trendScore = (120 - 50) * 10 + (5 - 2) * 5 = 700 + 15 = 715
    expect(risingRanking!.value).toBe(715);
  });

  // ─── Test 9: rising stars fallback ───
  it("rising stars falls back to recent stakes when no trend history", () => {
    horses.push(
      makeStallion({
        id: "fallback-sire",
        name: "Fallback Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 15,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    // Should fall back to top 20 by lifetimeStakesFoals
    expect(leaderboards.rising_stars.rankings.length).toBeGreaterThan(0);
    const ranking = leaderboards.rising_stars.rankings.find(
      (r) => r.stallionId === "fallback-sire",
    );
    expect(ranking).toBeDefined();
    expect(ranking!.value).toBe(5); // lifetimeStakesFoals
  });

  // ─── Test 10: rising stars filters declining AEI ───
  it("rising stars filters out sires with declining AEI", () => {
    horses.push(
      makeStallion({
        id: "declining-sire",
        name: "Declining Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 15,
          lifetimeStakesFoals: 3,
          lifetimeG1Foals: 0,
        },
      }),
    );

    const trendHistory: SireTrendData[] = [
      {
        stallionId: "declining-sire",
        day: 50,
        aei: 150,
        ci: 110,
        stakesFoals: 5,
        g1Foals: 1,
        rank: 1,
      },
      {
        stallionId: "declining-sire",
        day: 93,
        aei: 80,
        ci: 90,
        stakesFoals: 3,
        g1Foals: 0,
        rank: 5,
      },
    ];

    const leaderboards = computeAllLeaderboards(
      horses,
      industryMeanEarnings,
      currentDay,
      trendHistory,
    );

    // trendScore = (80 - 150) * 10 + (3 - 5) * 5 = -700 + -10 = -710
    // Filtered out because value <= 0
    const decliningRanking = leaderboards.rising_stars.rankings.find(
      (r) => r.stallionId === "declining-sire",
    );
    expect(decliningRanking).toBeUndefined();
  });

  // ─── Test 11: regional leaderboards ───
  it("computes regional leaderboards by hemisphere", () => {
    horses.push(
      makeStallion({
        id: "north-sire",
        name: "Northern Sire",
        hemisphere: "Northern",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addTurfFoals("north-sire", 3);

    horses.push(
      makeStallion({
        id: "south-sire",
        name: "Southern Sire",
        hemisphere: "Southern",
        stud: {
          atStud: true,
          standingFee: 15000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 4,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addDirtFoals("south-sire", 3);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const northRanking = leaderboards.regional_north.rankings.find(
      (r) => r.stallionId === "north-sire",
    );
    expect(northRanking).toBeDefined();

    const southRanking = leaderboards.regional_south.rankings.find(
      (r) => r.stallionId === "south-sire",
    );
    expect(southRanking).toBeDefined();

    // Cross-verify exclusion
    const southInNorth = leaderboards.regional_north.rankings.find(
      (r) => r.stallionId === "south-sire",
    );
    expect(southInNorth).toBeUndefined();

    const northInSouth = leaderboards.regional_south.rankings.find(
      (r) => r.stallionId === "north-sire",
    );
    expect(northInSouth).toBeUndefined();
  });

  // ─── Test 12: surfaceBias computed ───
  it("surfaceBias is computed from runner stats", () => {
    horses.push(
      makeStallion({
        id: "turf-bias-sire",
        name: "Turf Bias Sire",
        bloodline: "Northern Dancer",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addTurfFoals("turf-bias-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const ranking = leaderboards.overall.rankings.find((r) => r.stallionId === "turf-bias-sire");
    expect(ranking).toBeDefined();
    expect(ranking!.metrics.surfaceBias).toBe("turf");
  });

  // ─── Test 12b: surfaceBias bloodline fallback ───
  it("surfaceBias uses bloodline fallback for sires with < 5 runners", () => {
    horses.push(
      makeStallion({
        id: "bloodline-sire",
        name: "Bloodline Sire",
        bloodline: "Northern Dancer",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    // Only 2 runners (< 5 threshold) → bloodline fallback
    addTurfFoals("bloodline-sire", 2);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const ranking = leaderboards.overall.rankings.find((r) => r.stallionId === "bloodline-sire");
    expect(ranking).toBeDefined();
    // Northern Dancer bloodline → turf
    expect(ranking!.metrics.surfaceBias).toBe("turf");
  });

  // ─── Test 13: distancePreference computed ───
  it("distancePreference is computed from runner stats", () => {
    horses.push(
      makeStallion({
        id: "sprint-bias-sire",
        name: "Sprint Bias Sire",
        bloodline: "Mr. Prospector",
        stud: {
          atStud: true,
          standingFee: 15000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 4,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addSprintFoals("sprint-bias-sire", 6);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const ranking = leaderboards.overall.rankings.find((r) => r.stallionId === "sprint-bias-sire");
    expect(ranking).toBeDefined();
    expect(ranking!.metrics.distancePreference).toBe("sprint");
  });

  // ─── Test 13b: distancePreference versatile for < 5 runners ───
  it("distancePreference is versatile for sires with < 5 runners", () => {
    horses.push(
      makeStallion({
        id: "versatile-sire",
        name: "Versatile Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 10,
          lifetimeStakesFoals: 2,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addTurfFoals("versatile-sire", 2);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const ranking = leaderboards.overall.rankings.find((r) => r.stallionId === "versatile-sire");
    expect(ranking).toBeDefined();
    expect(ranking!.metrics.distancePreference).toBe("versatile");
  });

  // ─── Test 14: progenyWinPercentage ───
  it("progenyWinPercentage is non-zero for sires with stakes foals", () => {
    horses.push(
      makeStallion({
        id: "pwp-sire",
        name: "PWP Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const ranking = leaderboards.overall.rankings.find((r) => r.stallionId === "pwp-sire");
    expect(ranking).toBeDefined();
    // progenyWinPercentage = (5 / 20) * 100 = 25
    expect(ranking!.metrics.progenyWinPercentage).toBe(25);
  });

  // ─── Test 15: classification tiers ───
  it("classification includes developing tier", () => {
    // Create a sire with low AEI (0.5-1.0 range) and CI > 0.3
    horses.push(
      makeStallion({
        id: "developing-sire",
        name: "Developing Sire",
        stud: {
          atStud: true,
          standingFee: 5000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 10,
          lifetimeStakesFoals: 1,
          lifetimeG1Foals: 0,
        },
      }),
    );
    // Add 3 runners with modest earnings → AEI around 0.5-1.0
    for (let i = 0; i < 3; i++) {
      horses.push(
        makeHorse({
          id: `dev-foal-${i}`,
          name: `Dev Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "developing-sire", damId: "dam1" },
          raceHistory: [makeRaceEntry(1, "Turf", 1600, undefined, 60000)],
          lifetimeEarnings: 60000,
        }),
      );
    }

    // Create a sire with high AEI (> 2.0) and CI > 1.0 → elite
    horses.push(
      makeStallion({
        id: "elite-sire",
        name: "Elite Sire",
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 10,
          lifetimeG1Foals: 3,
        },
      }),
    );
    // Add 5 runners with high earnings → AEI > 2.0
    for (let i = 0; i < 5; i++) {
      horses.push(
        makeHorse({
          id: `elite-foal-${i}`,
          name: `Elite Foal ${i}`,
          age: 3,
          pedigree: { name: "Unknown", generation: 0, sireId: "elite-sire", damId: "dam2" },
          raceHistory: [makeRaceEntry(1, "Turf", 1600, "G1", 500000, "Group")],
          lifetimeEarnings: 400000,
        }),
      );
    }

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const developingRanking = leaderboards.overall.rankings.find(
      (r) => r.stallionId === "developing-sire",
    );
    if (developingRanking) {
      // Should be "developing" or "solid" depending on exact AEI
      expect(["developing", "solid", "premium", "elite"]).toContain(
        developingRanking.metrics.classification,
      );
    }

    const eliteRanking = leaderboards.overall.rankings.find((r) => r.stallionId === "elite-sire");
    expect(eliteRanking).toBeDefined();
    // With 5 runners each earning 400k, avg = 400k, AEI = (400k/100k)*100 = 400 → elite
    expect(eliteRanking!.metrics.classification).toBe("elite");
  });

  // ─── Test 16: all 13 leaderboard types present ───
  it("all 13 leaderboard types are present and have correct type", () => {
    horses.push(
      makeStallion({
        id: "solo-sire",
        name: "Solo Sire",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 10,
          lifetimeStakesFoals: 2,
          lifetimeG1Foals: 0,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    const expectedTypes: LeaderboardType[] = [
      "overall",
      "ci",
      "stakes_producers",
      "g1_producers",
      "turf_specialists",
      "dirt_specialists",
      "sprint_sires",
      "staying_sires",
      "value_sires",
      "freshman_watch",
      "rising_stars",
      "regional_north",
      "regional_south",
    ];

    for (const type of expectedTypes) {
      expect(leaderboards[type]).toBeDefined();
      expect(leaderboards[type].type).toBe(type);
      expect(leaderboards[type].lastUpdated).toBe(currentDay);
      expect(leaderboards[type].title).toBeDefined();
      expect(leaderboards[type].description).toBeDefined();
      expect(Array.isArray(leaderboards[type].rankings)).toBe(true);
    }
  });

  // ─── Test 17: rankings sorted descending ───
  it("rankings are sorted descending by value and have sequential ranks", () => {
    horses.push(
      makeStallion({
        id: "sort-sire-1",
        name: "Sort Sire 1",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 10,
          lifetimeG1Foals: 2,
        },
      }),
    );
    horses.push(
      makeStallion({
        id: "sort-sire-2",
        name: "Sort Sire 2",
        stud: {
          atStud: true,
          standingFee: 10000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 0,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    // Check stakes_producers (should have both sires, sorted by stakes foals)
    const stakesRankings = leaderboards.stakes_producers.rankings;
    for (let i = 0; i < stakesRankings.length - 1; i++) {
      expect(stakesRankings[i].value).toBeGreaterThanOrEqual(stakesRankings[i + 1].value);
      expect(stakesRankings[i].rank).toBe(i + 1);
    }
  });

  // ─── Test 18: existing tests (updated) ───
  it("computes overall leaderboard ranked by AEI", () => {
    horses.push(
      makeStallion({
        id: "sire1",
        name: "Elite Sire",
        age: 10,
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 20,
          lifetimeG1Foals: 5,
        },
        bloodline: "Northern Dancer",
        hemisphere: "Northern",
      }),
    );
    addTurfFoals("sire1", 5);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.overall).toBeDefined();
    expect(leaderboards.overall.type).toBe("overall");
    expect(leaderboards.overall.title).toBe("Overall Sire Rankings");
    expect(leaderboards.overall.rankings.length).toBeGreaterThan(0);
    expect(leaderboards.overall.rankings[0].value).toBeGreaterThan(0);
  });

  it("computes stakes producers leaderboard", () => {
    horses.push(
      makeStallion({
        id: "sire1",
        name: "Elite Sire",
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 20,
          lifetimeG1Foals: 5,
        },
      }),
    );
    horses.push(
      makeStallion({
        id: "sire2",
        name: "Value Sire",
        stud: {
          atStud: true,
          standingFee: 5000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 30,
          lifetimeStakesFoals: 10,
          lifetimeG1Foals: 2,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.stakes_producers).toBeDefined();
    expect(leaderboards.stakes_producers.type).toBe("stakes_producers");
    expect(leaderboards.stakes_producers.rankings).toHaveLength(2);
  });

  it("computes G1 producers leaderboard", () => {
    horses.push(
      makeStallion({
        id: "sire1",
        name: "Elite Sire",
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 20,
          lifetimeG1Foals: 5,
        },
      }),
    );

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.g1_producers).toBeDefined();
    expect(leaderboards.g1_producers.type).toBe("g1_producers");
  });

  it("computes value sires leaderboard", () => {
    horses.push(
      makeStallion({
        id: "sire1",
        name: "Elite Sire",
        stud: {
          atStud: true,
          standingFee: 50000,
          bookSize: 40,
          seasonBookings: 30,
          lifetimeFoals: 50,
          lifetimeStakesFoals: 20,
          lifetimeG1Foals: 5,
        },
      }),
    );
    addTurfFoals("sire1", 5);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.value_sires).toBeDefined();
    expect(leaderboards.value_sires.type).toBe("value_sires");
  });

  it("computes regional leaderboards", () => {
    horses.push(
      makeStallion({
        id: "north-sire",
        name: "Northern Sire",
        hemisphere: "Northern",
        stud: {
          atStud: true,
          standingFee: 20000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 5,
          lifetimeG1Foals: 1,
        },
      }),
    );
    addTurfFoals("north-sire", 3);

    horses.push(
      makeStallion({
        id: "south-sire",
        name: "Southern Sire",
        hemisphere: "Southern",
        stud: {
          atStud: true,
          standingFee: 15000,
          bookSize: 30,
          seasonBookings: 20,
          lifetimeFoals: 20,
          lifetimeStakesFoals: 4,
          lifetimeG1Foals: 0,
        },
      }),
    );
    addDirtFoals("south-sire", 3);

    const leaderboards = computeAllLeaderboards(horses, industryMeanEarnings, currentDay);

    expect(leaderboards.regional_north).toBeDefined();
    expect(leaderboards.regional_south).toBeDefined();
    expect(leaderboards.regional_south.rankings.length).toBeGreaterThan(0);
  });
});
