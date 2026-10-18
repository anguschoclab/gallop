/**
 * standingsFacade.ts — Service-layer re-exports for standings domain.
 * Routes component imports away from direct @/core/standings access.
 */

export { buildStandingsRows } from "@/domains/standings/simulation/buildStandingsRows";
export type { StandingEntry } from "@/domains/standings/simulation/computeStandings";
export type { WealthStandingEntry } from "@/domains/standings/simulation/computeWealthStandings";
