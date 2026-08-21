/**
 * impacts/financialImpacts.ts - Financial impact types
 *
 * This file provides financial impact types including cash changes and transactions.
 *
 * Dependencies: ./base (Impact), @/game/state/systemsState (SystemsState)
 * Related files: ../handlers/FinanceHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { TransactionSubcategory } from "@/core/transactions/transactionTypes";
import type { HorseId, OwnerKey, RaceId } from "@/core/types/branded";

// Cash impact
export interface CashImpact extends Impact {
  type: "cash_change";
  entityId: OwnerKey;
  amount: number;
  reason: string;
}

// Transaction impact
export interface TransactionImpact extends Impact {
  type: "transaction";
  amount: number;
  category: TransactionSubcategory;
  description: string;
  horseId?: HorseId;
  raceId?: RaceId;
  recurring?: boolean;
}

// Expense impact - merged with CashImpact usage but sometimes defined separately in intent
export type FinancialImpact = CashImpact | TransactionImpact;
