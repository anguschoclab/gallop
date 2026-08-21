import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseDetailHeader } from "@/components/horse/HorseDetailHeader";
import type { Horse } from "@/game/types";

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "abcdef1234567890",
    name: "Thunder Strike",
    age: 4,
    gender: "colt",
    energy: 75,
    potential: 85,
    silk: "red",
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    raceHistory: [],
    ownership: { type: "player" },
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    ...overrides,
  } as Horse;
}

describe("HorseDetailHeader", () => {
  it("renders horse name", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getByText("Thunder Strike")).toBeTruthy();
  });

  it("displays age and gender", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getByText(/Age: 4 · colt/i)).toBeTruthy();
  });

  it("displays potential value", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getAllByText("85").length).toBeGreaterThanOrEqual(1);
  });

  it("displays energy percentage", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("shows Critical badge when activeInjury is present", () => {
    const horse = createHorse({
      activeInjury: {
        type: "Fracture",
        severity: "major",
        recoveryDays: 30,
        onsetDay: 5,
      },
    });
    renderWithStore(<HorseDetailHeader horse={horse} ovr={85} />);
    expect(screen.getByText("Critical")).toBeTruthy();
  });

  it("does not show Critical badge when no activeInjury", () => {
    const { container } = renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(container.textContent).not.toContain("Critical");
  });

  it("displays IDENT badge with truncated id", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getByText(/ABCDEF12/i)).toBeTruthy();
  });

  it("displays lifecycle status", () => {
    renderWithStore(<HorseDetailHeader horse={createHorse()} ovr={85} />);
    expect(screen.getByText("ACTIVE")).toBeTruthy();
  });
});
