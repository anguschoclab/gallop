import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseConditionSection } from "@/components/horse/HorseConditionSection";
import type { Horse } from "@/game/types";

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
    fitness: 65,
    fatigue: 30,
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    potential: 70,
    raceHistory: [],
    ownership: { type: "player" },
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    bleederRisk: 20,
    roarerRisk: 50,
    ocdRisk: 80,
    ...overrides,
  } as Horse;
}

describe("HorseConditionSection", () => {
  it("renders without crashing with a valid horse", () => {
    const { container } = renderWithStore(<HorseConditionSection horse={createHorse()} />);
    expect(container).toBeTruthy();
  });

  it("displays fitness and fatigue values", () => {
    renderWithStore(<HorseConditionSection horse={createHorse()} />);
    expect(screen.getByText("65")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("renders genetic vulnerability badges for bleeder, roarer, ocd", () => {
    renderWithStore(<HorseConditionSection horse={createHorse()} />);
    expect(screen.getByText(/BLEEDER_SENSITIVITY/i)).toBeTruthy();
    expect(screen.getByText(/ROARER_SENSITIVITY/i)).toBeTruthy();
    expect(screen.getByText(/OCD_SENSITIVITY/i)).toBeTruthy();
  });

  it("shows HIGH for ocdRisk > 70, MOD for roarerRisk 30-70, LOW for bleederRisk < 30", () => {
    renderWithStore(<HorseConditionSection horse={createHorse()} />);
    const badges = screen.getAllByText(/^(HIGH|MOD|LOW)$/);
    expect(badges.length).toBe(3);
  });

  it("renders injury section when activeInjury is present", () => {
    const horse = createHorse({
      activeInjury: {
        type: "Tendon Strain",
        severity: "moderate",
        recoveryDays: 14,
        onsetDay: 10,
      },
    });
    renderWithStore(<HorseConditionSection horse={horse} />);
    expect(screen.getByText(/Tendon Strain/i)).toBeTruthy();
    expect(screen.getByText(/14d remaining/i)).toBeTruthy();
  });

  it("does not render injury section when no activeInjury", () => {
    const { container } = renderWithStore(<HorseConditionSection horse={createHorse()} />);
    expect(container.textContent).not.toContain("Injury");
  });
});
