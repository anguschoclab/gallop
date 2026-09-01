import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Stable } from "@/game/types";

// Mock the Drawer primitive to always render children (avoid vaul portal complexity)
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
  useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
}));

vi.mock("@/hooks/game/useSystemsState", () => ({
  useNpcStables: () =>
    [
      { id: "s1", name: "Alpha", horses: [], cash: 100000, tier: "mid", personality: "aggressive" },
    ] as unknown as Stable[],
}));

vi.mock("@/components/stable/StableCompareTable", () => ({
  StableCompareTable: ({ stables }: { stables: Stable[] }) => (
    <div data-testid="compare-table">Table with {stables.length} stables</div>
  ),
}));

import { StableCompareDrawer } from "@/components/stable/StableCompareDrawer";
import { useCompareStables } from "@/hooks/stable/useCompareStables";

describe("StableCompareDrawer", () => {
  beforeEach(() => {
    useCompareStables.getState().clear();
  });

  afterEach(() => {
    cleanup();
    useCompareStables.getState().clear();
  });

  it("renders the compare table when open with selected stables", () => {
    useCompareStables.getState().add("s1");
    render(<StableCompareDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("compare-table")).toBeInTheDocument();
  });

  it("renders empty state when no stables selected", () => {
    render(<StableCompareDrawer open={true} onOpenChange={() => {}} />);
    // The table is rendered with 0 stables (empty state handled by StableCompareTable)
    expect(screen.getByTestId("compare-table")).toBeInTheDocument();
    expect(screen.getByTestId("compare-table").textContent).toContain("0");
  });

  it("shows clear button that resets the compare set", () => {
    useCompareStables.getState().add("s1");
    render(<StableCompareDrawer open={true} onOpenChange={() => {}} />);
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(useCompareStables.getState().ids).toEqual([]);
  });
});
