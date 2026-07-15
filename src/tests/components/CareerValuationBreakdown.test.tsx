import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CareerValuationBreakdown } from "@/components/horse/CareerValuationBreakdown";
import { formatCurrency } from "@/core/common/formatting";
import type { HorseCareerValuation } from "@/core/horse/pricing";

const sampleValuation: HorseCareerValuation = {
  racing: 50000,
  breeding: 100000,
  current: 75000,
  preCareer: 80000,
  postCareer: 120000,
};

describe("CareerValuationBreakdown", () => {
  it("renders all 5 rows with correct labels", () => {
    render(<CareerValuationBreakdown valuation={sampleValuation} />);

    expect(screen.getByText("Racing")).toBeTruthy();
    expect(screen.getByText("Breeding")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("Pre-Career")).toBeTruthy();
    expect(screen.getByText("Post-Career")).toBeTruthy();
  });

  it("renders formatted currency values for each row", () => {
    render(<CareerValuationBreakdown valuation={sampleValuation} />);

    expect(screen.getByText(formatCurrency(50000))).toBeTruthy();
    expect(screen.getByText(formatCurrency(100000))).toBeTruthy();
    expect(screen.getByText(formatCurrency(75000))).toBeTruthy();
    expect(screen.getByText(formatCurrency(80000))).toBeTruthy();
    expect(screen.getByText(formatCurrency(120000))).toBeTruthy();
  });

  it("highlights the Current row with border-t and bold styling", () => {
    const { container } = render(<CareerValuationBreakdown valuation={sampleValuation} />);

    const currentLabel = screen.getByText("Current");
    const currentRow = currentLabel.closest("div");

    expect(currentRow).toBeTruthy();
    expect(currentRow?.className).toContain("border-t");
  });
});
