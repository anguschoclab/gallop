/**
 * exchangePanelService.ts - Service facade for exchange panel display operations.
 *
 * Wraps core market/stable functions so components don't import core directly.
 * This reduces component→core layering violations for the exchange panel UI.
 *
 * Dependencies: @/core/common/formatting, @/core/horse/ownership,
 *              @/core/market/exchange, @/core/stable/stableRoster,
 *              @/core/stable/stableYard
 * Related files: src/components/market/ExchangePanel.tsx (consumer)
 */

import { formatCurrency } from "@/core/common/formatting";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  buildMarketDepth,
  buildOrderBooks,
  createDefaultExchangeState,
  exchangeCommissionRate,
  suggestAskPrice,
  tradeSeries,
} from "@/core/market/exchange";
import { buildStableRosters, rosterSummary } from "@/core/stable/stableRoster";
import { formatYard, resolveStableYard } from "@/core/stable/stableYard";

export {
  formatCurrency,
  isPlayerOwned,
  buildMarketDepth,
  buildOrderBooks,
  createDefaultExchangeState,
  exchangeCommissionRate,
  suggestAskPrice,
  tradeSeries,
  buildStableRosters,
  rosterSummary,
  formatYard,
  resolveStableYard,
};
