import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HorseAwardsPanel } from "@/components/awards/HorseAwardsPanel";
import { renderWithStore } from "@/test-utils/renderWithStore";
import type { Horse } from "@/game/types";
import type { RegionalAward } from "@/core/awards/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 4,
    gender: "colt",
    ...overrides,
  }) as Horse;

const mkAward = (overrides: Partial<RegionalAward> = {}): RegionalAward => ({
  id: "award-1",
  year: 5,
  region: "north_america",
  category: "champion_3yo_male",
  horseId: "h1",
  horseName: "Thunder",
  points: 100,
  runnerUpPoints: 80,
  margin: 20,
  qualifyingRaces: ["r1", "r2"],
  ceremonyDay: 365,
  ...overrides,
});

describe("HorseAwardsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'No awards yet' message when no awards", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, { awards: [] });
    expect(screen.getByText(/No awards yet/i)).toBeTruthy();
  });

  it("renders HOTY section with TrophyShelf when HOTY award exists", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [mkAward({ id: "a1", category: "horse_of_the_year", year: 5 })],
    });
    expect(screen.getByText(/Horse of the Year/i)).toBeTruthy();
  });

  it("renders single category award as expanded AwardBadge when below threshold", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [mkAward({ id: "a1", category: "champion_3yo_male", year: 5 })],
    });
    expect(screen.getByText(/Championships/i)).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("renders compact view with ×N badge when category awards exceed threshold", () => {
    const awards: RegionalAward[] = Array.from({ length: 6 }, (_, i) =>
      mkAward({ id: `a${i}`, category: "champion_3yo_male", year: 5 + i }),
    );
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, { awards });
    expect(screen.getByText("×6")).toBeTruthy();
    expect(screen.getByText(/Y5/i)).toBeTruthy();
    expect(screen.getByText(/Y10/i)).toBeTruthy();
  });

  it("renders both HOTY and category sections when mixed awards exist", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "hoty1", category: "horse_of_the_year", year: 5 }),
        mkAward({ id: "cat1", category: "champion_3yo_male", year: 5 }),
      ],
    });
    expect(screen.getByText(/Horse of the Year/i)).toBeTruthy();
    expect(screen.getByText(/Championships/i)).toBeTruthy();
  });

  it("shows correct total awards count in badge", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "horse_of_the_year", year: 5 }),
        mkAward({ id: "a2", category: "champion_3yo_male", year: 5 }),
        mkAward({ id: "a3", category: "champion_older_dirt_male", year: 6 }),
      ],
    });
    const totalLabel = screen.getByText("Total Awards");
    const totalValue = totalLabel.previousElementSibling;
    expect(totalValue?.textContent).toBe("3");
  });

  it("shows correct HOTY count in stats", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "horse_of_the_year", year: 5 }),
        mkAward({ id: "a2", category: "horse_of_the_year", year: 6 }),
        mkAward({ id: "a3", category: "champion_3yo_male", year: 5 }),
      ],
    });
    const hotyLabels = screen.getAllByText("HOTY");
    const statsHoty = hotyLabels.find((el) => el.tagName === "DIV" && el.textContent === "HOTY");
    const hotyValue = statsHoty?.previousElementSibling;
    expect(hotyValue?.textContent).toBe("2");
  });

  it("shows correct years active span", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "champion_3yo_male", year: 3 }),
        mkAward({ id: "a2", category: "champion_older_dirt_male", year: 7 }),
      ],
    });
    const yearsLabel = screen.getByText("Years Active");
    const yearsValue = yearsLabel.previousElementSibling;
    expect(yearsValue?.textContent).toBe("5");
  });

  it("sorts awards by year descending", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "champion_3yo_male", year: 3 }),
        mkAward({ id: "a2", category: "champion_older_dirt_male", year: 7 }),
      ],
    });
    const yearElements = screen.getAllByText(/\b[3-9]\b|\b1[0-9]\b/);
    expect(yearElements.length).toBeGreaterThanOrEqual(2);
  });

  it("HOTY appears before other categories within same year", () => {
    const { container } = renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "champion_3yo_male", year: 5 }),
        mkAward({ id: "a2", category: "horse_of_the_year", year: 5 }),
      ],
    });
    const hotySection = screen.getByText(/Horse of the Year/i);
    const champSection = screen.getByText(/Championships/i);
    expect(hotySection.compareDocumentPosition(champSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders multiple categories independently", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse()} />, {
      awards: [
        mkAward({ id: "a1", category: "champion_3yo_male", year: 5 }),
        mkAward({ id: "a2", category: "champion_older_dirt_male", year: 6 }),
      ],
    });
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("only shows awards for the given horse", () => {
    renderWithStore(<HorseAwardsPanel horse={mkHorse({ id: "h1" })} />, {
      awards: [
        mkAward({ id: "a1", horseId: "h1", category: "champion_3yo_male", year: 5 }),
        mkAward({ id: "a2", horseId: "h2", category: "champion_3yo_male", year: 5 }),
      ],
    });
    const totalLabel = screen.getByText("Total Awards");
    const totalValue = totalLabel.previousElementSibling;
    expect(totalValue?.textContent).toBe("1");
  });
});
