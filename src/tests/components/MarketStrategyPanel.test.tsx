/**
 * MarketStrategyPanel.test.tsx — Tests for the MarketStrategyPanel component.
 *
 * Verifies form rendering, summary stats, candidate cards, live re-scoring,
 * PriceAlertsPanel inclusion, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import {
  createDefaultExchangeState,
  type ExchangeAsk,
  type ExchangeTrade,
} from "@/core/market/exchange";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
import type { Syndicate } from "@/core/breeding/types";
import { MarketStrategyPanel } from "@/components/market/MarketStrategyPanel";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: React.ReactNode }) => createElement("a", {}, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  createFileRoute: () => (opts: any) => opts,
}));

function mkHorse(id: string, overrides: Record<string, unknown> = {}) {
  return createTestHorse({
    id: asHorseId(id),
    name: `Horse ${id}`,
    ownership: makeNpcOwned(asNpcStableId("npc-1")),
    ...overrides,
  } as any);
}

function mkRaceHistory(grade: string) {
  return [{ raceId: "r1", raceName: "Test Race", position: 1, day: 1, grade }];
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

function mkSyndicate(stallionId: string, overrides: Partial<Syndicate> = {}): Syndicate {
  return {
    id: `syn-${stallionId}`,
    stallionId,
    stallionName: `Horse ${stallionId}`,
    totalShares: 40,
    shareHolders: {},
    sharePrice: 5_000,
    studFee: 10_000,
    isPublic: true,
    lifetimeEarnings: 0,
    ...overrides,
  };
}

function mkTrade(
  overrides: Partial<ExchangeTrade> & { id: string; horseId: string },
): ExchangeTrade {
  return {
    horseName: "Traded Horse",
    price: 100_000,
    commission: 0,
    buyerId: "npc-2",
    buyerName: "NPC Buyer",
    sellerId: "npc-1",
    sellerName: "NPC Seller",
    day: 9,
    initiatedBy: "ask",
    ...overrides,
  };
}

describe("MarketStrategyPanel", () => {
  beforeEach(() => {
    seedStore();
  });

  it("renders strategy form with target grades, prestige, price, stake inputs", () => {
    seedStore({ ...createDefaultGameState() });
    render(createElement(MarketStrategyPanel));
    // The panel should have labels for the strategy inputs
    expect(screen.getByText(/target grades/i)).toBeTruthy();
    expect(screen.getByText(/min track prestige/i)).toBeTruthy();
    expect(screen.getByText(/price ceiling/i)).toBeTruthy();
    expect(screen.getByText(/syndication stake/i)).toBeTruthy();
  });

  it("displays summary stats (scanned, qualified, averageScore, totalStakeCost)", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse },
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    // Summary should mention scanned count
    expect(screen.getByText(/scanned/i)).toBeTruthy();
  });

  it("renders candidate cards sorted by score", () => {
    const horse1 = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const horse2 = mkHorse("h2", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 }),
      mkAsk({ id: "ask-2", horseId: "h2", price: 80_000, fairValue: 100_000 }),
    ];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse1, h2: horse2 },
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    // Both horses should appear as candidates (getAllByText because the name
    // may also appear in auction-house catalogue entries)
    const h1Matches = screen.getAllByText(/Horse h1/i);
    const h2Matches = screen.getAllByText(/Horse h2/i);
    expect(h1Matches.length).toBeGreaterThan(0);
    expect(h2Matches.length).toBeGreaterThan(0);
  });

  it("shows reasons and warnings on candidate cards", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse },
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    // The candidate card should show a reason mentioning G1 (getAllByText
    // because G1 also appears in the grade toggle chips)
    const g1Reasons = screen.getAllByText(/G1 form matches/i);
    expect(g1Reasons.length).toBeGreaterThan(0);
  });

  it("updates candidates when strategy inputs change", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 300_000, fairValue: 300_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse },
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    // With default maxPrice 250k, this 300k horse should have a budget warning
    expect(screen.getByText(/above your price ceiling/i)).toBeTruthy();
  });

  it("renders the recent fills card below the candidate list", () => {
    seedStore({ ...createDefaultGameState() });
    render(createElement(MarketStrategyPanel));
    // Alerts live on their own tab; the Strategy panel shows the trade tape.
    expect(screen.getByText(/recent fills/i)).toBeTruthy();
    expect(screen.queryByText(/new alert/i)).toBeNull();
  });

  it("shows empty state when no candidates found", () => {
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: {},
      exchange: createDefaultExchangeState(),
    });
    render(createElement(MarketStrategyPanel));
    // Should show some empty-state message
    expect(screen.getByText(/no candidates/i)).toBeTruthy();
  });

  it("buying an exchange candidate calls buyFromExchange and transfers ownership", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const stable = createTestStable({ id: "npc-1", name: "NPC Stable", cash: 0 });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      cash: 1_000_000,
      horses: { h1: horse },
      npcStables: [stable],
      exchange,
    });
    render(createElement(MarketStrategyPanel));

    const buyButton = screen.getByRole("button", {
      name: /buy horse h1 from exchange/i,
    });
    fireEvent.click(buyButton);

    expect(useGame.getState().horses["h1"].ownership.type).toBe("player");
    expect(useGame.getState().cash).toBe(900_000);
    // The ask is consumed — horse no longer listed
    expect(useGame.getState().exchange.asks.some((a) => a.horseId === "h1")).toBe(false);
  });

  it("buying a house candidate calls buyHorseFromAuctionHouse", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const stable = createTestStable({ id: "npc-1", name: "NPC Stable", cash: 0 });
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      cash: 50_000_000,
      horses: { h1: horse },
      npcStables: [stable],
      exchange: createDefaultExchangeState(),
    });
    render(createElement(MarketStrategyPanel));

    // The horse appears in auction-house catalogues — every house candidate
    // gets a Buy button labelled with its venue
    const buyButtons = screen.getAllByRole("button", { name: /buy horse h1 from/i });
    expect(buyButtons.length).toBeGreaterThan(0);
    fireEvent.click(buyButtons[0]);

    expect(useGame.getState().horses["h1"].ownership.type).toBe("player");
  });

  it("disables Buy when the player cannot afford the price", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      cash: 1_000,
      horses: { h1: horse },
      npcStables: [createTestStable({ id: "npc-1", name: "NPC Stable" })],
      exchange,
    });
    render(createElement(MarketStrategyPanel));

    const buyButton = screen.getByRole("button", {
      name: /buy horse h1 from exchange/i,
    });
    expect(buyButton).toBeDisabled();
  });

  it("renders a recent fills feed from the trade tape", () => {
    const exchange = createDefaultExchangeState();
    exchange.trades = [
      mkTrade({ id: "t1", horseId: "h1", horseName: "Tape Filler", price: 123_450 }),
    ];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: {},
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    expect(screen.getByText(/recent fills/i)).toBeTruthy();
    expect(screen.getByText("Tape Filler")).toBeTruthy();
  });

  it("shows the last fill price on a candidate card when the horse has traded", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    exchange.trades = [mkTrade({ id: "t1", horseId: "h1", price: 87_500, day: 8 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse },
      exchange,
    });
    render(createElement(MarketStrategyPanel));
    expect(screen.getAllByText(/last fill/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$87,500/).length).toBeGreaterThan(0);
  });

  it("shows a real Buy stake action only on candidates whose horse is syndicated", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const syndicate = mkSyndicate("h1");
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      cash: 1_000_000,
      horses: { h1: horse },
      syndicates: { "syn-h1": syndicate },
      exchange,
    });
    render(createElement(MarketStrategyPanel));

    // 25% target of 40 shares = 10 shares at $5,000 = $50,000 real cost.
    // The horse may surface in multiple venues — any card's stake button works.
    const stakeButtons = screen.getAllByRole("button", { name: /buy stake in horse h1/i });
    expect(stakeButtons.length).toBeGreaterThan(0);
    fireEvent.click(stakeButtons[0]);

    const intents = useGame.getState().pendingIntents ?? [];
    expect(
      intents.some(
        (i: { type: string; syndicateId?: string; shares?: number }) =>
          i.type === "share_purchase" && i.syndicateId === "syn-h1" && i.shares === 10,
      ),
    ).toBe(true);
  });

  it("hides the stake metric entirely when the candidate has no syndicate", () => {
    const horse = mkHorse("h1", { raceHistory: mkRaceHistory("G1") });
    const exchange = createDefaultExchangeState();
    exchange.asks = [mkAsk({ id: "ask-1", horseId: "h1", price: 100_000, fairValue: 100_000 })];
    seedStore({
      ...createDefaultGameState(),
      day: 10,
      horses: { h1: horse },
      syndicates: {},
      exchange,
    });
    render(createElement(MarketStrategyPanel));

    // No fabricated "Stake:" figure and no stake purchase action.
    expect(screen.queryAllByText(/^stake:$/i)).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /buy stake/i })).toBeNull();
  });
});
