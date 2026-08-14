import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...rest }: { children: React.ReactNode; to: string; params: Record<string, string> } & Record<string, unknown>) => (
    <a href={to} data-params={JSON.stringify(params)} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-tab={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-content={value}>{children}</div>
  ),
}));

vi.mock("@/components/charts", () => ({
  DeltaPill: ({ value }: { value: number }) => <span data-testid="delta">{value}</span>,
  MetricInfo: () => <span data-testid="metric-info" />,
  Sparkline: () => <div data-testid="sparkline" />,
  AreaTrend: () => <div data-testid="area-trend" />,
  chartColors: { primary: "#000", tertiary: "#333" },
  formatCurrencyCompact: (n: number) => `$${n.toLocaleString()}`,
}));

import { RegionDrilldownDrawer } from "@/components/dashboard/RegionDrilldownDrawer";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";

const makeRace = (id: string, track = "Belmont Park"): Race =>
  ({
    id,
    name: `Race ${id}`,
    day: 100,
    distance: 1600,
    entries: [],
    resolved: true,
    fieldSize: 10,
    entryFee: 0,
    purse: 100000,
    raceClass: "allowance",
    graded: { key: id, grade: "G1", track, surface: "Dirt" },
  }) as unknown as Race;

const makeHorse = (
  id: string,
  raceId: string,
  position: number,
  earned: number,
  surface = "Dirt",
  distance = 1600,
): Horse =>
  ({
    id,
    name: `Horse ${id}`,
    owned: true,
    raceHistory: [
      {
        raceId,
        raceName: "Test Race",
        position,
        day: 100,
        purseEarned: earned,
        grade: "G1",
        jockeyId: "j1",
        stableId: "player",
        surface,
        distance,
      },
    ],
  }) as unknown as Horse;

const lookups = {
  jockeyNames: new Map([
    ["j1", "Jockey One"],
    ["j2", "Jockey Two"],
  ]),
  stableNames: new Map([["player", "My Stable"]]),
  trainerByStable: new Map<string, { id: string; name: string }>([
    ["player", { id: "t1", name: "Trainer One" }],
  ]),
};

const defaultProps = {
  region: "usa" as const,
  weeks: 12 as const,
  horses: [makeHorse("h1", "r1", 1, 50000), makeHorse("h2", "r1", 2, 20000, "Turf", 1200)],
  races: [makeRace("r1")],
  day: 100,
  lookups,
  onClose: vi.fn(),
};

describe("RegionDrilldownDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the drawer when region is set", () => {
    render(<RegionDrilldownDrawer {...defaultProps} />);
    expect(screen.getByTestId("sheet")).toBeDefined();
  });

  it("does not render when region is null", () => {
    render(<RegionDrilldownDrawer {...defaultProps} region={null} />);
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("shows metric toggle buttons for Raw and Per-start rates", () => {
    render(<RegionDrilldownDrawer {...defaultProps} />);
    expect(screen.getByText("Raw")).toBeDefined();
    expect(screen.getByText("Per-start rates")).toBeDefined();
  });

  it("switches displayed column headers when metric toggle is clicked", () => {
    const { container } = render(<RegionDrilldownDrawer {...defaultProps} />);
    // Initially shows raw metric headers (Starts, Wins, etc.)
    expect(container.textContent).toContain("Starts");
    expect(container.textContent).toContain("Earnings");
    // Click "Per-start rates"
    fireEvent.click(screen.getByText("Per-start rates"));
    // Should now show rate metric headers
    expect(container.textContent).toContain("Wins/Start");
    expect(container.textContent).toContain("Top 3 %");
  });

  it("switches back to raw when Raw is clicked after rate", () => {
    const { container } = render(<RegionDrilldownDrawer {...defaultProps} />);
    fireEvent.click(screen.getByText("Per-start rates"));
    expect(container.textContent).toContain("Wins/Start");
    fireEvent.click(screen.getByText("Raw"));
    expect(container.textContent).toContain("Starts");
    expect(container.textContent).toContain("Earnings");
  });

  it("shows surface filter checkboxes", () => {
    render(<RegionDrilldownDrawer {...defaultProps} />);
    expect(screen.getByText("Turf")).toBeDefined();
    expect(screen.getByText("Dirt")).toBeDefined();
    expect(screen.getByText("Synthetic")).toBeDefined();
  });

  it("shows distance preset chips", () => {
    render(<RegionDrilldownDrawer {...defaultProps} />);
    expect(screen.getByText("Sprint")).toBeDefined();
    expect(screen.getByText("Mile")).toBeDefined();
    expect(screen.getByText("Route")).toBeDefined();
    expect(screen.getByText("Staying")).toBeDefined();
    expect(screen.getByText("All")).toBeDefined();
  });

  it("expands entity detail panel when jockey row is clicked", () => {
    const { container } = render(<RegionDrilldownDrawer {...defaultProps} />);
    // Click on the jockey row (Jockey One appears in the entity table)
    const jockeyRow = screen.getByText("Jockey One");
    fireEvent.click(jockeyRow);
    // EntityDetailPanel should render with run log
    expect(container.textContent).toContain("Test Race");
  });

  it("collapses entity detail panel when expanded row is clicked again", () => {
    const { container } = render(<RegionDrilldownDrawer {...defaultProps} />);
    const jockeyRow = screen.getByText("Jockey One");
    fireEvent.click(jockeyRow);
    expect(container.textContent).toContain("Test Race");
    fireEvent.click(jockeyRow);
    expect(container.textContent).not.toContain("Test Race");
  });
});
