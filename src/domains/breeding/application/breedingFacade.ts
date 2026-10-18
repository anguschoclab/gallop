/**
 * breedingFacade.ts — Service-layer facade for breeding domain.
 * Re-exports all breeding core modules so components import from
 * @/services/breeding instead of @/core/breeding, keeping the adapter→core
 * layering boundary intact.
 * Per PR 9 of the megaplan.
 */

// Breeding domain modules
export * from "@/domains/breeding/model/types";
export * from "@/domains/breeding/model/leaderboardTypes";
export * from "@/domains/breeding/simulation/archetypes";
export * from "@/domains/breeding/simulation/sireAnalytics";
export * from "@/domains/breeding/model/investorTypes";
export * from "@/domains/breeding/simulation/strategySyndicationHelpers";
export * from "@/domains/breeding/simulation/sireSuggestions";
export * from "@/domains/breeding/simulation/pedigreePricing";
export * from "@/domains/breeding/simulation/devolutionUtils";
export * from "@/domains/breeding/simulation/stallions";
export * from "@/domains/breeding/simulation/programs";
export * from "@/domains/breeding/simulation/populationGenetics";
export * from "@/domains/breeding/simulation/pedigreeGraph";
export * from "@/domains/breeding/simulation/compatibility";
export * from "@/domains/breeding/simulation/pregnancy";
export * from "@/domains/breeding/simulation/eligibility";
export * from "@/domains/breeding/simulation/ports";
export * from "@/domains/breeding/simulation/syndicateStakes";
export * from "@/domains/breeding/simulation/syndicateLedger";

// Cross-domain re-exports used by breeding components
export { isPlayerOwned, isNpcOwned, getStableId } from "@/domains/horse/simulation/ownership";
export { isFemaleHorse, isMaleHorse, genderSymbol, genderLabel } from "@/domains/horse/simulation/gender";
export { getCoatColor } from "@/domains/horse/simulation/uiHelpers";
export { generateProceduralHorseName } from "@/domains/horse/simulation/naming/nameGenerator";
export { validateHorseName } from "@/domains/horse/simulation/naming/jockeyClubRules";
export { createRng } from "@/shared/common/rng";
export { formatCurrency } from "@/shared/common/formatting";
export {
  inBreedingSeason,
  nextBreedingSeasonStart,
  isUniversalBirthday,
} from "@/domains/calendar/simulation/breedingCalendar";
