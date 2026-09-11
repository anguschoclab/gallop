/**
 * helpers/market.ts - Re-export from @/core/market/marketRefresh
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing importers working during the transition.
 *
 * @deprecated Import from @/core/market/marketRefresh instead.
 */

export {
  ageHorses,
  refreshMarket,
  generateUpcomingScheduledRaces,
  pruneOldRaces,
} from "@/core/market/marketRefresh";
