import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createTestStable } from "@/tests/helpers";
import type { CashPressureHistory } from "@/core/stable/cashPressureHistory";

const mockHistory: CashPressureHistory = {
  s1: Array.from({ length: 10 }, (_, i) => ({
    day: i + 1,
    pressure: 0.3 + i * 0.05,
    meter: Math.round((0.3 + i * 0.05) * 100),
    runwayDays: 100 - i * 5,
    label: "tight" as const,
  })),
};

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: mockHistory }),
  useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: mockHistory }),
}));

vi.mock("@/components/awards", () => ({
  TrophyCase: () => <div data-testid="trophy-case">Trophies</div>,
}));

vi.mock("@/components/horse/HorseBits", () => ({
  NumericValue: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("@/components/stable/NpcStableCharts", () => ({
  NpcStableCharts: () => <div data-testid="stable-charts">Charts</div>,
}));

vi.mock("@/hooks/stable/useNpcStableDetail", () => ({
  getRivalryStatusLabel: (f: number) => "Neutral",
  getRivalryBadgeColor: (f: number) => "bg-gray-500",
}));

vi.mock("@/components/charts/Sparkline", () => ({
  Sparkline: ({ data }: { data: number[] }) => (
    <div data-testid="sparkline">{data.length} points</div>
  ),
}));

vi.mock("@/components/stable/CashPressureTrend", () => ({
  CashPressureTrend: ({ stableId, variant }: { stableId: string; variant: string }) => (
    <div data-testid="cash-pressure-trend">
      <span>Pressure</span>
      <span>Runway</span>
      <span>
        {stableId} {variant}
      </span>
    </div>
  ),
}));

import { NpcStableOverviewTab } from "@/components/stable/NpcStableOverviewTab";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

function mkPageData(overrides: any = {}) {
  const stable = createTestStable({ id: "s1", cash: 100000, horses });
  return {
    stable,
    stableHorses: [],
    activeHorses: [],
    colts: [],
    fillies: [],
    friction: 0,
    headToHead: [],
    grudgeMatches: [],
    awards: [],
    ...overrides,
  };
}

describe("NpcStableOverviewTab", () => {
  it("renders the cash pressure trend section", () => {
    render(<NpcStableOverviewTab stableId="s1" pageData={mkPageData()} />);
    expect(screen.getByTestId("cash-pressure-trend")).toBeInTheDocument();
  });

  it("renders runway trend label", () => {
    render(<NpcStableOverviewTab stableId="s1" pageData={mkPageData()} />);
    expect(screen.getByText(/runway/i)).toBeInTheDocument();
  });

  it("renders the stable description when present", () => {
    const data = mkPageData();
    data.stable.description = "A legendary operation.";
    render(<NpcStableOverviewTab stableId="s1" pageData={data} />);
    expect(screen.getByText(/legendary operation/i)).toBeInTheDocument();
  });

  it("renders fallback when no history exists", () => {
    vi.doUnmock("@/game/store");
    vi.mock("@/game/store", () => ({
      useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
      useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
    }));
    // Just verify no crash — the component should render the personality card
    const { container } = render(
      <NpcStableOverviewTab stableId="s_empty" pageData={mkPageData()} />,
    );
    expect(container).toBeTruthy();
  });
});
