/**
 * auctionRunner.ts - Deterministic auction simulation runner
 *
 * This file provides a deterministic, lot-by-lot auction simulation that powers
 * both the live AuctionTheater UI and the day-rollover phase, producing the same
 * final outcomes regardless of which path runs.
 *
 * Dependencies: ./uuid (generateUUID), ./types (AuctionSale, AuctionLot, Horse, Stable, AuctionBidRecord), ./auction (calculateNpcBid, netProceeds), ./rng (createRng, hashStr, Rng), @/core/resolver/impacts/index (AnyImpact), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: auction.ts (valuation logic), auctionData.ts (sale configuration)
 */

// Deterministic, lot-by-lot auction simulation.
//
// Powers two paths from a single source of truth:
//   1. The live AuctionTheater UI — calls `step()` on a paced timer; the
//      player can interject bids between steps.
//   2. The day-rollover phase — calls `runToCompletion()` to produce the
//      same final outcomes when the player skips the sale.
//
// Same seeded RNG → same final lots, regardless of which path runs.

import { generateUUID } from "@/core/uuid";

import type { AuctionSale, AuctionLot, Horse, Stable, AuctionBidRecord } from "@/game/types";
import { calculateNpcBid, netProceeds } from "./engine";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

export type ChantPhase = "open" | "bidding" | "going_once" | "going_twice" | "sold" | "passed";

export type AuctionTickEvent =
  | { type: "LOT_OPEN"; lotId: string }
  | { type: "BID_RECEIVED"; lotId: string; stableId?: string; amount: number }
  | { type: "BID_WAR"; lotId: string; stableIds: string[] }
  | { type: "GOING_ONCE"; lotId: string; amount: number }
  | { type: "GOING_TWICE"; lotId: string; amount: number }
  | { type: "SOLD"; lotId: string; amount: number; toStableId?: string }
  | { type: "PASSED"; lotId: string; reason: "no_bids" | "reserve_not_met" }
  | { type: "RESERVE_NOT_MET"; lotId: string; amount: number; reserve: number };

export type StepResult = {
  events: AuctionTickEvent[];
  done: boolean;
  /** Convenience snapshot of the lot being processed this step (post-events). */
  currentLotIndex: number;
};

type LotState = {
  lot: AuctionLot;
  currentBid: number;
  leadingBidder: string | undefined;
  bidHistory: AuctionBidRecord[];
  chant: ChantPhase;
  // Used by the chant counter so a single un-raised step → "going_once",
  // two → "going_twice", three → "sold". Reset whenever a raise lands.
  silentSteps: number;
  consecutiveBidders: string[]; // for BID_WAR detection
};

export type AuctionRunner = {
  /** Index of the lot currently in the ring. */
  currentLotIndex(): number;
  /** Snapshot of state for the lot in the ring. */
  currentLot():
    | {
        lot: AuctionLot;
        horse: Horse | undefined;
        currentBid: number;
        leadingBidder: string | undefined;
        chant: ChantPhase;
        nextBid: number;
        bidHistory: AuctionBidRecord[];
      }
    | undefined;
  /** Advance one tick. If `playerBid` is provided and valid, it's applied first. */
  step(playerBid?: number): StepResult;
  /** Run until done (for the offline/skipped path). */
  runToCompletion(): AuctionTickEvent[];
  /** Final resolved lots after `done === true`. */
  finalLots(): AuctionLot[];
  /** Cumulative log lines, one per resolved lot. */
  log(): string[];
  /**
   * Emit all impacts needed to commit this auction's outcomes:
   *   - AuctionResolutionImpact per lot (lot field updates)
   *   - CashImpact for NPC winners (debit) and consignors (credit, net of commission)
   *   - HorseTransferImpact when ownership changes hands
   * Caller passes the day + phase tag for impact metadata.
   */
  finalImpacts(args: { day: number; phase: string }): AnyImpact[];
  /** Set or clear the player's proxy max bid cap for automatic re-raises. */
  setPlayerMaxBid(cap: number | undefined): void;
  /** Skip the current lot (pass on bidding). */
  skipLot(): void;
  /** Finish the sale early and mark as done. */
  finishSale(): void;
  /** Get the final state for commit. */
  getFinalState(): AuctionTickEvent[];
};

