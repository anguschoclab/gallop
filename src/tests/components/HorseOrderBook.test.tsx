/**
 * HorseOrderBook.test.tsx — Order book component coverage
 *
 * Player bid affordances: the player's own standing bids are marked, and each
 * offers a Cancel action wired to the cancel handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { HorseOrderBook } from "@/components/market/HorseOrderBook";
import type { HorseOrderBook as Book } from "@/core/market/exchange";
import type { ExchangeAsk, ExchangeBid } from "@/core/market/exchange";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: React.ReactNode }) => createElement("a", {}, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

function mkAsk(overrides: Partial<ExchangeAsk> = {}): ExchangeAsk {
  return {
    id: "ask-1",
    horseId: "h1",
    sellerId: "npc-1",
    sellerName: "NPC Yard",
    price: 120_000,
    fairValue: 100_000,
    createdDay: 1,
    expiresDay: 20,
    ...overrides,
  };
}

function mkBid(overrides: Partial<ExchangeBid> = {}): ExchangeBid {
  return {
    id: "bid-1",
    horseId: "h1",
    bidderId: "npc-2",
    bidderName: "NPC Buyer",
    price: 80_000,
    createdDay: 1,
    expiresDay: 20,
    rationale: "wants it",
    ...overrides,
  };
}

function mkBook(overrides: Partial<Book> = {}): Book {
  return {
    horseId: "h1",
    horseName: "Test Horse",
    fairValue: 100_000,
    asks: [mkAsk()],
    bids: [mkBid()],
    bestAsk: 120_000,
    bestBid: 80_000,
    spread: 40_000,
    mid: 100_000,
    isPlayerOwned: false,
    ...overrides,
  };
}

describe("HorseOrderBook", () => {
  beforeEach(() => seedStore());

  it("marks the player's own bid and offers a cancel action", () => {
    const onCancelBid = vi.fn();
    const book = mkBook({
      bids: [
        mkBid({ id: "npc-bid", bidderId: "npc-2", bidderName: "NPC Buyer" }),
        mkBid({ id: "p-bid", bidderId: "player", bidderName: "My Stable", price: 90_000 }),
      ],
    });

    render(
      <HorseOrderBook
        book={book}
        cash={500_000}
        onBuyAsk={() => {}}
        onAcceptBid={() => {}}
        onCancelAsk={() => {}}
        onCancelBid={onCancelBid}
      />,
    );

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel bid" });
    expect(cancelButtons).toHaveLength(1); // only the player's bid is cancellable
    fireEvent.click(cancelButtons[0]);
    expect(onCancelBid).toHaveBeenCalledWith("p-bid");
  });

  it("NPC bids carry no cancel affordance", () => {
    const book = mkBook({ bids: [mkBid({ id: "npc-bid", bidderId: "npc-2" })] });
    render(
      <HorseOrderBook
        book={book}
        cash={500_000}
        onBuyAsk={() => {}}
        onAcceptBid={() => {}}
        onCancelAsk={() => {}}
        onCancelBid={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cancel bid" })).toBeNull();
  });
});
