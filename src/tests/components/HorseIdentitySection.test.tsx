import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseIdentitySection } from "@/components/horse/HorseIdentitySection";
import type { Horse } from "@/game/types";

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
    stats: {
      speed: 60,
      stamina: 70,
      acceleration: 55,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    potential: 70,
    raceHistory: [],
    owned: true,
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    runningStyle: "E",
    distanceAptitude: 1400,
    surfaceAptitude: { Turf: 80, Dirt: 40, Synthetic: 50 },
    form: 3,
    weatherPreference: "dry",
    ...overrides,
  } as Horse;
}

describe("HorseIdentitySection", () => {
  it("renders without crashing with a valid horse", () => {
    const { container } = renderWithStore(
      <HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />,
    );
    expect(container).toBeTruthy();
  });

  it("displays running style badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/STYLE: E/i)).toBeTruthy();
  });

  it("displays distance aptitude badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/DIST: 1400m/i)).toBeTruthy();
  });

  it("displays surface aptitude badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/SURF:/i)).toBeTruthy();
  });

  it("displays form badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/FORM: \+3/i)).toBeTruthy();
  });

  it("displays weather preference badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/WEATHER: DRY/i)).toBeTruthy();
  });

  it("displays peaking status badge", () => {
    renderWithStore(<HorseIdentitySection horse={createHorse()} peakingStatus="Peak" />);
    expect(screen.getByText(/PHASE: PEAK/i)).toBeTruthy();
  });

  it("displays NA when runningStyle is undefined", () => {
    const horse = createHorse({ runningStyle: undefined as never });
    renderWithStore(<HorseIdentitySection horse={horse} peakingStatus="Rising" />);
    expect(screen.getByText(/STYLE: NA/i)).toBeTruthy();
  });
});
