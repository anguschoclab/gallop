/**
 * awardsFacade.ts — Service-layer facade for awards domain.
 * Re-exports all awards core modules so components import from @/services/awards
 * instead of @/core/awards, keeping the adapter→core layering boundary intact.
 * Per PR 9 of the megaplan.
 */

export * from "@/core/awards/types";
export * from "@/core/awards/invitations";
export * from "@/core/awards/scoring";
export * from "@/core/awards/connectionTrophies";
export * from "@/core/awards/awardInboxMessages";
