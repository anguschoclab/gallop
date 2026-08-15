import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import type { Jockey } from "@/core/jockey/types";
import type { JockeyTrait } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

import { JockeyRoster } from "@/components/jockey/JockeyRoster";

function mkJockey(id: string, overrides: Record<string, unknown> = {}): Jockey {
  return {
    id,
    name: `Jockey ${id}`,
    age: 25,
    archetype: "versatile",
    tier: "mid",
    stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
    potential: 75,
    traits: [] as JockeyTrait[],
    silk: { primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff", pattern: "solid" },
    careerStarts: 100,
    careerWins: 20,
    fame: 50,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    contractUntil: 100,
    ...overrides,
  } as unknown as Jockey;
}

describe("JockeyRoster — trait search & filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("text search matches jockey name (existing behavior preserved)", () => {
    const jockeys = [
      mkJockey("j1", { name: "Thunder Jockey" }),
      mkJockey("j2", { name: "Lightning Rider" }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const searchInput = screen.getByPlaceholderText(/jockey name/i);
    fireEvent.change(searchInput, { target: { value: "thunder" } });
    expect(screen.getByText("Thunder Jockey")).toBeTruthy();
    expect(screen.queryByText("Lightning Rider")).toBeNull();
  });

  it("text search 'gate' matches jockeys with gate_master trait", () => {
    const jockeys = [
      mkJockey("j1", { name: "Alice", traits: ["gate_master"] as JockeyTrait[] }),
      mkJockey("j2", { name: "Bob", traits: ["hill_specialist"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const searchInput = screen.getByPlaceholderText(/jockey name/i);
    fireEvent.change(searchInput, { target: { value: "gate" } });
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("text search 'bullring' matches jockeys with bullring_expert trait", () => {
    const jockeys = [
      mkJockey("j1", { name: "Charlie", traits: ["bullring_expert"] as JockeyTrait[] }),
      mkJockey("j2", { name: "Dave", traits: [] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const searchInput = screen.getByPlaceholderText(/jockey name/i);
    fireEvent.change(searchInput, { target: { value: "bullring" } });
    expect(screen.getByText("Charlie")).toBeTruthy();
    expect(screen.queryByText("Dave")).toBeNull();
  });

  it("jockey with no traits is not matched by trait search", () => {
    const jockeys = [
      mkJockey("j1", { name: "Eve", traits: [] as JockeyTrait[] }),
      mkJockey("j2", { name: "Frank", traits: ["gate_master"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const searchInput = screen.getByPlaceholderText(/jockey name/i);
    fireEvent.change(searchInput, { target: { value: "gate_master" } });
    expect(screen.queryByText("Eve")).toBeNull();
    expect(screen.getByText("Frank")).toBeTruthy();
  });

  it("trait filter dropdown filters to only jockeys with that trait", () => {
    const jockeys = [
      mkJockey("j1", { name: "Alice", traits: ["gate_master"] as JockeyTrait[] }),
      mkJockey("j2", { name: "Bob", traits: ["hill_specialist"] as JockeyTrait[] }),
      mkJockey("j3", { name: "Carol", traits: ["gate_master"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    // Find the trait filter select by label
    const traitSelect = screen.getByDisplayValue("All Traits");
    fireEvent.change(traitSelect, { target: { value: "gate_master" } });
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("trait filter 'all' shows all jockeys", () => {
    const jockeys = [
      mkJockey("j1", { name: "Alice", traits: ["gate_master"] as JockeyTrait[] }),
      mkJockey("j2", { name: "Bob", traits: ["hill_specialist"] as JockeyTrait[] }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    const traitSelect = screen.getByDisplayValue("All Traits");
    // Default is "all" — both should be visible
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("myJockeys partition shows jockeys with contractUntil and no stableId", () => {
    const jockeys = [
      mkJockey("j1", { name: "Signed Jockey", stableId: undefined, contractUntil: 100 }),
      mkJockey("j2", { name: "Market Jockey", stableId: undefined, contractUntil: undefined }),
      mkJockey("j3", { name: "Stable Jockey", stableId: "stable-1", contractUntil: 100 }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    // Header shows "Signed: 1" (j1) and "Available: 1" (j2)
    // j3 has stableId so it's in neither partition
    const text = document.body.textContent ?? "";
    expect(text).toContain("Signed:");
    expect(text).toMatch(/Signed:\s*1/);
    expect(text).toMatch(/Available:\s*1/);
  });

  it("jockeys with stableId appear in neither myJockeys nor market", () => {
    const jockeys = [
      mkJockey("j1", { name: "Free Agent", stableId: undefined, contractUntil: 100 }),
      mkJockey("j2", { name: "Owned By Stable", stableId: "stable-1", contractUntil: 100 }),
    ];
    renderWithStore(<JockeyRoster />, { jockeys });
    // Signed: 1 (j1), Available: 0 (j2 has stableId, excluded from both)
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/Signed:\s*1/);
    expect(text).toMatch(/Available:\s*0/);
  });
});
