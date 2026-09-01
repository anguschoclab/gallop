import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: {}, npcStables: [] }),
  useGameWithShallow: (selector: (s: any) => any) =>
    selector({ cashPressureHistory: {}, npcStables: [] }),
}));

vi.mock("@/components/stable/StableCompareDrawer", () => ({
  StableCompareDrawer: ({ open }: { open: boolean }) => (
    <div data-testid="drawer">{open ? "open" : "closed"}</div>
  ),
}));

import { StableCompareBar } from "@/components/stable/StableCompareBar";
import { useCompareStables } from "@/hooks/stable/useCompareStables";

describe("StableCompareBar", () => {
  beforeEach(() => {
    useCompareStables.getState().clear();
  });

  afterEach(() => {
    cleanup();
    useCompareStables.getState().clear();
  });

  it("does not render when no stables are selected", () => {
    const { container } = render(<StableCompareBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with correct count when stables are selected", () => {
    useCompareStables.getState().add("s1");
    useCompareStables.getState().add("s2");
    render(<StableCompareBar />);
    expect(screen.getByText(/compare/i)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("open button triggers drawer open state", () => {
    useCompareStables.getState().add("s1");
    render(<StableCompareBar />);
    const openBtn = screen.getByRole("button", { name: /compare|open/i });
    fireEvent.click(openBtn);
    // After click, the drawer should be rendered open
    expect(screen.getByTestId("drawer").textContent).toBe("open");
  });

  it("clear button resets the compare set", () => {
    useCompareStables.getState().add("s1");
    render(<StableCompareBar />);
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(useCompareStables.getState().ids).toEqual([]);
  });
});
