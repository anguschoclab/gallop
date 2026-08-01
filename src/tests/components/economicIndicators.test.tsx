/**
 * Economic Indicators Component Tests
 *
 * Verifies that the EconomicIndicators component renders economic trend data
 * from the NPC AI manager's globalEconomicState.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EconomicIndicators } from "@/components/analytics/EconomicIndicators";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) =>
    selector({
      npcAIManager: {
        globalEconomicState: {
          studFeeTrend: 0.05,
          yearlingPriceIndex: 110,
          claimingMarketActivity: 3,
        },
      },
    }),
}));

describe("EconomicIndicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders stud fee trend", () => {
    render(<EconomicIndicators />);
    expect(screen.getByText(/stud fee/i)).toBeDefined();
  });

  it("renders yearling price index", () => {
    render(<EconomicIndicators />);
    expect(screen.getByText(/yearling/i)).toBeDefined();
  });

  it("renders claiming market activity", () => {
    render(<EconomicIndicators />);
    expect(screen.getByText(/claiming/i)).toBeDefined();
  });

  it("displays numeric values from globalEconomicState", () => {
    render(<EconomicIndicators />);
    // Should show the yearling price index value
    expect(screen.getByText(/110/)).toBeDefined();
  });
});
