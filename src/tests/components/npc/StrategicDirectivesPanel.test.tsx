import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StrategicDirectivesPanel } from "@/components/npc/StrategicDirectivesPanel";
import type { StrategicDirective } from "@/core/ai/strategicCoordinator";

describe("StrategicDirectivesPanel", () => {
  it("renders empty state when no directives", () => {
    render(<StrategicDirectivesPanel directives={[]} />);
    expect(screen.getByText(/no active directives/i)).toBeInTheDocument();
  });

  it("renders empty state when directives is undefined", () => {
    render(<StrategicDirectivesPanel />);
    expect(screen.getByText(/no active directives/i)).toBeInTheDocument();
  });

  it("renders directives sorted by priority", () => {
    const directives: StrategicDirective[] = [
      { type: "racing_focus", priority: 2, weight: 0.6 },
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    render(<StrategicDirectivesPanel directives={directives} />);

    const items = screen.getAllByTestId("directive-item");
    expect(items).toHaveLength(2);
    // Priority 1 should come first
    expect(items[0]).toHaveTextContent("aggressive expansion");
    expect(items[1]).toHaveTextContent("racing focus");
  });

  it("displays weight as percentage", () => {
    const directives: StrategicDirective[] = [
      { type: "breeding_focus", priority: 1, weight: 0.75 },
    ];
    render(<StrategicDirectivesPanel directives={directives} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("formats directive type with spaces instead of underscores", () => {
    const directives: StrategicDirective[] = [
      { type: "market_speculation", priority: 1, weight: 0.8 },
    ];
    render(<StrategicDirectivesPanel directives={directives} />);

    expect(screen.getByText("market speculation")).toBeInTheDocument();
  });
});