/**
 * Compute the next minimum bid increment.
 *
 * Identical to the existing UI. Increments by 5% + $200, rounded up to nearest $100.
 *
 * @param currentBid - Current bid amount
 * @returns Next minimum bid amount
 */
export function nextBidAmount(currentBid: number): number {
  return Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
}

export type AuctionRunnerOptions = {
  /**
   * When true, the runner is driving the live AuctionTheater UI. The Theater
   * debits the player's cash atomically as each player bid is placed, so
   * `finalImpacts` must NOT also emit a player-buyer debit at finalization.
   * Default false (offline path emits the debit).
   */
  liveMode?: boolean;
  /**
   * Optional NPC AI manager for AI-driven bidding decisions.
   */
  npcAIManager?: NpcAIManager;
  /**
   * Current day for AI learning and decision-making.
   */
  currentDay?: number;
  /**
   * Called before each auto-raise to debit cash. Return false to abort the
   * auto-raise and cancel the proxy bid.
   */
  onAutoRaise?: (amount: number) => boolean;
};

/**
 * Construct a deterministic auction runner.
 *
 * Seed makes outcomes reproducible. The existing resolveAuctionSale derives one from
 * lot/stable/bid identifiers — we do the same here, hashed once per (lot, scan) pair
 * so identical inputs yield identical outputs across paths.
 *
 * @param sale - The auction sale to simulate
 * @param stables - All NPC stables for bidding
 * @param horses - All horses in the game
 * @param baseSeed - Base seed for deterministic RNG (defaults to hash of sale ID)
 * @param options - Optional runner configuration including live mode, AI manager, and callbacks
 * @returns Auction runner interface
 */
