import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JockeySelectionStep } from "@/components/race/JockeySelectionStep";
import type { Horse, Jockey } from "@/game/types";
import type { JockeyStats } from "@/core/jockey/types";

vi.mock("@/components/jockey/JockeyCard", () => ({
  JockeyCard: () => <div data-testid="jockey-card" />,
}));

function makeJockeyStats(overrides?: Partial<JockeyStats>): JockeyStats {
  return {
    pacing: 60,
    positioning: 60,
    vigor: 60,
    gateSkill: 60,
    temperament: 60,
    ...overrides,
  };
}

function makeJockey(overrides?: Partial<Jockey>): Jockey {
  return {
    id: "j1",
    name: "Test Jockey",
    age: 28,
    archetype: "versatile",
    stats: makeJockeyStats(),
    potential: 80,
    traits: [],
    silk: { pattern: "solid", primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff" },
    careerStarts: 100,
    careerWins: 20,
    fame: 50,
    ridingFee: 500,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    ...overrides,
  } as Jockey;
}

function makeHorse(overrides?: Partial<Horse>): Horse {
  return {
    id: "h1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "#FF0000",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    energy: 100,
    form: 0,
    potential: 75,
    raceHistory: [],
    owned: true,
    fame: 50,
    runningStyle: "E",
    healthStatus: "healthy",
    coatColor: "bay",
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    injuryProneness: 0.1,
    height: 15.2,
    weight: 500,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    heartScore: 1.0,
    fiberBias: "average",
    strideType: "average",
    trackPreference: "balanced",
    mudAptitude: 1.0,
    trainability: 1.0,
    peakAge: 4,
    recoveryRate: 1.0,
    fertility: 0.85,
    foalingEase: 0.9,
    markings: {
      socks: "none",
      face: "none",
      silverDapple: false,
      sabino: false,
      splashWhite: false,
    },
    bleederRisk: 0.05,
    roarerRisk: 0.03,
    ocdRisk: 0.03,
    bloodline: "Test Line",
    heterozygosity: 0.8,
    coefficientOfInbreeding: 0.0,
    ancestralHistoryCoefficient: 0.5,
    racingViable: true,
    lifecycleStatus: "active",
    healthStatusDay: 1,
    gelded: false,
    isBlueHen: false,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    recoveryPoints: 100,
    birthDay: 1,
    courseVisits: {},
    pedigree: { name: "Test Horse", generation: 0, sireName: "Sire", damName: "Dam" },
    ...overrides,
  } as Horse;
}

describe("JockeySelectionStep — synergy badges", () => {
  it('renders "High" compatibility badge for matching archetype', () => {
    const horse = makeHorse({ runningStyle: "E" });
    const jockey = makeJockey({ archetype: "front_runner" });
    render(
      <JockeySelectionStep
        marketJockeys={[jockey]}
        selectedJockeyId={null}
        selectedHorse={horse}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/High Match/i)).toBeDefined();
  });

  it("renders trait synergy badge when jockey has gate_master and horse has runningStyle E", () => {
    const horse = makeHorse({ runningStyle: "E" });
    const jockey = makeJockey({ traits: ["gate_master"] });
    render(
      <JockeySelectionStep
        marketJockeys={[jockey]}
        selectedJockeyId={null}
        selectedHorse={horse}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/Gate Master/i)).toBeDefined();
  });

  it("renders no trait badge when no traits match", () => {
    const horse = makeHorse({ runningStyle: "P" });
    const jockey = makeJockey({ traits: ["gate_master"] });
    render(
      <JockeySelectionStep
        marketJockeys={[jockey]}
        selectedJockeyId={null}
        selectedHorse={horse}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByText(/Gate Master/i)).toBeNull();
    expect(screen.queryByText(/Closer Instinct/i)).toBeNull();
    expect(screen.queryByText(/Pace Presser/i)).toBeNull();
  });

  it("does not break when jockey has no traits", () => {
    const horse = makeHorse({ runningStyle: "E" });
    const jockey = makeJockey({ traits: [] });
    render(
      <JockeySelectionStep
        marketJockeys={[jockey]}
        selectedJockeyId={null}
        selectedHorse={horse}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByText(/Gate Master/i)).toBeNull();
  });
});
