/**
 * phases/solvency.ts - Financial fail-state pipeline phase.
 *
 * Runs after impact application so it sees the day's settled cash. Applies
 * daily interest on debt, escalates warning → forced sale → insolvent, and
 * captures a legacy snapshot when the run ends. Every cash movement produced
 * here is mirrored into the solvencyAuditLog so the player can trace how
 * their finances were shaped by creditor action.
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
import { isPlayerOwned } from "@/core/horse/ownership";

const MAX_AUDIT_ENTRIES = 200;

type AuditEntry = NonNullable<PipelineContext["state"]["solvencyAuditLog"]>[number];

export const solvencyPhase = {
  name: "solvency",
  order: PHASE_ORDER_SOLVENCY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    if (state.runEnded) return context;

    const startCash = state.cash;
    const prevDays = state.consecutiveDaysInDebt ?? 0;
    const prevTier = state.solvencyTier ?? "healthy";
    const consecutiveDaysInDebt = startCash < 0 ? prevDays + 1 : 0;

    const solvency = deriveSolvencyState({
      cash: startCash,
      consecutiveDaysInDebt,
    });
    const impacts: AnyImpact[] = [];
    const newLogs: { day: number; text: string }[] = [];
    const auditAdditions: AuditEntry[] = [];

    let runningCash = startCash;

    // 1. Daily interest on any debt.
    const interest = computeDailyInterest(startCash);
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
        reason: `Daily interest on outstanding debt ($${Math.abs(startCash).toLocaleString()})`,
      } as CashImpact);
      auditAdditions.push({
        day: newDay,
        tier: solvency.tier,
        cashBefore: runningCash,
        cashAfter: runningCash - interest,
        delta: -interest,
        kind: "interest",
        detail: `${(SOLVENCY_THRESHOLDS.dailyInterestRate * 100).toFixed(2)}% daily interest on debt`,
      });
      runningCash -= interest;
    }

    // 2. Warning tier escalation notice.
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
          body: `Your account is $${Math.abs(startCash).toLocaleString()} in the red. Interest accrues daily. Sell a horse or claim purses within ${SOLVENCY_THRESHOLDS.forcedSaleDays} days to avoid a forced sale.`,
          cta: { label: "Open finances", route: "financial-report" },
        },
      } as InboxImpact);
      auditAdditions.push({
        day: newDay,
        tier: solvency.tier,
        cashBefore: runningCash,
        cashAfter: runningCash,
        delta: 0,
        kind: "escalation",
        detail: "Entered warning tier — grace period started",
      });
    }

    // 2b. Proactive "approaching forced sale" alert (configurable days out).
    const imminentWarningDays = state.userSettings?.gameplay?.imminentForcedSaleWarningDays ?? 2;
    if (
      solvency.tier === "warning" &&
      startCash <= SOLVENCY_THRESHOLDS.forcedSaleCash &&
      consecutiveDaysInDebt === SOLVENCY_THRESHOLDS.forcedSaleDays - imminentWarningDays
    ) {
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
          priority: "urgent",
          title: "Forced sale imminent",
          body: `Creditors will seize a horse in ${imminentWarningDays} day${imminentWarningDays === 1 ? "" : "s"} unless your balance recovers above $${SOLVENCY_THRESHOLDS.forcedSaleCash.toLocaleString()}.`,
          cta: { label: "Open finances", route: "financial-report" },
        },
      } as InboxImpact);
      auditAdditions.push({
        day: newDay,
        tier: solvency.tier,
        cashBefore: runningCash,
        cashAfter: runningCash,
        delta: 0,
        kind: "escalation",
        detail: `Approaching forced sale — ${imminentWarningDays} day${imminentWarningDays === 1 ? "" : "s"} remaining`,
      });
    }

    // 3. Forced sale — creditors seize the most valuable horse at 70% value.
    let seizureRecord: {
      horseName: string;
      assessedValue: number;
      salePrice: number;
      deficitAfter: number;
    } | null = null;

    if (solvency.tier === "forced_sale") {
      const candidates = Object.values(state.horses)
        .filter((h) => isPlayerOwned(h))
        .map((h) => ({
          id: h.id,
          owned: true,
          age: h.age,
          value: horsePrice(h),
          name: h.name,
        }));
      const pick = selectForcedSaleHorse(candidates);
      if (pick) {
        const salePrice = Math.round(pick.value * SOLVENCY_THRESHOLDS.distressSaleRate);
        const deficitAfter = Math.max(0, Math.abs(runningCash) - salePrice);
        seizureRecord = {
          horseName: pick.name,
          assessedValue: pick.value,
          salePrice,
          deficitAfter,
        };
        impacts.push(
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
            reason: "Distressed sale — creditors seized horse to cover debt",
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
              body: `${pick.name} was sold at a distressed rate for $${salePrice.toLocaleString()} to cover overdue debt. Remaining deficit: $${deficitAfter.toLocaleString()}.`,
              cta: { label: "Review stable", route: "stable" },
            },
          } as InboxImpact,
        );
        auditAdditions.push({
          day: newDay,
          tier: solvency.tier,
          cashBefore: runningCash,
          cashAfter: runningCash + salePrice,
          delta: salePrice,
          kind: "seizure",
          detail: `Creditors seized ${pick.name} (assessed $${pick.value.toLocaleString()}, distress $${salePrice.toLocaleString()})`,
        });
        runningCash += salePrice;
        newLogs.push({
          day: newDay,
          text: `⚠️ Creditors seized ${pick.name} for $${salePrice.toLocaleString()}.`,
        });
      }
    }

    // Recovery audit — player clawed back to solvent this day.
    if (prevTier !== "healthy" && solvency.tier === "healthy") {
      auditAdditions.push({
        day: newDay,
        tier: "healthy",
        cashBefore: runningCash,
        cashAfter: runningCash,
        delta: 0,
        kind: "recovered",
        detail: "Balance restored above zero — solvency cleared",
      });
    }

    // Assemble next state.
    const trimmedAudit = [...(state.solvencyAuditLog ?? []), ...auditAdditions].slice(
      -MAX_AUDIT_ENTRIES,
    );

    let nextState = {
      ...state,
      consecutiveDaysInDebt,
      solvencyTier: solvency.tier,
      solvencyAuditLog: trimmedAudit,
    } as typeof state;

    if (solvency.tier === "insolvent") {
      const playerHorses = Object.values(state.horses).filter((h) => isPlayerOwned(h));
      const lifetimeEarnings = playerHorses.reduce(
        (sum, h) => sum + (h.raceHistory ?? []).reduce((s, r) => s + (r.purseEarned ?? 0), 0),
        0,
      );
      nextState = {
        ...nextState,
        runEnded: true,
        runEndSnapshot: {
          day: newDay,
          cash: startCash,
          horsesOwned: playerHorses.length,
          lifetimeEarnings,
          reputationTier: state.reputation?.tier ?? "unknown",
          causeOfDeath: `Cash fell to $${startCash.toLocaleString()}, past the insolvency floor.`,
          lastSeizure: seizureRecord ?? state.runEndSnapshot?.lastSeizure ?? undefined,
        },
      };
      newLogs.push({
        day: newDay,
        text: `💀 Stable declared insolvent at $${startCash.toLocaleString()}. Run over.`,
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
