/**
 * npcStablesCompare.test.tsx — Route tests for /npc-stables/compare.
 *
 * Closes the zero-coverage gap on the dedicated compare route. Verifies that
 * the selection list shows only major stables, the compare table receives the
 * correct stables for selected ids, dissolved/missing ids are filtered out,
 * and the filter input narrows the list.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { Stable } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => ({ options: config }),
  Link: ({ children, to, params: p }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={to ?? ""}
      data-params={p ? JSON.stringify(p) : ""}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/game/useSystemsState", () => ({
  useNpcStables: () =>
    [
      {
        id: "s1",
        name: "Alpha Stables",
        isMajor: true,
        horses: [],
        tier: "mid",
        cash: 100000,
        personality: "aggressive",
      },
      {
        id: "s2",
        name: "Beta Ranch",
        isMajor: true,
        horses: [],
        tier: "top",
        cash: 500000,
        personality: "passive",
      },
      {
        id: "s3",
        name: "Gamma Mini",
        isMajor: false,
        horses: [],
        tier: "low",
        cash: 1000,
        personality: "aggressive",
      },
    ] as unknown as Stable[],
}));

vi.mock("@/components/stable/StableCompareTable", () => ({
  StableCompareTable: ({ stables }: { stables: Stable[] }) => (
    <div data-testid="compare-table">Table with {stables.length} stables</div>
  ),
}));

vi.mock("@/components/stable/StableCompareBar", () => ({
  StableCompareBar: () => <div data-testid="compare-bar" />,
}));

import { Route } from "@/routes/npc-stables.compare";
import { useCompareStables } from "@/hooks/stable/useCompareStables";

const NpcStablesCompare = Route.options.component!;

describe("NpcStablesCompare route", () => {
  beforeEach(() => useCompareStables.getState().clear());
  afterEach(() => {
    cleanup();
    useCompareStables.getState().clear();
  });

  it("renders only major stables in the selection list", () => {
    render(<NpcStablesCompare />);
    expect(screen.getByText("Alpha Stables")).toBeInTheDocument();
    expect(screen.getByText("Beta Ranch")).toBeInTheDocument();
    expect(screen.queryByText("Gamma Mini")).not.toBeInTheDocument();
  });

  it("renders the compare table with selected stables", () => {
    useCompareStables.getState().add("s1");
    render(<NpcStablesCompare />);
    expect(screen.getByTestId("compare-table").textContent).toContain("1 stables");
  });

  it("skips dissolved/missing ids in the compare table", () => {
    useCompareStables.getState().add("s1");
    useCompareStables.getState().add("s-dissolved");
    render(<NpcStablesCompare />);
    expect(screen.getByTestId("compare-table").textContent).toContain("1 stables");
  });

  it("filter input narrows the stable list", () => {
    render(<NpcStablesCompare />);
    fireEvent.change(screen.getByPlaceholderText("Filter by name..."), {
      target: { value: "alpha" },
    });
    expect(screen.getByText("Alpha Stables")).toBeInTheDocument();
    expect(screen.queryByText("Beta Ranch")).not.toBeInTheDocument();
  });
});
