/**
 * breedingFacade.ts — Service-layer facade for breeding domain.
 * Re-exports all breeding core modules so components import from
 * @/services/breeding instead of @/core/breeding, keeping the adapter→core
 * layering boundary intact.
 * Per PR 9 of the megaplan.
 */

// Breeding domain modules
export * from "@/core/breeding/types";
export * from "@/core/breeding/leaderboardTypes";
export * from "@/core/breeding/archetypes";
export * from "@/core/breeding/sireAnalytics";
export * from "@/core/breeding/investorTypes";
export * from "@/core/breeding/strategySyndicationHelpers";
export * from "@/core/breeding/sireSuggestions";
export * from "@/core/breeding/pedigreePricing";
export * from "@/core/breeding/devolutionUtils";
export * from "@/core/breeding/stallions";
export * from "@/core/breeding/programs";
export * from "@/core/breeding/populationGenetics";
export * from "@/core/breeding/pedigreeGraph";
export * from "@/core/breeding/compatibility";
export * from "@/core/breeding/pregnancy";
export * from "@/core/breeding/eligibility";
export * from "@/core/breeding/ports";

// Cross-domain re-exports used by breeding components
export { isPlayerOwned, isNpcOwned, getStableId } from "@/core/horse/ownership";
export { isFemaleHorse, isMaleHorse, genderSymbol, genderLabel } from "@/core/horse/gender";
export { getCoatColor } from "@/core/horse/uiHelpers";
export { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
export { validateHorseName } from "@/core/horse/naming/jockeyClubRules";
export { createRng } from "@/core/common/rng";
export { formatCurrency } from "@/core/common/formatting";
export {
  inBreedingSeason,
  nextBreedingSeasonStart,
  isUniversalBirthday,
} from "@/core/calendar/breedingCalendar";
