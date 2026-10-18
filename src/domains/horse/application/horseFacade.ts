/**
 * horseFacade.ts — Service-layer facade for horse domain.
 * Re-exports all horse core modules so components import from @/services/horse
 * instead of @/core/horse, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

export * from "@/domains/horse/simulation/types";
export * from "@/domains/horse/simulation/ownership";
export * from "@/domains/horse/simulation/stats";
export * from "@/domains/horse/simulation/paceTendency";
export * from "@/domains/horse/simulation/horseFactory";
export * from "@/domains/horse/simulation/attachment";
export * from "@/domains/horse/simulation/pricing";
export * from "@/domains/horse/simulation/jargon";
export * from "@/domains/horse/simulation/insightMetrics";
export * from "@/domains/horse/simulation/gender";
export * from "@/domains/horse/simulation/foalDevelopment";
export * from "@/domains/horse/simulation/overrideNegotiation";
export * from "@/domains/horse/simulation/genetics-readout";
export * from "@/domains/horse/simulation/foal-inheritance";
export * from "@/domains/horse/simulation/uiHelpers";
export * from "@/domains/horse/simulation/grading";
export * from "@/domains/horse/simulation/insights";
export * from "@/domains/horse/simulation/proceduralPortrait";
export * from "@/domains/horse/simulation/portraitPalettes";
export * from "@/domains/horse/simulation/dailyProgress";
