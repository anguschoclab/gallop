import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { RegionalAward } from "@/core/awards/types";
import { CATEGORY_DISPLAY_NAMES, CATEGORY_DESCRIPTIONS } from "@/core/awards/types";

const params: { category: string } = { category: "horse_of_the_year" };

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => ({
    options: config,
    useParams: () => params,
  }),
  Link: ({ children, to, params: p, search }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={typeof to === "string" ? to : ""}
      data-params={p ? JSON.stringify(p) : ""}
      data-search={search ? JSON.stringify(search) : ""}
    >
      {children}
    </a>
  ),
}));

import { Route } from "@/routes/awards.$category";

const CategoryPage = () => {
  const Component = Route.options.component!;
  return <Component />;
};

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

function seed(awards: RegionalAward[]) {
  useGame.setState({
    ...createDefaultGameState(),
    awards,
  } as any);
}

describe("/awards/$category route", () => {
  afterEach(() => {
    cleanup();
    params.category = "horse_of_the_year";
  });

  it("renders category display name as heading", () => {
    params.category = "horse_of_the_year";
    seed([mkAward({ id: "a1" })]);
    render(<CategoryPage />);
    expect(screen.getByText(CATEGORY_DISPLAY_NAMES.horse_of_the_year)).toBeTruthy();
  });

  it("renders category description from CATEGORY_DESCRIPTIONS", () => {
    params.category = "horse_of_the_year";
    seed([mkAward({ id: "a1" })]);
    render(<CategoryPage />);
    expect(screen.getByText(CATEGORY_DESCRIPTIONS.horse_of_the_year)).toBeTruthy();
  });

  it("shows all past winners sorted by year descending", () => {
    params.category = "horse_of_the_year";
    seed([
      mkAward({ id: "a1", year: 3, horseName: "Thunder" }),
      mkAward({ id: "a2", year: 5, horseName: "Lightning" }),
      mkAward({ id: "a3", year: 1, horseName: "Storm" }),
    ]);
    const { container } = render(<CategoryPage />);
    const winnerLinks = container.querySelectorAll('a[data-to="/stable/$horseId"]');
    expect(winnerLinks.length).toBe(3);
    // Year 5 first, then 3, then 1
    expect(winnerLinks[0].textContent).toBe("Lightning");
    expect(winnerLinks[1].textContent).toBe("Thunder");
    expect(winnerLinks[2].textContent).toBe("Storm");
  });

  it("each winner row links to /stable/$horseId", () => {
    params.category = "horse_of_the_year";
    seed([mkAward({ id: "a1", horseId: "h1", horseName: "Thunder" })]);
    const { container } = render(<CategoryPage />);
    const link = container.querySelector('a[data-to="/stable/$horseId"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "h1" }));
  });

  it("renders back-link to /honors with tab=awards search", () => {
    params.category = "horse_of_the_year";
    seed([mkAward({ id: "a1" })]);
    const { container } = render(<CategoryPage />);
    const backLink = container.querySelector('a[data-to="/honors"]');
    expect(backLink).not.toBeNull();
    const search = backLink?.getAttribute("data-search");
    expect(search).toContain('"tab":"awards"');
  });

  it("shows not-found message for invalid category", () => {
    params.category = "invalid_category";
    seed([]);
    render(<CategoryPage />);
    expect(screen.getAllByText(/not found|invalid|unknown/i).length).toBeGreaterThanOrEqual(1);
  });

  it("filters awards by the requested category only", () => {
    params.category = "horse_of_the_year";
    seed([
      mkAward({ id: "a1", category: "horse_of_the_year", horseName: "HOTY Winner" }),
      mkAward({ id: "a2", category: "champion_3yo_male", horseName: "Other Winner" }),
    ]);
    const { container } = render(<CategoryPage />);
    const winnerLinks = container.querySelectorAll('a[data-to="/stable/$horseId"]');
    expect(winnerLinks.length).toBe(1);
    expect(winnerLinks[0].textContent).toBe("HOTY Winner");
  });
});
