/**
 * diplomacyAI.ts - NPC-to-NPC diplomatic system
 *
 * Manages relationships, alliances, and cartels between NPC stables.
 * Provides trust dynamics, alliance formation/breaking, and cartel coordination.
 *
 * Dependencies: @/game/types (Stable, GameState), ./npcCycleAI (NpcAIManager, StableAIState, NpcRelationship, AllianceType, Cartel, DiplomaticEvent)
 * Related files: strategicCoordinator.ts (uses diplomacy state), npcCycle.ts (calls processDiplomaticInteractions)
 */

import type { Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type {
  NpcAIManager,
  NpcRelationship,
  AllianceType,
  Cartel,
  DiplomaticEvent,
} from "./npcCycleAI";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLIANCE_TRUST_THRESHOLD = 50;
const ALLIANCE_BREAK_TRUST_THRESHOLD = -10;
const CARTEL_TRUST_THRESHOLD = 60;
const MAX_TRUST = 100;
const MIN_TRUST = -100;

// Personality -> preferred alliance type mapping
const PERSONALITY_ALLIANCE_TYPE: Record<Stable["personality"], AllianceType> = {
  aggressive: "racing_coalition",
  conservative: "non_aggression_pact",
  developer: "breeding_partnership",
  "win-now": "racing_coalition",
  specialist: "non_aggression_pact",
  breeder: "breeding_partnership",
  trader: "economic_cartel",
  prestige: "racing_coalition",
};

// ─── Relationship Initialization ─────────────────────────────────────────────

/**
 * Initialize NPC relationships for all stables if not already present.
 *
 * Creates empty relationship records with neutral trust (0) for each pair of stables.
 *
 * @param manager - Current NPC AI manager
 * @param stables - All NPC stables
 * @returns Updated manager with initialized relationships
 */
export function initializeRelationships(manager: NpcAIManager, stables: Stable[]): NpcAIManager {
  const stableIds = stables.map((s) => s.id);
  const updatedStates = { ...manager.stableStates };

  for (const stableId of stableIds) {
    const state = updatedStates[stableId];
    if (!state) continue;
    if (state.npcRelationships) continue; // Don't overwrite existing

    const relationships: Record<string, NpcRelationship> = {};
    for (const otherId of stableIds) {
      if (otherId === stableId) continue;
      relationships[otherId] = {
        trust: 0,
        allianceType: null,
        history: [],
      };
    }
    updatedStates[stableId] = {
      ...state,
      npcRelationships: relationships,
    };
  }

  return {
    ...manager,
    stableStates: updatedStates,
  };
}

// ─── Alliance Evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate whether an alliance opportunity exists between two stables.
 *
 * @param stable1 - First stable
 * @param stable2 - Second stable
 * @param relationship - Current relationship from stable1's perspective
 * @returns Alliance type if opportunity exists, null otherwise
 */
export function evaluateAllianceOpportunity(
  stable1: Stable,
  stable2: Stable,
  relationship: NpcRelationship,
): AllianceType | null {
  if (relationship.trust < ALLIANCE_TRUST_THRESHOLD) return null;
  if (relationship.allianceType !== null) return null; // Already in alliance

  // Determine alliance type based on personality compatibility
  const type1 = PERSONALITY_ALLIANCE_TYPE[stable1.personality];
  const type2 = PERSONALITY_ALLIANCE_TYPE[stable2.personality];

  // If both prefer the same type, use it
  if (type1 === type2) return type1;

  // Otherwise, prefer the more specific type (breeding > racing > economic > non_aggression)
  const priority: AllianceType[] = [
    "breeding_partnership",
    "racing_coalition",
    "economic_cartel",
    "non_aggression_pact",
  ];
  for (const type of priority) {
    if (type1 === type || type2 === type) return type;
  }

  return type1;
}

// ─── Alliance Management ─────────────────────────────────────────────────────

/**
 * Form an alliance between two stables.
 *
 * Sets allianceType on both sides and records a diplomatic event.
 *
 * @param manager - Current NPC AI manager
 * @param stableId1 - First stable ID
 * @param stableId2 - Second stable ID
 * @param allianceType - Type of alliance to form
 * @param day - Current game day
 * @returns Updated manager with alliance formed
 */
export function formAlliance(
  manager: NpcAIManager,
  stableId1: string,
  stableId2: string,
  allianceType: AllianceType,
  day: number,
): NpcAIManager {
  const updatedStates = { ...manager.stableStates };
  const event: DiplomaticEvent = {
    day,
    type: "alliance_formed",
    description: `${allianceType} formed between ${stableId1} and ${stableId2}`,
  };

  for (const [s1, s2] of [
    [stableId1, stableId2],
    [stableId2, stableId1],
  ] as const) {
    const state = updatedStates[s1];
    if (!state?.npcRelationships?.[s2]) continue;
    updatedStates[s1] = {
      ...state,
      npcRelationships: {
        ...state.npcRelationships,
        [s2]: {
          ...state.npcRelationships[s2],
          allianceType,
          allianceSinceDay: day,
          history: [...state.npcRelationships[s2].history, event],
        },
      },
    };
  }

  return { ...manager, stableStates: updatedStates };
}

/**
 * Break an alliance between two stables.
 *
 * Sets allianceType to null on both sides and records a diplomatic event.
 *
 * @param manager - Current NPC AI manager
 * @param stableId1 - First stable ID
 * @param stableId2 - Second stable ID
 * @param day - Current game day
 * @param reason - Reason for breaking (e.g. "betrayal", "trust_lost")
 * @returns Updated manager with alliance broken
 */
export function breakAlliance(
  manager: NpcAIManager,
  stableId1: string,
  stableId2: string,
  day: number,
  reason: string,
): NpcAIManager {
  const updatedStates = { ...manager.stableStates };
  const event: DiplomaticEvent = {
    day,
    type: "alliance_broken",
    description: `Alliance broken: ${reason}`,
  };

  for (const [s1, s2] of [
    [stableId1, stableId2],
    [stableId2, stableId1],
  ] as const) {
    const state = updatedStates[s1];
    if (!state?.npcRelationships?.[s2]) continue;
    updatedStates[s1] = {
      ...state,
      npcRelationships: {
        ...state.npcRelationships,
        [s2]: {
          ...state.npcRelationships[s2],
          allianceType: null,
          allianceSinceDay: undefined,
          history: [...state.npcRelationships[s2].history, event],
        },
      },
    };
  }

  return { ...manager, stableStates: updatedStates };
}

// ─── Trust Management ────────────────────────────────────────────────────────

/**
 * Update trust between two stables symmetrically.
 *
 * @param manager - Current NPC AI manager
 * @param stableId1 - First stable ID
 * @param stableId2 - Second stable ID
 * @param delta - Trust change amount (positive or negative)
 * @returns Updated manager with adjusted trust
 */
export function updateTrust(
  manager: NpcAIManager,
  stableId1: string,
  stableId2: string,
  delta: number,
): NpcAIManager {
  const updatedStates = { ...manager.stableStates };

  for (const [s1, s2] of [
    [stableId1, stableId2],
    [stableId2, stableId1],
  ] as const) {
    const state = updatedStates[s1];
    if (!state?.npcRelationships?.[s2]) continue;
    const currentTrust = state.npcRelationships[s2].trust;
    const newTrust = Math.max(MIN_TRUST, Math.min(MAX_TRUST, currentTrust + delta));
    updatedStates[s1] = {
      ...state,
      npcRelationships: {
        ...state.npcRelationships,
        [s2]: {
          ...state.npcRelationships[s2],
          trust: newTrust,
        },
      },
    };
  }

  return { ...manager, stableStates: updatedStates };
}

// ─── Cartel Management ───────────────────────────────────────────────────────

/**
 * Evaluate whether a cartel can be formed between a set of stables.
 *
 * Requires at least 2 stables with mutual trust above the cartel threshold.
 *
 * @param manager - Current NPC AI manager
 * @param initiatorId - Stable initiating the cartel
 * @param candidateIds - Other stable IDs to evaluate
 * @returns Cartel info if formation is viable, null otherwise
 */
export function evaluateCartelFormation(
  manager: NpcAIManager,
  initiatorId: string,
  candidateIds: string[],
): { memberStableIds: string[]; type: Cartel["type"] } | null {
  const eligibleMembers = [initiatorId];

  for (const candidateId of candidateIds) {
    if (candidateId === initiatorId) continue;
    const rel = manager.stableStates[initiatorId]?.npcRelationships?.[candidateId];
    if (!rel) continue;
    if (rel.trust < CARTEL_TRUST_THRESHOLD) continue;

    // Check mutual trust from the other side
    const reverseRel = manager.stableStates[candidateId]?.npcRelationships?.[initiatorId];
    if (!reverseRel || reverseRel.trust < CARTEL_TRUST_THRESHOLD) continue;

    eligibleMembers.push(candidateId);
  }

  if (eligibleMembers.length < 2) return null;

  // Determine cartel type from the initiator's personality
  const initiatorState = manager.stableStates[initiatorId];
  const initiatorPersonality = initiatorState?.personalityState?.personality;
  const type: Cartel["type"] =
    initiatorPersonality === "breeder" || initiatorPersonality === "developer"
      ? "breeding"
      : initiatorPersonality === "trader"
        ? "claiming"
        : "auction";

  return { memberStableIds: eligibleMembers, type };
}

/**
 * Form a cartel and add it to the manager's active cartels.
 *
 * @param manager - Current NPC AI manager
 * @param memberIds - Stable IDs in the cartel
 * @param type - Cartel type
 * @returns Updated manager with cartel added
 */
export function formCartel(
  manager: NpcAIManager,
  memberIds: string[],
  type: Cartel["type"],
): NpcAIManager {
  const existingCartels = manager.activeCartels ?? [];

  // Check for duplicate cartel with same members
  const memberSet = new Set(memberIds);
  for (const existing of existingCartels) {
    if (existing.memberStableIds.length === memberIds.length) {
      const existingSet = new Set(existing.memberStableIds);
      const isDuplicate = memberIds.every((id) => existingSet.has(id));
      if (isDuplicate) return manager; // Don't create duplicate
    }
  }

  const cartel: Cartel = {
    id: generateUUID(),
    memberStableIds: memberIds,
    type,
  };

  return {
    ...manager,
    activeCartels: [...existingCartels, cartel],
  };
}

// ─── Diplomatic Processing ───────────────────────────────────────────────────

/**
 * Process all diplomatic interactions for the current cycle.
 *
 * Evaluates alliance formation, alliance breaking, and trust decay.
 * Called once per NPC cycle.
 *
 * @param manager - Current NPC AI manager
 * @param stables - All NPC stables
 * @param day - Current game day
 * @returns Updated manager with processed diplomacy
 */
export function processDiplomaticInteractions(
  manager: NpcAIManager,
  stables: Stable[],
  day: number,
): NpcAIManager {
  // Check if any relationships exist
  const hasRelationships = stables.some((s) => manager.stableStates[s.id]?.npcRelationships);
  if (!hasRelationships) return manager;

  let result = manager;
  const stableMap = new Map(stables.map((s) => [s.id, s]));

  // Process each pair of stables
  for (let i = 0; i < stables.length; i++) {
    for (let j = i + 1; j < stables.length; j++) {
      const s1 = stables[i];
      const s2 = stables[j];

      const rel1 = result.stableStates[s1.id]?.npcRelationships?.[s2.id];
      if (!rel1) continue;

      // Check for alliance breaking (trust too low)
      if (rel1.allianceType && rel1.trust < ALLIANCE_BREAK_TRUST_THRESHOLD) {
        result = breakAlliance(result, s1.id, s2.id, day, "trust_lost");
        continue;
      }

      // Check for alliance formation
      if (!rel1.allianceType && rel1.trust >= ALLIANCE_TRUST_THRESHOLD) {
        const allianceType = evaluateAllianceOpportunity(s1, s2, rel1);
        if (allianceType) {
          result = formAlliance(result, s1.id, s2.id, allianceType, day);
        }
      }
    }
  }

  return result;
}

/**
 * Process trust impact from claiming actions.
 * When an NPC claims a horse from another NPC stable, trust between them decreases.
 * If they were allies, the alliance may break.
 *
 * @param manager - Current NPC AI manager
 * @param claimantId - Stable ID of the claiming stable
 * @param previousOwnerId - Stable ID of the horse's previous owner
 * @returns Updated manager with adjusted trust
 */
export function processClaimingFriction(
  manager: NpcAIManager,
  claimantId: string,
  previousOwnerId: string,
): NpcAIManager {
  if (claimantId === previousOwnerId) return manager;

  const rel = manager.stableStates[claimantId]?.npcRelationships?.[previousOwnerId];
  if (!rel) return manager;

  // Claiming from an ally is a bigger betrayal
  const trustReduction = rel.allianceType ? -30 : -15;
  return updateTrust(manager, claimantId, previousOwnerId, trustReduction);
}
