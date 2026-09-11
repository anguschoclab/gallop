/**
 * horseFacade.ts — Service-layer facade for horse domain.
 * Re-exports all horse core modules so components import from @/services/horse
 * instead of @/core/horse, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

export * from "@/core/horse/types";
export * from "@/core/horse/ownership";
export * from "@/core/horse/stats";
export * from "@/core/horse/paceTendency";
export * from "@/core/horse/horseFactory";
export * from "@/core/horse/attachment";
export * from "@/core/horse/pricing";
export * from "@/core/horse/jargon";
export * from "@/core/horse/insightMetrics";
export * from "@/core/horse/gender";
export * from "@/core/horse/foalDevelopment";
export * from "@/core/horse/overrideNegotiation";
export * from "@/core/horse/genetics-readout";
export * from "@/core/horse/foal-inheritance";
export * from "@/core/horse/uiHelpers";
export * from "@/core/horse/grading";
export * from "@/core/horse/insights";
export * from "@/core/horse/proceduralPortrait";
export * from "@/core/horse/portraitPalettes";
