import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseManagementSection } from "@/components/horse/HorseManagementSection";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
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
    owned: true,
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    lifetimeEarnings: 125000,
    gelded: false,
    ...overrides,
  } as Horse;
}

describe("HorseManagementSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when horse is not owned", () => {
    const { container } = renderWithStore(
      <HorseManagementSection horse={createHorse({ owned: false })} isConsigned={false} day={1} />,
    );
    expect(container.textContent).toBe("");
  });

  it("displays career earnings from lifetimeEarnings", () => {
    renderWithStore(<HorseManagementSection horse={createHorse()} isConsigned={false} day={1} />);
    expect(screen.getByText(/\$125,000/i)).toBeTruthy();
  });

  it("displays career starts from raceHistory length", () => {
    const horse = createHorse({
      raceHistory: [
        { raceId: "r1", raceName: "Race 1", position: 1, day: 1 },
        { raceId: "r2", raceName: "Race 2", position: 3, day: 2 },
      ],
    });
    renderWithStore(<HorseManagementSection horse={horse} isConsigned={false} day={3} />);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("shows gelding button when gender is colt and not gelded", () => {
    renderWithStore(<HorseManagementSection horse={createHorse()} isConsigned={false} day={1} />);
    expect(screen.getByText(/Geld/i)).toBeTruthy();
  });

  it("hides gelding button when gender is filly", () => {
    renderWithStore(
      <HorseManagementSection
        horse={createHorse({ gender: "filly" })}
        isConsigned={false}
        day={1}
      />,
    );
    expect(screen.queryByText(/Geld/i)).toBeNull();
  });

  it("hides gelding button when already gelded", () => {
    renderWithStore(
      <HorseManagementSection horse={createHorse({ gelded: true })} isConsigned={false} day={1} />,
    );
    expect(screen.queryByText(/Geld/i)).toBeNull();
  });

  it("shows update stud fee button when stud.atStud is true", () => {
    const horse = createHorse({
      stud: {
        atStud: true,
        standingFee: 50000,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 2,
        bookSize: 40,
        seasonBookings: 30,
        lifetimeFoals: 100,
      },
    });
    renderWithStore(<HorseManagementSection horse={horse} isConsigned={false} day={1} />);
    expect(screen.getByText(/Update Fee/i)).toBeTruthy();
  });

  it("hides update stud fee button when stud is undefined", () => {
    renderWithStore(<HorseManagementSection horse={createHorse()} isConsigned={false} day={1} />);
    expect(screen.queryByText(/Update Fee/i)).toBeNull();
  });

  it("shows consigned sale info when isConsigned and consignedSale are provided", () => {
    renderWithStore(
      <HorseManagementSection
        horse={createHorse()}
        isConsigned={true}
        consignedSale={{ id: "sale-1", name: "Keeneland September", day: 45 } as never}
        day={1}
      />,
    );
    expect(screen.getByText(/Consigned to Auction/i)).toBeTruthy();
    expect(screen.getByText("Keeneland September")).toBeTruthy();
  });

  it("shows eligible sale info when eligibleSale is provided and not consigned", () => {
    renderWithStore(
      <HorseManagementSection
        horse={createHorse()}
        isConsigned={false}
        eligibleSale={{ id: "sale-2", name: "Tattersalls October", day: 60 } as never}
        day={1}
      />,
    );
    expect(screen.getByText(/Eligible for Upcoming Sale/i)).toBeTruthy();
    expect(screen.getByText("Tattersalls October")).toBeTruthy();
  });

  it("shows no auction activity when neither consigned nor eligible", () => {
    renderWithStore(<HorseManagementSection horse={createHorse()} isConsigned={false} day={1} />);
    expect(screen.getByText(/No auction activity/i)).toBeTruthy();
  });
});
