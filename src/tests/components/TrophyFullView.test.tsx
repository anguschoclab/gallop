import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrophyFullView } from "@/components/awards/TrophyFullView";
import type { RegionalAward } from "@/core/awards/types";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="header">{children}</div>
  ),
  CardTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children?: React.ReactNode; value: string }) => (
    <div data-testid={`content-${value}`}>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select data-testid="sort-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: () => null,
}));

vi.mock("@/components/awards/AwardsGrid", () => ({
  AwardsGrid: ({ awards }: { awards: RegionalAward[] }) => (
    <div data-testid="grid">
      {awards.map((a, i) => (
        <div key={i} data-testid="award-item">
          {a.category} · {a.region} · {a.year}
        </div>
      ))}
    </div>
  ),
}));

function makeAwards(): RegionalAward[] {
  return [
    {
      id: "a1",
      year: 2024,
      region: "north_america",
      category: "horse_of_the_year",
      horseId: "h1",
      horseName: "Horse A",
    },
    {
      id: "a2",
      year: 2023,
      region: "south_america",
      category: "potrillo_del_ano",
      horseId: "h2",
      horseName: "Horse B",
    },
    {
      id: "a3",
      year: 2024,
      region: "asia_pacific",
      category: "champion_2yo",
      horseId: "h3",
      horseName: "Horse C",
    },
  ] as unknown as RegionalAward[];
}

describe("TrophyFullView sorting", () => {
  it("renders a sort dropdown", () => {
    render(<TrophyFullView awards={makeAwards()} totalAwards={3} hotyCount={1} />);
    expect(screen.getByTestId("sort-select")).toBeTruthy();
  });

  it("defaults to year sort (newest first)", () => {
    render(<TrophyFullView awards={makeAwards()} totalAwards={3} hotyCount={0} />);
    const items = screen.getAllByTestId("award-item").map((el) => el.textContent);
    expect(items[0]).toContain("2024");
    expect(items[items.length - 1]).toContain("2023");
  });

  it("sorts by region using ceremony order, not alphabetical", () => {
    render(<TrophyFullView awards={makeAwards()} totalAwards={3} hotyCount={0} />);
    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "region" } });
    const items = screen.getAllByTestId("award-item").map((el) => el.textContent);
    expect(items[0]).toContain("south_america");
    expect(items[1]).toContain("asia_pacific");
    expect(items[2]).toContain("north_america");
  });

  it("sorts by category using CATEGORY_DISPLAY_NAMES order, not alphabetical", () => {
    render(<TrophyFullView awards={makeAwards()} totalAwards={3} hotyCount={0} />);
    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "category" } });
    const items = screen.getAllByTestId("award-item").map((el) => el.textContent);
    expect(items[0]).toContain("horse_of_the_year");
    expect(items[1]).toContain("champion_2yo");
    expect(items[2]).toContain("potrillo_del_ano");
  });
});
