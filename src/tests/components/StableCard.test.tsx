import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Stable, PrivateSaleOffer } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockState: Record<string, any> = {
  privateSaleOffers: [] as PrivateSaleOffer[],
  horses: {},
  reputation: { score: 0 },
  cashPressureHistory: {},
};

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/hooks/stable/useCompareStables", () => ({
  useCompareStables: () => ({
    ids: [],
    toggle: vi.fn(),
    has: (id: string) => false,
  }),
}));

import { StableCard } from "@/components/stable/StableCard";

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "elite",
    reputation: 50,
    founded: 2020,
    cash: 100000,
    horses: ["h1", "h2", "h3"],
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    personality: "aggressive",
    staff: {},
    outposts: [],
    ...overrides,
  }) as Stable;

describe("StableCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.privateSaleOffers = [];
    mockState.horses = {};
    mockState.reputation = { score: 0 };
    mockState.cashPressureHistory = {};
  });

  afterEach(() => {
    cleanup();
  });

  it("renders stable name and country", () => {
    render(<StableCard stable={mkStable({ name: "Alpha Stables", country: "Ireland" })} />);
    expect(screen.getByText("Alpha Stables")).toBeInTheDocument();
    expect(screen.getByText("Ireland")).toBeInTheDocument();
  });

  it("renders tier badge with correct tier text", () => {
    render(<StableCard stable={mkStable({ tier: "mid" })} />);
    expect(screen.getByText("mid")).toBeInTheDocument();
  });

  it("renders custom description when stable.description is provided", () => {
    render(<StableCard stable={mkStable({ description: "A legendary operation." })} />);
    expect(screen.getByText("A legendary operation.")).toBeInTheDocument();
  });

  it("renders fallback description when no description", () => {
    const stable = mkStable({ owner: "John Doe", horses: ["h1", "h2"] });
    delete (stable as any).description;
    render(<StableCard stable={stable} />);
    expect(screen.getByText("John Doe's racing operation with 2 horses.")).toBeInTheDocument();
  });

  it("renders correct horse count", () => {
    render(<StableCard stable={mkStable({ horses: ["h1", "h2", "h3", "h4", "h5"] })} />);
    expect(screen.getByText("5 horses")).toBeInTheDocument();
  });

  it("renders reputation stars via getReputationStars", () => {
    render(<StableCard stable={mkStable({ reputation: 80 })} />);
    const repSpan = screen.getByTitle("Reputation: 80");
    expect(repSpan.textContent).toBe("★★★★☆");
  });

  it("link targets /npc-stables/$stableId route", () => {
    const { container } = render(<StableCard stable={mkStable({ id: "abc123" })} />);
    const link = container.querySelector('a[to*="/npc-stables/"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute("to")).toBe("/npc-stables/$stableId");
  });

  it("renders recommended max offer line with ratio text", () => {
    render(<StableCard stable={mkStable({ cash: 10_000_000 })} />);
    // aggressive base accept = 0.7 → 70%
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("renders a compare toggle button", () => {
    render(<StableCard stable={mkStable()} />);
    const toggle = screen.getByRole("button", { name: /compare/i });
    expect(toggle).toBeInTheDocument();
  });
});
