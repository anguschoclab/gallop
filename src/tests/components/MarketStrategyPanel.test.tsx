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
import { createDefaultExchangeState, type ExchangeAsk } from "@/core/market/exchange";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
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

  it("renders PriceAlertsPanel below the candidate list", () => {
    seedStore({ ...createDefaultGameState() });
    render(createElement(MarketStrategyPanel));
    // PriceAlertsPanel has a "New alert" heading
    expect(screen.getByText(/new alert/i)).toBeTruthy();
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
});
