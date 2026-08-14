import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LegacyAwardsWidget } from "@/components/dashboard/LegacyAwardsWidget";
import { renderWithStore } from "@/test-utils/renderWithStore";
import type { RegionalAward } from "@/core/awards/types";
import { CATEGORY_DESCRIPTIONS } from "@/core/awards/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, search }: any) => (
    <a
      href={to as string}
      data-to={to as string}
      data-params={params ? JSON.stringify(params) : ""}
      data-search={search ? JSON.stringify(search) : ""}
    >
      {children}
    </a>
  ),
}));

const mkAward = (overrides: Partial<RegionalAward> = {}): RegionalAward => ({
  id: "award-1",
  year: 5,
  region: "north_america",
  category: "horse_of_the_year",
  horseId: "h1",
  horseName: "Thunder",
  points: 100,
  runnerUpPoints: 80,
  margin: 20,
  qualifyingRaces: ["r1"],
  ceremonyDay: 365,
  ...overrides,
});

describe("LegacyAwardsWidget", () => {
  afterEach(() => cleanup());

  it("renders stable awards count", () => {
    renderWithStore(<LegacyAwardsWidget />, {
      awards: [mkAward({ id: "a1" }), mkAward({ id: "a2", category: "champion_3yo_male" })],
    });
    expect(screen.getByText("Stable Awards")).toBeTruthy();
  });

  it("shows recent award with description text", () => {
    renderWithStore(<LegacyAwardsWidget />, {
      awards: [mkAward({ id: "a1", category: "horse_of_the_year", year: 5 })],
    });
    expect(screen.getByText(CATEGORY_DESCRIPTIONS.horse_of_the_year)).toBeTruthy();
  });

  it("links recent award to /awards/$category", () => {
    const { container } = renderWithStore(<LegacyAwardsWidget />, {
      awards: [mkAward({ id: "a1", category: "horse_of_the_year", year: 5 })],
    });
    const categoryLinks = container.querySelectorAll('a[data-to="/awards/$category"]');
    expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders View Full Trophy Case link", () => {
    const { container } = renderWithStore(<LegacyAwardsWidget />, {
      awards: [],
    });
    const trophyLink = screen.getByText("View Full Trophy Case");
    expect(trophyLink).toBeTruthy();
  });
});
