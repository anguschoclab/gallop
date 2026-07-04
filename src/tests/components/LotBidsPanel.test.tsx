import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LotBidsPanel } from "@/components/auction/LotBidsPanel";
import { createTestStable } from "@/tests/helpers";
import type { AuctionBidRecord, Stable } from "@/game/types";

function mkBid(stableId: string | undefined, amount: number, tick: number): AuctionBidRecord {
  return { stableId, amount, tick };
}

function mkStables(): Stable[] {
  return [
    createTestStable({ id: "s1", name: "Godolphin" }),
    createTestStable({ id: "s2", name: "Coolmore" }),
  ];
}

describe("LotBidsPanel", () => {
  it("renders skeleton state when bidHistory is undefined", () => {
    render(<LotBidsPanel bidHistory={undefined} stables={[]} />);
    expect(screen.getByRole("status", { name: /loading bids/i })).toBeTruthy();
  });

  it("renders skeleton state when isLoading is true", () => {
    render(<LotBidsPanel bidHistory={[]} stables={[]} isLoading={true} />);
    expect(screen.getByRole("status", { name: /loading bids/i })).toBeTruthy();
  });

  it("renders empty state when bidHistory is empty array", () => {
    render(<LotBidsPanel bidHistory={[]} stables={[]} />);
    expect(screen.getByText(/no bids yet/i)).toBeTruthy();
  });

  it("renders bid rows when bidHistory has entries", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
  });

  it("displays bids in newest-first order (reversed)", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2), mkBid("s1", 3000, 3)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].textContent).toContain("3,000");
    expect(rows[2].textContent).toContain("1,000");
  });

  it("shows YOU label for player bids (stableId undefined)", () => {
    const bids = [mkBid(undefined, 5000, 1)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("shows stable name for NPC bids (stableId from stables map)", () => {
    const bids = [mkBid("s1", 5000, 1)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("Godolphin")).toBeTruthy();
  });

  it("shows stableId fallback when stable not in stables map", () => {
    const bids = [mkBid("unknown-stable", 5000, 1)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("unknown-stable")).toBeTruthy();
  });

  it("displays bid count in header", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("2 bids")).toBeTruthy();
  });

  it("displays singular 'bid' when only one bid", () => {
    const bids = [mkBid("s1", 1000, 1)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("1 bid")).toBeTruthy();
  });

  it("displays tick number for each bid", () => {
    const bids = [mkBid("s1", 1000, 5)];
    render(<LotBidsPanel bidHistory={bids} stables={mkStables()} />);
    expect(screen.getByText("t5")).toBeTruthy();
  });
});
