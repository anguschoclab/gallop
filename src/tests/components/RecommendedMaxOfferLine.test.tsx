import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendedMaxOfferLine } from "@/components/stable/RecommendedMaxOfferLine";
import { createTestStable } from "@/tests/helpers";
import type { StablePersonality } from "@/game/types";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

describe("RecommendedMaxOfferLine", () => {
  it("renders the accept threshold as a percentage", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} />);
    // aggressive base accept = 0.7 → 70%
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("renders softening gap when under cash pressure", () => {
    const stable = createTestStable({
      cash: 100,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} />);
    // Should mention softening / "down from" or "pts"
    expect(screen.getByText(/pts|down from/i)).toBeInTheDocument();
  });

  it("renders dollar max offer when ask is provided", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} ask={100_000} />);
    // maxOfferAmount = round(100000 * 0.7) = 70000
    expect(screen.getByText(/\$70,000/)).toBeInTheDocument();
  });

  it("renders shortfall when offer is below threshold", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} ask={100_000} offerAmount={40_000} />);
    // shortfall = 70000 - 40000 = 30000
    expect(screen.getByText(/\$30,000/)).toBeInTheDocument();
  });

  it("renders 'will accept' chip when projected outcome is accepted", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} ask={100_000} offerAmount={120_000} />);
    expect(screen.getByText(/will accept/i)).toBeInTheDocument();
  });

  it("renders 'will counter' chip when projected outcome is countered", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} ask={100_000} offerAmount={60_000} />);
    expect(screen.getByText(/will counter/i)).toBeInTheDocument();
  });

  it("renders 'will decline' chip when projected outcome is declined", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    render(<RecommendedMaxOfferLine stable={stable} ask={100_000} offerAmount={20_000} />);
    expect(screen.getByText(/will decline/i)).toBeInTheDocument();
  });
});
