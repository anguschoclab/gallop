import type { Impact } from "./base";
import type { SystemsState } from "@/game/state/systemsState";

// Cash impact
export interface CashImpact extends Impact {
  type: "cash_change";
  entityId: string; // stableId or undefined for player
  amount: number;
  reason: string;
}

// Transaction impact
export interface TransactionImpact extends Impact {
  type: "transaction";
  amount: number;
  category: string;
  description: string;
  metadata?: Record<string, any>;
}

// Expense impact - merged with CashImpact usage but sometimes defined separately in intent
export type FinancialImpact = CashImpact | TransactionImpact;
