import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Stable } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
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
});
