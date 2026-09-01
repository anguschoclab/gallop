import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createTestStable } from "@/tests/helpers";
import type { Stable, StablePersonality } from "@/game/types";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];
const mockStables: Stable[] = [
  createTestStable({
    id: "s1",
    name: "Alpha Stables",
    isMajor: true,
    horses,
    personality: "aggressive" as StablePersonality,
  }),
  createTestStable({
    id: "s2",
    name: "Beta Ranch",
    isMajor: true,
    horses,
    personality: "conservative" as StablePersonality,
  }),
  createTestStable({
    id: "s3",
    name: "Gamma Farm",
    isMajor: false,
    horses,
    personality: "balanced" as StablePersonality,
  }),
];

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
  useGameWithShallow: (selector: (s: any) => any) => selector({ cashPressureHistory: {} }),
}));

vi.mock("@/hooks/game/useSystemsState", () => ({
  useNpcStables: () => mockStables,
}));

vi.mock("@/core/stable/stableQueries", () => ({
  getMajorStables: (stables: Stable[]) => stables.filter((s) => s.isMajor),
}));

vi.mock("@/components/stable/StableCompareBar", () => ({
  StableCompareBar: () => <div data-testid="compare-bar">Bar</div>,
}));

import { NpcStablesCompare } from "@/routes/npc-stables.compare";
import { useCompareStables } from "@/hooks/stable/useCompareStables";

describe("NpcStablesCompare route", () => {
  beforeEach(() => {
    useCompareStables.getState().clear();
  });

  afterEach(() => {
    cleanup();
    useCompareStables.getState().clear();
  });

  it("renders a list of major stables with checkboxes", () => {
    render(<NpcStablesCompare />);
    expect(screen.getByText("Alpha Stables")).toBeInTheDocument();
    expect(screen.getByText("Beta Ranch")).toBeInTheDocument();
    // Non-major stable should NOT appear
    expect(screen.queryByText("Gamma Farm")).not.toBeInTheDocument();
  });

  it("renders the compare bar", () => {
    render(<NpcStablesCompare />);
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  it("checkbox toggle adds/removes stable from compare set", () => {
    render(<NpcStablesCompare />);
    const checkbox = screen.getByLabelText(/Alpha Stables/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(useCompareStables.getState().ids).toContain("s1");
    fireEvent.click(checkbox);
    expect(useCompareStables.getState().ids).not.toContain("s1");
  });

  it("name filter input filters the list", () => {
    render(<NpcStablesCompare />);
    const filterInput = screen.getByPlaceholderText(/filter|search/i);
    fireEvent.change(filterInput, { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha Stables")).toBeInTheDocument();
    expect(screen.queryByText("Beta Ranch")).not.toBeInTheDocument();
  });
});
