/**
 * standingsFacade.ts — Service-layer re-exports for standings domain.
 * Routes component imports away from direct @/core/standings access.
 */

export { buildStandingsRows } from "@/core/standings/buildStandingsRows";
export type { StandingEntry } from "@/core/standings/computeStandings";
export type { WealthStandingEntry } from "@/core/standings/computeWealthStandings";
