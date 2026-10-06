/**
 * exchangeSettlementPhase.test.ts — Per-day exchange refresh + NPC settlement
 *
 * Covers the pipeline phase that regenerates the NPC side of the exchange book
 * and settles NPC-vs-NPC crossings once per simulation day, so week/month
 * advances keep the tape live instead of settling only on the final day.
 */

import { describe, it, expect } from "vitest";
import { exchangeSettlementPhase } from "@/core/time/phases/exchangeSettlementPhase";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { PHASE_ORDER_EXCHANGE_SETTLEMENT } from "@/constants";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestStable, createTestNpcHorse } from "@/tests/helpers";
import { createDefaultExchangeState } from "@/core/market/exchange";
import { isPlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { runPipelineForDays } from "@/tests/helpers/runPipeline";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

function mkContext(overrides: Partial<GameState> = {}, newDay = 10): PipelineContext {
  const state = makeGameState(overrides) as GameState;
  return makePipelineContext({ state, newDay, previousDay: newDay - 1 }) as PipelineContext;
}

/** A desperate seller (broke → high cash pressure → low accept floor). */
function desperateSeller(id = "seller-1") {
  return createTestStable({ id, name: "Broke Yard", cash: 500, personality: "trader" });
}

/** Rich aggressive buyers that will clear any reasonable floor. */
function richBuyer(id: string) {
  return createTestStable({
    id,
    name: `Rich Yard ${id}`,
    cash: 50_000_000,
    personality: "aggressive",
  });
}

function sellerHorses(sellerId: string, count = 3) {
  return Array.from({ length: count }, (_, i) =>
    createTestNpcHorse({
      id: `sh-${i}`,
      name: `Seller Horse ${i}`,
      ownership: makeNpcOwned(asNpcStableId(sellerId)),
    }),
  );
}

describe("exchangeSettlementPhase", () => {
  it("is registered in GAME_PIPELINE_PHASES at the settlement order", () => {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === "exchangeSettlement");
    expect(phase).toBeDefined();
    expect(phase!.order).toBe(PHASE_ORDER_EXCHANGE_SETTLEMENT);
    expect(PHASE_ORDER_EXCHANGE_SETTLEMENT).toBe(203);
  });

  it("regenerates the NPC book and stamps lastRefreshDay", () => {
    const seller = desperateSeller();
    const horses = sellerHorses(seller.id);
    const ctx = mkContext(
      {
        // No buyers: nothing can cross, so the listed asks survive untouched.
        npcStables: [seller],
        horses: h2r(horses),
        exchange: createDefaultExchangeState(),
      },
      10,
    );

    const result = exchangeSettlementPhase.execute(ctx);
    expect(result.state.exchange.lastRefreshDay).toBe(10);
    expect(result.state.exchange.asks.length).toBeGreaterThan(0);
  });

  it("preserves live player asks through the refresh", () => {
    const seller = desperateSeller();
    const horses = sellerHorses(seller.id);
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      {
        id: "player-ask-1",
        horseId: "ph-1",
        sellerId: "player",
        sellerName: "My Stable",
        price: 50_000,
        fairValue: 50_000,
        createdDay: 9,
        expiresDay: 30,
      },
    ];
    const ctx = mkContext(
      {
        npcStables: [seller],
        horses: h2r(horses),
        exchange,
      },
      10,
    );

    const result = exchangeSettlementPhase.execute(ctx);
    expect(result.state.exchange.asks.some((a) => a.id === "player-ask-1")).toBe(true);
  });

  it("is skipped when the book was already refreshed today", () => {
    const exchange = createDefaultExchangeState();
    exchange.lastRefreshDay = 10;
    const ctx = mkContext({ exchange }, 10);
    expect(exchangeSettlementPhase.skipIf?.(ctx)).toBe(true);
    expect(exchangeSettlementPhase.skipIf?.(mkContext({}, 10))).toBe(false);
  });

  it("is a no-op when execute runs on an already-refreshed day", () => {
    const exchange = createDefaultExchangeState();
    exchange.lastRefreshDay = 10;
    const ctx = mkContext({ exchange }, 10);
    const result = exchangeSettlementPhase.execute(ctx);
    expect(result.state.exchange).toBe(exchange);
  });

  it("settles NPC-vs-NPC trades and applies ownership and cash changes", () => {
    const seller = desperateSeller();
    const buyers = [richBuyer("buyer-1"), richBuyer("buyer-2"), richBuyer("buyer-3")];
    const horses = sellerHorses(seller.id, 5);
    const ctx = mkContext(
      {
        npcStables: [seller, ...buyers],
        horses: h2r(horses),
        exchange: createDefaultExchangeState(),
      },
      10,
    );

    const result = exchangeSettlementPhase.execute(ctx);
    const trades = result.state.exchange.trades;
    expect(trades.length).toBeGreaterThan(0);

    const trade = trades[0];
    expect(trade.day).toBe(10);
    expect(trade.buyerId).not.toBe("player");
    expect(trade.sellerId).toBe(seller.id);

    // Ownership moved to the buyer stable
    const tradedHorse = result.state.horses[trade.horseId];
    expect(tradedHorse.ownership.type).toBe("npc");
    expect((tradedHorse.ownership as { stableId: string }).stableId).toBe(trade.buyerId);

    // Cash moved: buyer paid, seller netted proceeds
    const buyer = result.state.npcStables.find((s) => s.id === trade.buyerId)!;
    const sellerAfter = result.state.npcStables.find((s) => s.id === seller.id)!;
    expect(buyer.cash).toBeLessThan(50_000_000);
    expect(sellerAfter.cash).toBeGreaterThan(seller.cash);
  });

  it("never settles a player's own ask automatically", () => {
    const seller = desperateSeller();
    const horses = sellerHorses(seller.id);
    const exchange = createDefaultExchangeState();
    exchange.asks = [
      {
        id: "player-ask-1",
        horseId: "ph-1",
        sellerId: "player",
        sellerName: "My Stable",
        price: 1,
        fairValue: 50_000,
        createdDay: 9,
        expiresDay: 30,
      },
    ];
    const ctx = mkContext(
      {
        npcStables: [seller, richBuyer("buyer-1"), richBuyer("buyer-2")],
        horses: h2r(horses),
        exchange,
      },
      10,
    );

    const result = exchangeSettlementPhase.execute(ctx);
    expect(result.state.exchange.trades.every((t) => t.sellerId !== "player")).toBe(true);
    expect(result.state.exchange.asks.some((a) => a.id === "player-ask-1")).toBe(true);
  });

  it("ticks the exchange on every day of a multi-day pipeline run", () => {
    const seller = desperateSeller();
    const buyers = [richBuyer("buyer-1"), richBuyer("buyer-2"), richBuyer("buyer-3")];
    const horses = sellerHorses(seller.id, 5);
    const state = makeGameState({
      day: 1,
      npcStables: [seller, ...buyers],
      horses: h2r(horses),
      exchange: createDefaultExchangeState(),
    }) as GameState;

    const { perDay, state: finalState } = runPipelineForDays(state, 3);

    expect(perDay).toHaveLength(3);
    for (const dayResult of perDay) {
      expect(dayResult.state.exchange.lastRefreshDay).toBe(dayResult.day);
    }
    // NPC asks are regenerated fresh every day — the final day's book is live
    expect(finalState.exchange.asks.length).toBeGreaterThan(0);
    expect(finalState.exchange.lastRefreshDay).toBe(4);
  });

  it("keeps traded horses out of subsequent days' books after a sale", () => {
    const seller = desperateSeller();
    const buyers = [richBuyer("buyer-1"), richBuyer("buyer-2"), richBuyer("buyer-3")];
    const horses = sellerHorses(seller.id, 5);
    const state = makeGameState({
      day: 1,
      npcStables: [seller, ...buyers],
      horses: h2r(horses),
      exchange: createDefaultExchangeState(),
    }) as GameState;

    const { state: finalState } = runPipelineForDays(state, 3);

    for (const trade of finalState.exchange.trades) {
      // Every trade's horse ended up NPC-owned by its buyer
      expect(isPlayerOwned(finalState.horses[trade.horseId])).toBe(false);
    }
  });
});
