import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StableCompareTable } from "@/components/stable/StableCompareTable";
import { createTestStable } from "@/tests/helpers";
import type { StablePersonality } from "@/game/types";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
  useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
}));

describe("StableCompareTable", () => {
  it("renders a column per stable", () => {
    const stables = [
      createTestStable({
        id: "s1",
        name: "Alpha",
        personality: "aggressive" as StablePersonality,
        horses,
      }),
      createTestStable({
        id: "s2",
        name: "Beta",
        personality: "conservative" as StablePersonality,
        horses,
      }),
    ];
    render(<StableCompareTable stables={stables} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders runway days row", () => {
    const stable = createTestStable({ id: "s1", name: "Alpha", cash: 100000, horses });
    render(<StableCompareTable stables={[stable]} />);
    expect(screen.getByText(/runway/i)).toBeInTheDocument();
  });

  it("renders accept threshold row", () => {
    const stable = createTestStable({ id: "s1", name: "Alpha", cash: 100000, horses });
    render(<StableCompareTable stables={[stable]} />);
    expect(screen.getByText(/accept/i)).toBeInTheDocument();
  });

  it("renders counter multiplier row", () => {
    const stable = createTestStable({ id: "s1", name: "Alpha", cash: 100000, horses });
    render(<StableCompareTable stables={[stable]} />);
    expect(screen.getByText(/counter/i)).toBeInTheDocument();
  });

  it("renders empty state when no stables", () => {
    const { container } = render(<StableCompareTable stables={[]} />);
    expect(container.textContent).toMatch(/no stables|empty|select/i);
  });
});
