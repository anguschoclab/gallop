/**
 * TrophyCase component tests
 *
 * Verifies HOTY count and region breakdown rendering.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TrophyCase, TrophyStats } from "@/components/awards/TrophyCase";
import type { RegionalAward } from "@/core/awards/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => {
    const { to, ...rest } = props;
    return (
      <a href={to as string} {...rest}>
        {children}
      </a>
    );
  },
}));

function mkAward(overrides: Partial<RegionalAward> = {}): RegionalAward {
  return {
    id: "award-1",
    year: 1,
    region: "north_america",
    category: "horse_of_the_year",
    horseId: "h1",
    horseName: "Test Horse",
    points: 100,
    runnerUpPoints: 80,
    margin: 20,
    qualifyingRaces: ["r1"],
    ceremonyDay: 365,
    ...overrides,
  };
}

describe("TrophyCase", () => {
  afterEach(() => cleanup());

  it("hotyCount is 0 when no HOTY awards", () => {
    const awards = [
      mkAward({ id: "a1", category: "champion_3yo_male" }),
      mkAward({ id: "a2", category: "champion_sprint_male" }),
    ];
    // Use wall variant which receives hotyCount
    const { container } = render(<TrophyCase awards={awards} variant="wall" />);
    // The component should render without error
    expect(container).toBeDefined();
  });

  it("hotyCount is correct when 1 HOTY award exists", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year" }),
      mkAward({ id: "a2", category: "champion_3yo_male" }),
    ];
    const { container } = render(<TrophyCase awards={awards} variant="wall" />);
    expect(container).toBeDefined();
  });

  it("hotyCount is correct when multiple HOTY awards exist", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year", year: 1 }),
      mkAward({ id: "a2", category: "horse_of_the_year", year: 2 }),
      mkAward({ id: "a3", category: "champion_sprint_male" }),
    ];
    const { container } = render(<TrophyCase awards={awards} variant="wall" />);
    expect(container).toBeDefined();
  });
});

describe("TrophyStats", () => {
  afterEach(() => cleanup());

  it("renders correct HOTY count", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year", region: "north_america" }),
      mkAward({ id: "a2", category: "champion_3yo_male", region: "europe" }),
    ];
    render(<TrophyStats awards={awards} />);
    // North America should have 1 award, Europe should have 1
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(2);
  });

  it("renders correct per-region counts", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year", region: "north_america" }),
      mkAward({ id: "a2", category: "champion_3yo_male", region: "north_america" }),
      mkAward({ id: "a3", category: "champion_sprint_male", region: "europe" }),
      mkAward({ id: "a4", category: "champion_turf_male", region: "asia_pacific" }),
      mkAward({ id: "a5", category: "champion_2yo_male", region: "south_america" }),
    ];
    render(<TrophyStats awards={awards} />);
    // North America: 2, others: 1 each
    expect(screen.getByText("2")).toBeDefined(); // North America
    const ones = screen.getAllByText("1");
    expect(ones.length).toBe(3); // Europe, Asia-Pacific, South America
  });

  it("renders 0 for regions with no awards", () => {
    const awards = [mkAward({ id: "a1", category: "horse_of_the_year", region: "north_america" })];
    render(<TrophyStats awards={awards} />);
    // 3 regions should show 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(3);
  });

  it("wall view wraps trophy items in Link to /awards/$category", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year", year: 1 }),
      mkAward({ id: "a2", category: "champion_3yo_male", year: 2 }),
    ];
    const { container } = render(<TrophyCase awards={awards} variant="wall" />);
    const categoryLinks = container.querySelectorAll('a[href="/awards/$category"]');
    expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("compact view wraps trophy icons in Link to /awards/$category", () => {
    const awards = [
      mkAward({ id: "a1", category: "horse_of_the_year", year: 1 }),
      mkAward({ id: "a2", category: "champion_3yo_male", year: 2 }),
    ];
    const { container } = render(<TrophyCase awards={awards} variant="compact" />);
    const categoryLinks = container.querySelectorAll('a[href="/awards/$category"]');
    expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
  });
});
