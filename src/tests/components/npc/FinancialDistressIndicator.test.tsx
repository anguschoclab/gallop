import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinancialDistressIndicator } from "@/components/npc/FinancialDistressIndicator";
import type { FinancialDistressState } from "@/core/ai/financialDistressAI";

function createMockDistress(
  overrides: Partial<FinancialDistressState> = {},
): FinancialDistressState {
  return {
    level: "healthy",
    daysOfCash: 120,
    recommendedActions: [],
    ...overrides,
  };
}

describe("FinancialDistressIndicator", () => {
  it("returns null when no distress state is provided", () => {
    const { container } = render(<FinancialDistressIndicator distress={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when distress level is healthy", () => {
    const { container } = render(
      <FinancialDistressIndicator distress={createMockDistress({ level: "healthy" })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders caution badge with days of cash", () => {
    render(
      <FinancialDistressIndicator
        distress={createMockDistress({ level: "caution", daysOfCash: 45 })}
      />,
    );
    expect(screen.getByText(/caution/i)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it("renders emergency level with warning styling", () => {
    render(
      <FinancialDistressIndicator
        distress={createMockDistress({ level: "emergency", daysOfCash: 15 })}
      />,
    );
    expect(screen.getByText(/emergency/i)).toBeInTheDocument();
  });

  it("renders critical level with alert styling", () => {
    render(
      <FinancialDistressIndicator
        distress={createMockDistress({ level: "critical", daysOfCash: 3 })}
      />,
    );
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it("displays recommended actions when present", () => {
    render(
      <FinancialDistressIndicator
        distress={createMockDistress({
          level: "emergency",
          daysOfCash: 10,
          recommendedActions: ["sell_underperformers", "halt_claiming"],
        })}
      />,
    );
    expect(screen.getByText(/sell underperformers/i)).toBeInTheDocument();
    expect(screen.getByText(/halt claiming/i)).toBeInTheDocument();
  });

  it("does not display actions section when no recommended actions", () => {
    render(
      <FinancialDistressIndicator
        distress={createMockDistress({ level: "caution", daysOfCash: 45, recommendedActions: [] })}
      />,
    );
    expect(screen.queryByText(/recommended actions/i)).not.toBeInTheDocument();
  });
});
