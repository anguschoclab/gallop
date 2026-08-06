/**
 * handlers/FinanceHandler.ts - Finance impact handler
 *
 * This file handles finance-related impacts including cash changes and horse transfers.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/financialImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler, LookupMaps } from "./types";
import type { CashImpact, TransactionImpact } from "../impacts/financialImpacts";
import { createTransaction } from "@/core/transactions";
import type { HorseTransferImpact } from "../impacts/horseImpacts";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: LookupMaps,
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  cash_change: (draft, impact, lookupMaps) => {
    const { entityId, amount } = impact as CashImpact;
    if (entityId && entityId !== "player") {
      const stable =
        lookupMaps?.stableMap.get(entityId) || draft.npcStables.find((s) => s.id === entityId);
      if (stable) {
        stable.cash = Math.max(0, stable.cash + amount);
      }
    } else {
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
      horse.stableId = toStableId;
      horse.owned = !toStableId;
    }
  },
};

export class FinanceHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["cash_change", "horse_transfer", "transaction"].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
