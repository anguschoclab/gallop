/**
 * npcFacade.ts — Service-layer re-exports for NPC domain.
 * Routes component imports away from direct @/core/npc access.
 */

export { getDisplayableStats, calculateScoutCost } from "@/core/npc/scouting";
