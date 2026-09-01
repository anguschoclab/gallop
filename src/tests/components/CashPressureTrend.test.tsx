import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CashPressureHistory } from "@/core/stable/cashPressureHistory";

const mockHistory: CashPressureHistory = {
  s1: Array.from({ length: 10 }, (_, i) => ({
    day: i + 1,
    pressure: 0.3 + i * 0.05,
    meter: Math.round((0.3 + i * 0.05) * 100),
    runwayDays: 100 - i * 5,
    label: "tight" as const,
  })),
  s_empty: [],
};

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: mockHistory }),
  useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: mockHistory }),
}));

// Import after mock
import { CashPressureTrend } from "@/components/stable/CashPressureTrend";

describe("CashPressureTrend", () => {
  it("renders detail variant with pressure and runway labels when >= 2 samples", () => {
    render(<CashPressureTrend stableId="s1" variant="detail" />);
    expect(screen.getByText(/pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/runway/i)).toBeInTheDocument();
  });

  it("renders card variant with a mini sparkline (svg)", () => {
    const { container } = render(<CashPressureTrend stableId="s1" variant="card" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders null for card variant when no history exists", () => {
    const { container } = render(<CashPressureTrend stableId="s_empty" variant="card" />);
    // Card variant returns null for < 2 samples
    expect(container.firstChild).toBeNull();
  });

  it("renders fallback message for detail variant when no history exists", () => {
    const { container } = render(<CashPressureTrend stableId="s_empty" variant="detail" />);
    expect(container.textContent).toContain("Not enough history");
  });
});