export function createAuctionRunner(
  sale: AuctionSale,
  stables: readonly Stable[],
  horses: readonly Horse[],
  baseSeed: number = hashStr(sale.id),
  options: AuctionRunnerOptions = {},
): AuctionRunner {
  const { liveMode = false, npcAIManager, currentDay, onAutoRaise } = options;

  const horseMap = new Map(horses.map((h) => [h.id, h]));

  // Proxy bid cap — cleared per lot and on cancel.
  let playerMaxBid: number | undefined = undefined;
  const lots: LotState[] = sale.lots
    .filter((l) => !l.withdrawn)
    .map((l) => ({
      lot: { ...l },
      currentBid: l.hammerPrice ?? 0,
      leadingBidder: l.soldToStableId,
      bidHistory: l.bidHistory ? [...l.bidHistory] : [],
      chant: "open",
      silentSteps: 0,
      consecutiveBidders: [],
    }));

  const bidderStables = stables.filter((s) => s.isMajor);
  const log: string[] = [];
  let lotIndex = 0;
  let tick = 0;
  let done = lots.length === 0;

  function rngFor(lot: AuctionLot, scanIdx: number): Rng {
    return createRng(baseSeed ^ hashStr(lot.id) ^ scanIdx);
  }

  function findEligibleBidders(state: LotState): readonly Stable[] {
    return bidderStables.filter(
      (s) => s.id !== state.lot.consignorStableId && s.id !== state.leadingBidder,
    );
  }

  function tryRecordPlayerBid(state: LotState, amount: number): AuctionTickEvent | null {
    if (amount <= state.currentBid) return null;
    state.currentBid = amount;
    state.leadingBidder = undefined; // player
    state.bidHistory.push({ stableId: undefined, amount, tick });
    state.silentSteps = 0;
    state.consecutiveBidders = ["player"];
    return { type: "BID_RECEIVED", lotId: state.lot.id, stableId: undefined, amount };
  }

  function tryNpcRaise(state: LotState): AuctionTickEvent | null {
    const horse = horseMap.get(state.lot.horseId);
    if (!horse) return null;
    const eligible = findEligibleBidders(state);
    // First-eligible-wins keeps it deterministic; specifically interesting
    // bidders self-select via valuation/budget gates inside calculateNpcBid.
    for (const stable of eligible) {
      const rng = rngFor(state.lot, tick * 31 + bidderStables.indexOf(stable));
      const bid = calculateNpcBid(
        stable,
        horse,
        state.currentBid,
        sale.kind,
        rng,
        horses,
        horseMap,
        npcAIManager,
        currentDay,
      );
      if (bid !== null && bid > state.currentBid) {
        state.currentBid = bid;
        state.leadingBidder = stable.id;
        state.bidHistory.push({ stableId: stable.id, amount: bid, tick });
        state.silentSteps = 0;
        state.consecutiveBidders.push(stable.id);
        return { type: "BID_RECEIVED", lotId: state.lot.id, stableId: stable.id, amount: bid };
      }
    }
    return null;
  }

  function finalizeCurrent(state: LotState): AuctionTickEvent[] {
    const events: AuctionTickEvent[] = [];
    const horse = horseMap.get(state.lot.horseId);
    const horseName = horse?.name ?? "Lot";

    if (
      state.currentBid <= 0 ||
      (state.leadingBidder === undefined && state.bidHistory.length === 0)
    ) {
      // No bids at all
      state.chant = "passed";
      state.lot.passed = true;
      state.lot.bidHistory = state.bidHistory;
      events.push({ type: "PASSED", lotId: state.lot.id, reason: "no_bids" });
      log.push(`${horseName} — passed (no bids)`);
      return events;
    }

    if (state.currentBid < state.lot.reservePrice) {
      state.chant = "passed";
      state.lot.passed = true;
      state.lot.hammerPrice = undefined;
      state.lot.soldToStableId = undefined;
      state.lot.bidHistory = state.bidHistory;
      events.push({
        type: "RESERVE_NOT_MET",
        lotId: state.lot.id,
        amount: state.currentBid,
        reserve: state.lot.reservePrice,
      });
      events.push({ type: "PASSED", lotId: state.lot.id, reason: "reserve_not_met" });
      log.push(`${horseName} — passed (reserve not met)`);
      return events;
    }

    state.chant = "sold";
    state.lot.hammerPrice = state.currentBid;
    state.lot.soldToStableId = state.leadingBidder;
    state.lot.passed = false;
    state.lot.bidHistory = state.bidHistory;
    events.push({
      type: "SOLD",
      lotId: state.lot.id,
      amount: state.currentBid,
      toStableId: state.leadingBidder,
    });
    const winner = state.leadingBidder
      ? (stables.find((s) => s.id === state.leadingBidder)?.name ?? "an NPC")
      : "you";
    log.push(`${horseName} — sold to ${winner} for $${state.currentBid.toLocaleString()}`);
    return events;
  }

  function step(playerBid?: number): StepResult {
    if (done) return { events: [], done: true, currentLotIndex: lotIndex };
    const state = lots[lotIndex];
    const events: AuctionTickEvent[] = [];
    tick++;

    if (state.chant === "open") {
      events.push({ type: "LOT_OPEN", lotId: state.lot.id });
      state.chant = "bidding";
      return { events, done: false, currentLotIndex: lotIndex };
    }

    if (
      state.chant === "bidding" ||
      state.chant === "going_once" ||
      state.chant === "going_twice"
    ) {
      // Player bid first if provided.
      if (playerBid !== undefined) {
        const ev = tryRecordPlayerBid(state, playerBid);
        if (ev) {
          events.push(ev);
          state.chant = "bidding";
        }
      }
      // Then NPC scan.
      const npcEv = tryNpcRaise(state);
      if (npcEv) {
        // Auto-raise: if player has a proxy cap and NPC just outbid them,
        // attempt to re-raise on the player's behalf before advancing the chant.
        // tryNpcRaise always returns a BID_RECEIVED event which has `amount`.
        const npcAmount = "amount" in npcEv ? npcEv.amount : 0;
        const nextForPlayer = nextBidAmount(npcAmount);
        if (
          playerMaxBid !== undefined &&
          nextForPlayer <= playerMaxBid &&
          state.leadingBidder !== undefined // NPC is now leading
        ) {
          // Debit cash via injected callback; cancel proxy if cash is insufficient.
          const canRaise = onAutoRaise ? onAutoRaise(nextForPlayer) : true;
          if (canRaise) {
            const autoEv = tryRecordPlayerBid(state, nextForPlayer);
            if (autoEv) {
              events.push(npcEv); // NPC raise first
              events.push(autoEv); // player re-raise immediately after
              state.chant = "bidding";
              return { events, done, currentLotIndex: lotIndex };
            }
          } else {
            // onAutoRaise returned false — proxy cancelled.
            playerMaxBid = undefined;
          }
        }

        events.push(npcEv);
        state.chant = "bidding";
        // Detect a bid-war: 4+ consecutive raises on this lot
        if (state.consecutiveBidders.length >= 4) {
          const unique = Array.from(new Set(state.consecutiveBidders.slice(-4)));
          if (unique.length >= 2) {
            events.push({ type: "BID_WAR", lotId: state.lot.id, stableIds: unique });
          }
        }
      } else {
        // No raise this step — advance hammer counter.
        state.silentSteps++;
        if (state.chant === "bidding") {
          state.chant = "going_once";
          events.push({ type: "GOING_ONCE", lotId: state.lot.id, amount: state.currentBid });
        } else if (state.chant === "going_once") {
          state.chant = "going_twice";
          events.push({ type: "GOING_TWICE", lotId: state.lot.id, amount: state.currentBid });
        } else if (state.chant === "going_twice") {
          events.push(...finalizeCurrent(state));
          // Move to next lot on the next call to step()
          lotIndex++;
          if (lotIndex >= lots.length) done = true;
        }
      }
      return { events, done, currentLotIndex: lotIndex };
    }

    // Already sold/passed (shouldn't happen in normal flow) — advance.
    lotIndex++;
    if (lotIndex >= lots.length) done = true;
    return { events, done, currentLotIndex: lotIndex };
  }

  function runToCompletion(): AuctionTickEvent[] {
    const all: AuctionTickEvent[] = [];
    while (!done) {
      const r = step();
      all.push(...r.events);
      // Safety stop — if a step produced zero events 200 times, bail.
      if (r.events.length === 0) {
        if (lots[lotIndex]?.chant === "open") continue;
        break;
      }
    }
    return all;
  }

  function currentLot() {
    if (done || lotIndex >= lots.length) return undefined;
    const state = lots[lotIndex];
    const horse = horseMap.get(state.lot.horseId);
    return {
      lot: state.lot,
      horse,
      currentBid: state.currentBid,
      leadingBidder: state.leadingBidder,
      chant: state.chant,
      nextBid: nextBidAmount(state.currentBid),
      bidHistory: state.bidHistory,
    };
  }

  function finalImpacts({ day, phase }: { day: number; phase: string }): AnyImpact[] {
    const impacts: AnyImpact[] = [];
    for (const state of lots) {
      const lot = state.lot;
      if (lot.withdrawn) continue;
      const isPlayerConsignment = !lot.consignorStableId;

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "auction_resolution",
        saleId: sale.id,
        lotId: lot.id,
        hammerPrice: lot.hammerPrice,
        soldToStableId: lot.soldToStableId,
        passed: !!lot.passed,
        bidHistory: state.bidHistory,
        wasPlayerConsignment: isPlayerConsignment,
        reason: lot.passed ? "auction_passed" : "auction_sold",
      });

      if (lot.passed || !lot.hammerPrice) continue;

      const winnerStableId = lot.soldToStableId; // undefined = player won
      const consignorStableId = lot.consignorStableId; // undefined = player consigned

      // Debit the winner's cash (NPC winner only; player live-bid path debits via store action).
      if (winnerStableId) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "conditional",
          type: "cash_change",
          entityId: winnerStableId,
          amount: -lot.hammerPrice,
          reason: "auction_purchase",
        });
      }

      // Debit the buyer if the player won. The live Theater debits cash
      // atomically on each player bid (so the player can't double-spend
      // mid-sale), so in liveMode we skip emitting this final debit.
      // Push to Inbox for winner.
      if (!winnerStableId && !liveMode) {
        const horse = horses.find((h) => h.id === lot.horseId);
        const horseName = horse?.name || "Unknown Horse";

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "always",
          type: "inbox_message",
          message: {
            day,
            category: "auction",
            priority: "info",
            title: `Auction Won: ${horseName}`,
            body: `Congratulations! You purchased ${horseName} for $${lot.hammerPrice.toLocaleString()} at ${
              sale.name
            }.`,
            cta: {
              label: "View Horse",
              route: "stable.$horseId",
              params: { horseId: lot.horseId },
            },
          },
        });

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "always",
          type: "cash_change",
          entityId: undefined as unknown as string,
          amount: -lot.hammerPrice,
          reason: "auction_purchase_player",
        });
      }

      // Credit the consignor (net of 6% sale-house commission).
      const proceeds = netProceeds(lot.hammerPrice);
      if (consignorStableId) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "conditional",
          type: "cash_change",
          entityId: consignorStableId,
          amount: proceeds,
          reason: "auction_proceeds",
        });
      } else {
        // Player consignor.
        const horse = horses.find((h) => h.id === lot.horseId);
        const horseName = horse?.name || "Unknown Horse";

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "always",
          type: "inbox_message",
          message: {
            day,
            category: "auction",
            priority: "info",
            title: `Horse Sold: ${horseName}`,
            body: `${horseName} was sold for $${lot.hammerPrice.toLocaleString()} at ${
              sale.name
            }. Your net proceeds: $${proceeds.toLocaleString()}.`,
            cta: {
              label: "View Sale",
              route: "auction.$saleId",
              params: { saleId: sale.id },
            },
          },
        });

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "always",
          type: "cash_change",
          entityId: undefined as unknown as string, // resolver treats undefined as player
          amount: proceeds,
          reason: "auction_proceeds_player",
        });
      }

      // Transfer horse ownership.
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase,
        logLevel: "always",
        type: "horse_transfer",
        horseId: lot.horseId,
        fromStableId: consignorStableId,
        toStableId: winnerStableId,
        price: lot.hammerPrice,
        reason: "auction_transfer",
      });
    }

    // Handle passed lots for player consignor.
    const resolvedLots = lots.map((l) => l.lot);
    for (const lot of resolvedLots.filter((l) => l.passed)) {
      if (lot.consignorStableId === "") {
        // Player's horse passed.
        const horse = horses.find((h) => h.id === lot.horseId);
        const horseName = horse?.name || "Unknown Horse";

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase,
          logLevel: "always",
          type: "inbox_message",
          message: {
            day,
            category: "auction",
            priority: "info",
            title: `Horse Passed: ${horseName}`,
            body: `${horseName} failed to meet its reserve price at ${sale.name} and has returned to your stable.`,
            cta: {
              label: "View Horse",
              route: "stable.$horseId",
              params: { horseId: lot.horseId },
            },
          },
        });
      }
    }

    return impacts;
  }

  return {
    currentLotIndex: () => lotIndex,
    currentLot,
    step,
    runToCompletion,
    finalLots: () =>
      sale.lots.map((orig) => {
        if (orig.withdrawn) return orig;
        const state = lots.find((l) => l.lot.id === orig.id);
        return state ? state.lot : orig;
      }),
    log: () => log,
    finalImpacts,
    setPlayerMaxBid: (cap: number | undefined) => {
      playerMaxBid = cap;
    },
    skipLot: () => {
      // Mark current lot as passed and move to next
      const state = lots[lotIndex];
      if (state) {
        state.lot.passed = true;
        state.lot.hammerPrice = undefined;
        state.lot.soldToStableId = undefined;
        log.push(`Lot ${lotIndex + 1} (${state.lot.horseId}) passed`);
        lotIndex++;
      }
    },
    finishSale: () => {
      // Mark remaining lots as passed and complete the sale
      for (let i = lotIndex; i < lots.length; i++) {
        lots[i].lot.passed = true;
        lots[i].lot.hammerPrice = undefined;
        lots[i].lot.soldToStableId = undefined;
        log.push(`Lot ${i + 1} (${lots[i].lot.horseId}) passed (sale finished early)`);
      }
      lotIndex = lots.length;
    },
    getFinalState: () => {
      // Return all events that would be emitted by finalImpacts
      return runToCompletion();
    },
  };
}
