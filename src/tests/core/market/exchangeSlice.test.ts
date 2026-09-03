/**
 * exchangeSlice.test.ts - Characterization tests for the exchange slice actions
 *
 * Written BEFORE any refactoring (Phase 0.1). These tests lock down the current
 * behaviour of listHorseOnExchange, cancelExchangeListing, acceptExchangeBid,
 * buyFromExchange, sellHorseToAuctionHouse, buyHorseFromAuctionHouse and
 * refreshExchange so the H7 settleTrade extraction can be verified against them.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import {
  createDefaultExchangeState,
  netProceeds,
  exchangeCommission,
  type ExchangeState,
  type ExchangeAsk,
  type ExchangeBid,
} from "@/core/market/exchange";
import { createTestHorse } from "@/tests/helpers";
import { makePlayerOwned, makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { asHorseId, asNpcStableId, asStableId } from "@/core/types/branded";
import { AUCTION_HOUSES } from "@/core/prestige/auctionHouses";
import type { Horse, Stable } from "@/game/types";

function mkStable(overrides: Partial<Stable> & { id: string }): Stable {
  return {
    name: `Stable ${overrides.id}`,
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 1990,
    cash: 1_000_000,
    horses: [],
    isMajor: false,
    colors: { primary: "#fff", secondary: "#000" },
    personality: "trader",
    staff: { trainer: null, groom: null, nutritionist: null, farrier: null, veterinarian: null },
    outposts: [],
    ...overrides,
  } as Stable;
}

function mkAsk(overrides: Partial<ExchangeAsk> & { id: string; horseId: string }): ExchangeAsk {
  return {
    sellerId: "npc-1",
    sellerName: "NPC Stable",
    price: 100_000,
    fairValue: 100_000,
    createdDay: 1,
    expiresDay: 20,
    ...overrides,
  };
}

function mkBid(overrides: Partial<ExchangeBid> & { id: string; horseId: string }): ExchangeBid {
  return {
    bidderId: "npc-1",
    bidderName: "NPC Stable",
    price: 90_000,
    createdDay: 1,
    expiresDay: 20,
    rationale: "test",
    ...overrides,
  };
}

function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

function playerHorse(id = "h-player"): Horse {
  return createTestHorse({ id, name: "Player Horse", ownership: makePlayerOwned() });
}

function npcHorse(id = "h-npc", stableId = "npc-1"): Horse {
  return createTestHorse({
    id,
    name: "NPC Horse",
    ownership: makeNpcOwned(asNpcStableId(stableId)),
  });
}

const HOUSE_ID = AUCTION_HOUSES[0].id;

describe("listHorseOnExchange", () => {
  beforeEach(() => seedStore());

  it("lists a player-owned horse at the given price", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h }, day: 5 });
    const res = useGame.getState().listHorseOnExchange(h.id, 120_000);
    expect(res.ok).toBe(true);
    const exchange = useGame.getState().exchange!;
    expect(exchange.asks).toHaveLength(1);
    expect(exchange.asks[0].horseId).toBe(h.id);
    expect(exchange.asks[0].sellerId).toBe("player");
    expect(exchange.asks[0].price).toBe(120_000);
    expect(exchange.asks[0].createdDay).toBe(5);
  });

  it("rejects a non-existent horse", () => {
    seedStore();
    const res = useGame.getState().listHorseOnExchange("no-such-horse", 100);
    expect(res.ok).toBe(false);
  });

  it("rejects a horse the player does not own", () => {
    const h = npcHorse();
    seedStore({ horses: { [h.id]: h } });
    const res = useGame.getState().listHorseOnExchange(h.id, 100);
    expect(res.ok).toBe(false);
  });

  it("rejects a consigned horse", () => {
    const h = createTestHorse({
      id: "h-c",
      ownership: makePlayerOwned(),
      consignedSaleId: "sale1",
    });
    seedStore({ horses: { [h.id]: h } });
    const res = useGame.getState().listHorseOnExchange(h.id, 100);
    expect(res.ok).toBe(false);
  });

  it("rejects a deceased horse", () => {
    const h = createTestHorse({
      id: "h-d",
      ownership: makePlayerOwned(),
      lifecycleStatus: "deceased",
    });
    seedStore({ horses: { [h.id]: h } });
    const res = useGame.getState().listHorseOnExchange(h.id, 100);
    expect(res.ok).toBe(false);
  });

  it("rejects a non-positive price", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().listHorseOnExchange(h.id, 0).ok).toBe(false);
    expect(useGame.getState().listHorseOnExchange(h.id, -10).ok).toBe(false);
  });

  it("rejects a double-listing", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h }, day: 1 });
    useGame.getState().listHorseOnExchange(h.id, 100);
    const res = useGame.getState().listHorseOnExchange(h.id, 200);
    expect(res.ok).toBe(false);
  });

  it("appends a log entry", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h }, day: 1 });
    useGame.getState().listHorseOnExchange(h.id, 100);
    const log = useGame.getState().log;
    expect(log.some((e) => e.text.includes(h.name) && e.text.includes("listed"))).toBe(true);
  });
});

describe("cancelExchangeListing", () => {
  beforeEach(() => seedStore());

  it("cancels the player's own listing", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h }, day: 1 });
    useGame.getState().listHorseOnExchange(h.id, 100);
    const askId = useGame.getState().exchange!.asks[0].id;
    const res = useGame.getState().cancelExchangeListing(askId);
    expect(res.ok).toBe(true);
    expect(useGame.getState().exchange!.asks).toHaveLength(0);
  });

  it("rejects a non-existent listing", () => {
    seedStore();
    expect(useGame.getState().cancelExchangeListing("no-such-ask").ok).toBe(false);
  });

  it("rejects cancelling another seller's listing", () => {
    const ask = mkAsk({ id: "ask1", horseId: "h-x", sellerId: "npc-1" });
    seedStore({ exchange: { ...createDefaultExchangeState(), asks: [ask] } });
    const res = useGame.getState().cancelExchangeListing("ask1");
    expect(res.ok).toBe(false);
  });
});

describe("acceptExchangeBid", () => {
  beforeEach(() => seedStore());

  it("sells a player horse into an NPC bid", () => {
    const h = playerHorse();
    const buyer = mkStable({ id: "npc-1", cash: 500_000 });
    const bid = mkBid({ id: "bid1", horseId: h.id, bidderId: "npc-1", price: 100_000 });
    seedStore({
      horses: { [h.id]: h },
      npcStables: [buyer],
      exchange: { ...createDefaultExchangeState(), bids: [bid] },
      day: 5,
      cash: 200_000,
    });
    const res = useGame.getState().acceptExchangeBid("bid1");
    expect(res.ok).toBe(true);

    const s = useGame.getState();
    const proceeds = netProceeds(100_000);
    expect(s.cash).toBe(200_000 + proceeds);
    expect(s.horses[h.id].ownership.type).toBe("npc");
    const updatedBuyer = s.npcStables!.find((st) => st.id === "npc-1")!;
    expect(updatedBuyer.cash).toBe(500_000 - 100_000);
    expect(s.exchange!.trades).toHaveLength(1);
    expect(s.exchange!.trades[0].initiatedBy).toBe("bid");
    expect(s.exchange!.bids).toHaveLength(0);
  });

  it("rejects a non-existent bid", () => {
    seedStore();
    expect(useGame.getState().acceptExchangeBid("no-such-bid").ok).toBe(false);
  });

  it("rejects if the horse is not found", () => {
    const bid = mkBid({ id: "bid1", horseId: "h-missing" });
    seedStore({ exchange: { ...createDefaultExchangeState(), bids: [bid] } });
    expect(useGame.getState().acceptExchangeBid("bid1").ok).toBe(false);
  });

  it("rejects if the player does not own the horse", () => {
    const h = npcHorse();
    const bid = mkBid({ id: "bid1", horseId: h.id });
    seedStore({
      horses: { [h.id]: h },
      exchange: { ...createDefaultExchangeState(), bids: [bid] },
    });
    expect(useGame.getState().acceptExchangeBid("bid1").ok).toBe(false);
  });

  it("rejects if the buyer is no longer active", () => {
    const h = playerHorse();
    const bid = mkBid({ id: "bid1", horseId: h.id, bidderId: "ghost" });
    seedStore({
      horses: { [h.id]: h },
      npcStables: [],
      exchange: { ...createDefaultExchangeState(), bids: [bid] },
    });
    expect(useGame.getState().acceptExchangeBid("bid1").ok).toBe(false);
  });

  it("rejects if the buyer cannot fund the bid", () => {
    const h = playerHorse();
    const buyer = mkStable({ id: "npc-1", cash: 100 });
    const bid = mkBid({ id: "bid1", horseId: h.id, bidderId: "npc-1", price: 100_000 });
    seedStore({
      horses: { [h.id]: h },
      npcStables: [buyer],
      exchange: { ...createDefaultExchangeState(), bids: [bid] },
    });
    expect(useGame.getState().acceptExchangeBid("bid1").ok).toBe(false);
  });
});

describe("buyFromExchange", () => {
  beforeEach(() => seedStore());

  it("buys an NPC-listed horse at its ask price", () => {
    const h = npcHorse();
    const seller = mkStable({ id: "npc-1", cash: 100_000 });
    const ask = mkAsk({ id: "ask1", horseId: h.id, sellerId: "npc-1", price: 80_000 });
    seedStore({
      horses: { [h.id]: h },
      npcStables: [seller],
      exchange: { ...createDefaultExchangeState(), asks: [ask] },
      day: 5,
      cash: 500_000,
    });
    const res = useGame.getState().buyFromExchange("ask1");
    expect(res.ok).toBe(true);

    const s = useGame.getState();
    expect(s.cash).toBe(500_000 - 80_000);
    expect(s.horses[h.id].ownership.type).toBe("player");
    const proceeds = netProceeds(80_000);
    const updatedSeller = s.npcStables!.find((st) => st.id === "npc-1")!;
    expect(updatedSeller.cash).toBe(100_000 + proceeds);
    expect(s.exchange!.trades).toHaveLength(1);
    expect(s.exchange!.trades[0].initiatedBy).toBe("ask");
    expect(s.exchange!.asks).toHaveLength(0);
  });

  it("rejects a non-existent ask", () => {
    seedStore();
    expect(useGame.getState().buyFromExchange("no-such-ask").ok).toBe(false);
  });

  it("rejects buying the player's own listing", () => {
    const h = playerHorse();
    const ask = mkAsk({ id: "ask1", horseId: h.id, sellerId: "player" });
    seedStore({
      horses: { [h.id]: h },
      exchange: { ...createDefaultExchangeState(), asks: [ask] },
    });
    expect(useGame.getState().buyFromExchange("ask1").ok).toBe(false);
  });

  it("rejects if the horse is not found", () => {
    const ask = mkAsk({ id: "ask1", horseId: "h-missing" });
    seedStore({ exchange: { ...createDefaultExchangeState(), asks: [ask] } });
    expect(useGame.getState().buyFromExchange("ask1").ok).toBe(false);
  });

  it("rejects if the player has insufficient funds", () => {
    const h = npcHorse();
    const ask = mkAsk({ id: "ask1", horseId: h.id, price: 1_000_000 });
    seedStore({
      horses: { [h.id]: h },
      exchange: { ...createDefaultExchangeState(), asks: [ask] },
      cash: 100,
    });
    expect(useGame.getState().buyFromExchange("ask1").ok).toBe(false);
  });
});

describe("sellHorseToAuctionHouse", () => {
  beforeEach(() => seedStore());

  it("sells a player horse through an auction house", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h }, day: 5, cash: 200_000 });
    const res = useGame.getState().sellHorseToAuctionHouse(h.id, HOUSE_ID);
    expect(res.ok).toBe(true);

    const s = useGame.getState();
    expect(s.horses[h.id].ownership.type).toBe("unowned");
    expect(s.cash).toBeGreaterThan(200_000);
    expect(s.exchange!.trades).toHaveLength(1);
    expect(s.exchange!.trades[0].buyerId).toBe(HOUSE_ID);
  });

  it("rejects a non-existent horse", () => {
    seedStore();
    expect(useGame.getState().sellHorseToAuctionHouse("no-such-horse", HOUSE_ID).ok).toBe(false);
  });

  it("rejects a horse the player does not own", () => {
    const h = npcHorse();
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().sellHorseToAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });

  it("rejects a consigned horse", () => {
    const h = createTestHorse({
      id: "h-c",
      ownership: makePlayerOwned(),
      consignedSaleId: "sale1",
    });
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().sellHorseToAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });

  it("rejects a deceased horse", () => {
    const h = createTestHorse({
      id: "h-d",
      ownership: makePlayerOwned(),
      lifecycleStatus: "deceased",
    });
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().sellHorseToAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });

  it("rejects an unknown auction house", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().sellHorseToAuctionHouse(h.id, "no-such-house").ok).toBe(false);
  });
});

describe("buyHorseFromAuctionHouse", () => {
  beforeEach(() => seedStore());

  it("buys an NPC horse from an auction house at the buy price", () => {
    const h = npcHorse();
    const seller = mkStable({ id: "npc-1", cash: 100_000 });
    seedStore({ horses: { [h.id]: h }, npcStables: [seller], day: 5, cash: 5_000_000 });
    const res = useGame.getState().buyHorseFromAuctionHouse(h.id, HOUSE_ID);
    expect(res.ok).toBe(true);

    const s = useGame.getState();
    expect(s.horses[h.id].ownership.type).toBe("player");
    expect(s.exchange!.trades).toHaveLength(1);
    expect(s.exchange!.trades[0].buyerId).toBe("player");
  });

  it("rejects a non-existent horse", () => {
    seedStore();
    expect(useGame.getState().buyHorseFromAuctionHouse("no-such-horse", HOUSE_ID).ok).toBe(false);
  });

  it("rejects a horse the player already owns", () => {
    const h = playerHorse();
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().buyHorseFromAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });

  it("rejects a deceased horse", () => {
    const h = createTestHorse({
      id: "h-d",
      ownership: makeNpcOwned(asNpcStableId("npc-1")),
      lifecycleStatus: "deceased",
    });
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().buyHorseFromAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });

  it("rejects an unknown auction house", () => {
    const h = npcHorse();
    seedStore({ horses: { [h.id]: h } });
    expect(useGame.getState().buyHorseFromAuctionHouse(h.id, "no-such-house").ok).toBe(false);
  });

  it("rejects if the player has insufficient funds", () => {
    const h = npcHorse();
    seedStore({ horses: { [h.id]: h }, cash: 1 });
    expect(useGame.getState().buyHorseFromAuctionHouse(h.id, HOUSE_ID).ok).toBe(false);
  });
});

describe("refreshExchange", () => {
  beforeEach(() => seedStore());

  it("is idempotent per day (no-op if already refreshed)", () => {
    seedStore({
      day: 10,
      exchange: { ...createDefaultExchangeState(), lastRefreshDay: 10, asks: [], bids: [] },
    });
    const before = useGame.getState().exchange!;
    useGame.getState().refreshExchange();
    expect(useGame.getState().exchange).toBe(before);
  });

  it("regenerates the NPC book on a new day", () => {
    const h = npcHorse();
    const stable = mkStable({ id: "npc-1", cash: 500_000 });
    seedStore({ horses: { [h.id]: h }, npcStables: [stable], day: 5 });
    useGame.getState().refreshExchange();
    const exchange = useGame.getState().exchange!;
    expect(exchange.lastRefreshDay).toBe(5);
  });
});
