/**
 * phases/solvency.ts - Financial fail-state pipeline phase.
 *
 * Runs after impact application so it sees the day's settled cash. Applies
 * daily interest on debt, escalates warning → forced sale → insolvent, and
 * captures a legacy snapshot when the run ends.
 */

import type { PipelineContext } from "../pipeline";
import type { AnyImpact, CashImpact, InboxImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { horsePrice } from "@/core/horse/pricing";
import {
  SOLVENCY_THRESHOLDS,
  computeDailyInterest,
  deriveSolvencyState,
  selectForcedSaleHorse,
} from "@/core/financial/solvency";
import { PHASE_ORDER_SOLVENCY } from "@/constants";

export const solvencyPhase = {
  name: "solvency",
  order: PHASE_ORDER_SOLVENCY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;

    // Once the run has ended, this phase is a no-op.
    if (state.runEnded) return context;

    const cash = state.cash;
    const prevDays = state.consecutiveDaysInDebt ?? 0;
    const consecutiveDaysInDebt = cash < 0 ? prevDays + 1 : 0;

    const solvency = deriveSolvencyState({ cash, consecutiveDaysInDebt });
    const impacts: AnyImpact[] = [];
    const newLogs: { day: number; text: string }[] = [];

    // 1. Daily interest on any debt.
    const interest = computeDailyInterest(cash);
    if (interest > 0) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "solvency",
        logLevel: "conditional",
        type: "cash_change",
        entityId: "player",
        amount: -interest,
        reason: `Daily interest on outstanding debt ($${Math.abs(cash).toLocaleString()})`,
      } as CashImpact);
    }

    // 2. Warning banner state — emit a one-time inbox notice on the first day
    // the player slips into debt.
    if (solvency.tier === "warning" && prevDays === 0 && consecutiveDaysInDebt === 1) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "solvency",
        logLevel: "always",
        type: "inbox_message",
        message: {
          day: newDay,
          category: "system",
          priority: "action",
          title: "Cash reserves depleted",
          body: `Your account is $${Math.abs(cash).toLocaleString()} in the red. Interest accrues daily. Sell a horse or claim purses within ${SOLVENCY_THRESHOLDS.forcedSaleDays} days to avoid a forced sale.`,
          cta: { label: "Open finances", route: "financial-report" },
        },
      } as InboxImpact);
    }

    // 3. Forced sale — creditors seize the most valuable horse at 70% value.
    let seizureImpacts: AnyImpact[] = [];
    let creditsFromSale = 0;
    let seizedHorseName: string | null = null;
    if (solvency.tier === "forced_sale") {
      const candidates = Object.values(state.horses)
        .filter((h) => !h.stableId && h.owned !== false)
        .map((h) => ({ id: h.id, owned: true, age: h.age, value: horsePrice(h), name: h.name }));
      const pick = selectForcedSaleHorse(candidates);
      if (pick) {
        const salePrice = Math.round(pick.value * SOLVENCY_THRESHOLDS.distressSaleRate);
        creditsFromSale = salePrice;
        seizedHorseName = pick.name;
        seizureImpacts = [
          {
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "solvency",
            logLevel: "always",
            type: "horse_transfer",
            horseId: pick.id,
            fromStableId: undefined,
            toStableId: "creditors",
            price: salePrice,
            reason: `Distressed sale — creditors seized horse to cover debt`,
          },
          {
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "solvency",
            logLevel: "always",
            type: "cash_change",
            entityId: "player",
            amount: salePrice,
            reason: `Distressed sale of ${pick.name}`,
          } as CashImpact,
          {
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "solvency",
            logLevel: "always",
            type: "inbox_message",
            message: {
              day: newDay,
              category: "system",
              priority: "urgent",
              title: "Creditors seized a horse",
              body: `${pick.name} was sold at a distressed rate for $${salePrice.toLocaleString()} to cover overdue debt. Trade your way back to solvency or the run ends at -$${Math.abs(SOLVENCY_THRESHOLDS.insolventCash).toLocaleString()}.`,
              cta: { label: "Review stable", route: "stable" },
            },
          } as InboxImpact,
        ];
        impacts.push(...seizureImpacts);
        newLogs.push({
          day: newDay,
          text: `⚠️ Creditors seized ${pick.name} for $${salePrice.toLocaleString()}.`,
        });
      }
    }

    // 4. Insolvent — capture epilogue snapshot and set runEnded.
    let nextState = {
      ...state,
      consecutiveDaysInDebt,
      solvencyTier: solvency.tier,
    } as typeof state;

    if (solvency.tier === "insolvent") {
      const playerHorses = Object.values(state.horses).filter((h) => !h.stableId);
      const lifetimeEarnings = playerHorses.reduce(
        (sum, h) => sum + (h.raceHistory ?? []).reduce((s, r) => s + (r.purseEarned ?? 0), 0),
        0,
      );
      nextState = {
        ...nextState,
        runEnded: true,
        runEndSnapshot: {
          day: newDay,
          cash,
          horsesOwned: playerHorses.length,
          lifetimeEarnings,
          reputationTier: state.reputation?.tier ?? "unknown",
          causeOfDeath: `Cash fell to $${cash.toLocaleString()}, past the insolvency floor.`,
        },
      };
      newLogs.push({
        day: newDay,
        text: `💀 Stable declared insolvent at $${cash.toLocaleString()}. Run over.`,
      });
    }

    return {
      ...context,
      state: nextState,
      logs: [...logs, ...newLogs],
      impacts: [...context.impacts, ...impacts],
    };
  },
};
