/**
 * exchangePanelService.ts - Service facade for exchange panel display operations.
 *
 * Wraps core market/stable functions so components don't import core directly.
 * This reduces component→core layering violations for the exchange panel UI.
 *
 * Dependencies: @/shared/common/formatting, @/core/horse/ownership,
 *              @/core/market/exchange, @/core/stable/stableRoster,
 *              @/core/stable/stableYard
 * Related files: src/components/market/ExchangePanel.tsx (consumer)
 */

import { formatCurrency } from "@/shared/common/formatting";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import {
  buildMarketDepth,
  buildOrderBooks,
  createDefaultExchangeState,
  exchangeCommissionRate,
  suggestAskPrice,
  tradeSeries,
} from "@/domains/market/simulation/exchange";
import { buildStableRosters, rosterSummary } from "@/domains/stable/simulation/stableRoster";
import { formatYard, resolveStableYard } from "@/domains/stable/simulation/stableYard";

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
