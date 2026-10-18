/**
 * awardsFacade.ts — Service-layer facade for awards domain.
 * Re-exports all awards core modules so components import from @/services/awards
 * instead of @/core/awards, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

export * from "@/domains/awards/model/types";
export * from "@/domains/awards/simulation/invitations";
export * from "@/domains/awards/simulation/scoring";
export * from "@/domains/awards/simulation/connectionTrophies";
export * from "@/domains/awards/simulation/awardInboxMessages";
