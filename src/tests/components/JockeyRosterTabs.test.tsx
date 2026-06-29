import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  useSearch: () => ({}),
}));

import { JockeyRosterTabs } from "@/components/jockey/JockeyRosterTabs";

function mkJockey(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Jockey ${id}`,
    silk: { primary: "#ff0000", secondary: "#00ff00", cap: "#0000ff", pattern: "solid" },
    stats: { wins: 10, places: 5, shows: 3, starts: 30 },
    archetype: "front_runner",
    ridingFee: 500,
    fame: 50,
    ...overrides,
  };
}

const defaultProps = {
  myJockeys: [mkJockey("j1"), mkJockey("j2")],
  market: [mkJockey("j3")],
  filterList: (list: any[]) => list,
  onRelease: vi.fn(),
  onHire: vi.fn(),
};

describe("JockeyRosterTabs", () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("My Jockeys tab: clicking a jockey card calls navigate with correct route params", () => {
    render(<JockeyRosterTabs {...defaultProps} />);
    const cards = screen.getAllByText("Jockey j1");
    fireEvent.click(cards[0]);
    expect(navigate).toHaveBeenCalledWith({
      to: "/jockey/$jockeyId",
      params: { jockeyId: "j1" },
    });
  });

  it("Available tab: clicking a jockey card calls navigate with correct route params", () => {
    render(<JockeyRosterTabs {...defaultProps} />);
    const marketTab = screen.getByText("Available");
    fireEvent.click(marketTab);
    const card = screen.getByText("Jockey j3");
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith({
      to: "/jockey/$jockeyId",
      params: { jockeyId: "j3" },
    });
  });

  it("does NOT assign to window.location.href on My Jockeys tab", () => {
    const originalHref = window.location.href;
    render(<JockeyRosterTabs {...defaultProps} />);
    const card = screen.getAllByText("Jockey j1")[0];
    fireEvent.click(card);
    expect(window.location.href).toBe(originalHref);
  });

  it("Release button calls onRelease with jockey ID", () => {
    render(<JockeyRosterTabs {...defaultProps} />);
    const releaseBtn = screen.getAllByText("Release")[0];
    fireEvent.click(releaseBtn);
    expect(defaultProps.onRelease).toHaveBeenCalledWith("j1");
  });

  it("Sign button calls onHire with jockey ID", () => {
    render(<JockeyRosterTabs {...defaultProps} />);
    fireEvent.click(screen.getByText("Available"));
    const signBtn = screen.getByText("Sign");
    fireEvent.click(signBtn);
    expect(defaultProps.onHire).toHaveBeenCalledWith("j3");
  });
});
