/**
 * handlers/FinanceHandler.ts - Finance impact handler
 *
 * This file handles finance-related impacts including cash changes and horse transfers.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/financialImpacts.ts (provides impact types)
 */

import { BaseHandler } from "@/platform/resolver/handlers/BaseHandler";
import type { ImpactHandlerFunction } from "@/platform/resolver/handlers/types";
import type { CashImpact, TransactionImpact } from "@/platform/resolver/impacts/financialImpacts";
import { createTransaction } from "@/domains/transactions/model/transactionTypes";
import type { HorseTransferImpact } from "@/platform/resolver/impacts/horseImpacts";
import { makePlayerOwned, makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  cash_change: (draft, impact, lookupMaps) => {
    const { entityId, amount } = impact as CashImpact;
    if (entityId && entityId !== "player") {
      const stable =
        lookupMaps?.stableMap.get(entityId) || draft.npcStables.find((s) => s.id === entityId);
      if (stable) {
        stable.cash = stable.cash + amount;
      }
    } else {
      // Once insolvent, the run is over — don't apply further player cash
      // changes (the snapshot already captured the final balance).
      if (draft.runEnded) return;
      // Player cash may go negative — the solvency phase escalates from
      // warning → forced sale → insolvent based on the deficit.
      draft.cash = draft.cash + amount;
    }
  },

  transaction: (draft, impact) => {
    const { amount, category, description, horseId, raceId, recurring } =
      impact as TransactionImpact;
    if (!draft.transactions) draft.transactions = [];
    const type = amount >= 0 ? "income" : "expense";
    const newTransaction = createTransaction(
      type,
      category,
      amount,
      description,
      impact.day,
      draft.cash + amount,
      { horseId, raceId, recurring },
    );
    draft.transactions.push(newTransaction);
  },

  horse_transfer: (draft, impact, lookupMaps) => {
    const { horseId, toStableId } = impact as HorseTransferImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.ownership = toStableId ? makeNpcOwned(asNpcStableId(toStableId)) : makePlayerOwned();
    }
  },
};

export class FinanceHandler extends BaseHandler {
  protected get handlers() {
    return IMPACT_HANDLERS;
  }
}
