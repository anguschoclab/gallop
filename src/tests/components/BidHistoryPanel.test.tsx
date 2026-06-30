import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BidHistoryPanel } from "@/components/auction/BidHistoryPanel";
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

function mkBids(count: number): AuctionBidRecord[] {
  const bids: AuctionBidRecord[] = [];
  for (let i = 1; i <= count; i++) {
    bids.push(mkBid(i % 2 === 0 ? "s1" : "s2", i * 1000, i));
  }
  return bids;
}

function getBidRows(): HTMLElement[] {
  return screen.getAllByRole("listitem");
}

describe("BidHistoryPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty state when bidHistory is empty", () => {
    render(
      <BidHistoryPanel
        bidHistory={[]}
        stables={[]}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no bids yet/i)).toBeTruthy();
  });

  it("renders bids in newest-first order by default", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2), mkBid("s1", 3000, 3)];
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    const rows = getBidRows();
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain("3,000");
    expect(rows[2].textContent).toContain("1,000");
  });

  it("toggles to oldest-first when sort button clicked", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2), mkBid("s1", 3000, 3)];
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /oldest/i }));
    const rows = getBidRows();
    expect(rows[0].textContent).toContain("1,000");
    expect(rows[2].textContent).toContain("3,000");
  });

  it("toggles back to newest-first when clicked again", () => {
    const bids = [mkBid("s1", 1000, 1), mkBid("s2", 2000, 2), mkBid("s1", 3000, 3)];
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /oldest/i }));
    fireEvent.click(screen.getByRole("button", { name: /newest/i }));
    const rows = getBidRows();
    expect(rows[0].textContent).toContain("3,000");
    expect(rows[2].textContent).toContain("1,000");
  });

  it("shows only first PAGE_SIZE bids initially", () => {
    const bids = mkBids(25);
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(getBidRows().length).toBe(10);
  });

  it("shows Load more button when more bids exist", () => {
    const bids = mkBids(25);
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy();
  });

  it("Load more button reveals next PAGE_SIZE bids", () => {
    const bids = mkBids(25);
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(getBidRows().length).toBe(20);
    expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy();
  });

  it("Load more button hides when all bids shown", () => {
    const bids = mkBids(25);
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(getBidRows().length).toBe(25);
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("hides Load more when bids fit in one page", () => {
    const bids = mkBids(5);
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("resets visible count when bidHistory changes (new lot)", () => {
    const bids25 = mkBids(25);
    const { rerender } = render(
      <BidHistoryPanel
        bidHistory={bids25}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(getBidRows().length).toBe(20);
    const bids15 = mkBids(15);
    rerender(
      <BidHistoryPanel
        bidHistory={bids15}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(getBidRows().length).toBe(10);
    expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy();
  });

  it("renders error state when error prop is set", () => {
    render(
      <BidHistoryPanel
        bidHistory={mkBids(5)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
        error="Failed to load bid history"
      />,
    );
    expect(screen.getByText(/failed to load bid history/i)).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("calls onRetry when Retry button clicked in error state", () => {
    const onRetry = vi.fn();
    render(
      <BidHistoryPanel
        bidHistory={mkBids(5)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
        error="Failed to load bid history"
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders Place bid button when canPlaceBid is true", () => {
    render(
      <BidHistoryPanel
        bidHistory={mkBids(3)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
        canPlaceBid={true}
        onPlaceBid={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /place bid/i })).toBeTruthy();
  });

  it("hides Place bid button when canPlaceBid is false/omitted", () => {
    render(
      <BidHistoryPanel
        bidHistory={mkBids(3)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /place bid/i })).toBeNull();
  });

  it("calls onPlaceBid when Place bid button clicked", () => {
    const onPlaceBid = vi.fn();
    render(
      <BidHistoryPanel
        bidHistory={mkBids(3)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
        canPlaceBid={true}
        onPlaceBid={onPlaceBid}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /place bid/i }));
    expect(onPlaceBid).toHaveBeenCalledTimes(1);
  });

  it("renders inside a Sheet controlled by historyOpen", () => {
    const { rerender } = render(
      <BidHistoryPanel
        bidHistory={mkBids(3)}
        stables={mkStables()}
        historyOpen={false}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/bid history \(3\)/i)).toBeNull();
    rerender(
      <BidHistoryPanel
        bidHistory={mkBids(3)}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/bid history \(3\)/i)).toBeTruthy();
  });

  it("player bids are labeled YOU", () => {
    const bids = [mkBid(undefined, 5000, 1)];
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("NPC bids show stable name from stables map", () => {
    const bids = [mkBid("s1", 5000, 1)];
    render(
      <BidHistoryPanel
        bidHistory={bids}
        stables={mkStables()}
        historyOpen={true}
        onHistoryOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Godolphin")).toBeTruthy();
  });
});
