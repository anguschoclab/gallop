import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EconomicIndicators } from "@/components/analytics/EconomicIndicators";
import { renderWithStore } from "@/test-utils/renderWithStore";
import type { EconomicTrend } from "@/core/ai/strategicCoordinator";

function createMockEconomicTrend(overrides: Partial<EconomicTrend> = {}): EconomicTrend {
  return {
    studFeeTrend: 0.05,
    yearlingPriceIndex: 110,
    claimingMarketActivity: 50,
    ...overrides,
  };
}

describe("EconomicIndicators", () => {
  it("renders nothing when no economic state", () => {
    const { container } = renderWithStore(<EconomicIndicators />, {});
    expect(container.firstChild).toBeNull();
  });

  it("renders economic indicators when state present", () => {
    const trend = createMockEconomicTrend();
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText(/economic indicators/i)).toBeInTheDocument();
  });

  it("renders stud fee trend", () => {
    const trend = createMockEconomicTrend({ studFeeTrend: 0.08 });
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText(/stud fee trend/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.0%/)).toBeInTheDocument();
  });

  it("renders yearling price index", () => {
    const trend = createMockEconomicTrend({ yearlingPriceIndex: 120 });
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText(/yearling price index/i)).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("renders market phase badge", () => {
    const trend = createMockEconomicTrend({
      studFeeTrend: 0.05,
      yearlingPriceIndex: 110,
    });
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText(/market phase/i)).toBeInTheDocument();
    expect(screen.getByText("expansion")).toBeInTheDocument();
  });

  it("renders contraction phase when both falling", () => {
    const trend = createMockEconomicTrend({
      studFeeTrend: -0.05,
      yearlingPriceIndex: 90,
    });
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText("contraction")).toBeInTheDocument();
  });

  it("renders signal explanation text", () => {
    const trend = createMockEconomicTrend({
      studFeeTrend: 0.05,
      yearlingPriceIndex: 115,
    });
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
      } as any,
    });
    expect(screen.getByText(/rising prices/i)).toBeInTheDocument();
  });

  it("renders history sparkline when economicHistory present", () => {
    const trend = createMockEconomicTrend();
    const history: EconomicTrend[] = [
      createMockEconomicTrend({ yearlingPriceIndex: 95 }),
      createMockEconomicTrend({ yearlingPriceIndex: 100 }),
      createMockEconomicTrend({ yearlingPriceIndex: 105 }),
      createMockEconomicTrend({ yearlingPriceIndex: 110 }),
    ];
    renderWithStore(<EconomicIndicators />, {
      npcAIManager: {
        stableStates: {},
        globalDay: 100,
        regionalKings: {},
        globalEconomicState: trend,
        economicHistory: history,
      } as any,
    });
    expect(screen.getByText(/yearling index history/i)).toBeInTheDocument();
  });
});
