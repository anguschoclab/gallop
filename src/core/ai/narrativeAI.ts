/**
 * narrativeAI.ts - AI-driven narrative arc system
 *
 * Generates and manages narrative arcs for NPC stables, creating story beats
 * that surface as news items and add dramatic depth to the game world.
 *
 * Dependencies: @/game/types (Stable, GameState), ./npcCycleAI (NpcAIManager, StableAIState, NarrativeState, NarrativeArc, StoryBeat)
 * Related files: strategicCoordinator.ts (provides world assessment), npcCycle.ts (calls processNarrativeCycle)
 */

import type { Stable } from "@/game/types";
import type { Race, RaceResult } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";
import { generateUUID } from "@/core/uuid";
import type { NpcAIManager, NarrativeState, NarrativeArc, StoryBeat } from "./npcCycleAI";

// ─── Constants ───────────────────────────────────────────────────────────────

const ARC_GENERATION_THRESHOLD = 0.7;
const MAX_ACTIVE_ARCS = 2;
const DRAMATIC_POTENTIAL_INCREMENT = 0.05;
const DRAMATIC_POTENTIAL_DECAY_ON_ARC = 0.3;
const SETUP_TO_RISING_ACTION_DAYS = 20;
const RISING_ACTION_TO_CLIMAX_DAYS = 40;
const CLIMAX_TO_RESOLUTION_DAYS = 10;

// Personality -> preferred arc type mapping
const PERSONALITY_ARC_TYPE: Record<Stable["personality"], string> = {
  aggressive: "rivalry",
  conservative: "dynasty",
  developer: "underdog",
  "win-now": "comeback",
  specialist: "specialist_journey",
  breeder: "breeding_legacy",
  trader: "rags_to_riches",
  prestige: "prestige_quest",
};

// ─── Narrative State Management ──────────────────────────────────────────────

/**
 * Create initial narrative state for a stable.
 *
 * @returns Empty narrative state with 0 dramatic potential
 */
export function createNarrativeState(): NarrativeState {
  return {
    activeArcs: [],
    storyBeats: [],
    dramaticPotential: 0,
  };
}

// ─── Narrative Evaluation ────────────────────────────────────────────────────

/**
 * Evaluate whether a narrative arc opportunity exists for a stable.
 *
 * @param stable - The stable to evaluate
 * @param narrativeState - Current narrative state for the stable
 * @param _day - Current game day (reserved for future use)
 * @returns Arc type string if opportunity exists, null otherwise
 */
export function evaluateNarrativeOpportunity(
  stable: Stable,
  narrativeState: NarrativeState,
  _day: number,
): string | null {
  if (narrativeState.dramaticPotential < ARC_GENERATION_THRESHOLD) return null;
  if (narrativeState.activeArcs.length >= MAX_ACTIVE_ARCS) return null;

  return PERSONALITY_ARC_TYPE[stable.personality] || "rivalry";
}

// ─── Arc Generation ──────────────────────────────────────────────────────────

/**
 * Generate a new story arc for a stable.
 *
 * @param stable - The stable the arc is about
 * @param type - Arc type (e.g. "rivalry", "underdog", "dynasty")
 * @param day - Current game day
 * @returns A new NarrativeArc in "setup" status
 */
export function generateStoryArc(stable: Stable, type: string, day: number): NarrativeArc {
  return {
    id: generateUUID(),
    type,
    stableId: stable.id,
    startDay: day,
    status: "setup",
    beats: [],
  };
}

/**
 * Generate a story beat for an arc.
 *
 * @param arcId - The arc this beat belongs to
 * @param day - Current game day
 * @param headline - Short headline for the beat
 * @param body - Body text for the beat
 * @returns A StoryBeat object
 */
export function generateStoryBeat(
  arcId: string,
  day: number,
  headline: string,
  body: string,
): StoryBeat {
  return { arcId, day, headline, body };
}

// ─── Narrative Cycle Processing ──────────────────────────────────────────────

/**
 * Process the narrative cycle for all stables.
 *
 * Increases dramatic potential, generates new arcs when threshold is met,
 * and advances existing arcs through their status progression.
 *
 * @param manager - Current NPC AI manager
 * @param stables - All NPC stables
 * @param day - Current game day
 * @returns Updated manager with processed narratives
 */
export function processNarrativeCycle(
  manager: NpcAIManager,
  stables: Stable[],
  day: number,
): NpcAIManager {
  const updatedStates = { ...manager.stableStates };

  for (const stable of stables) {
    const state = updatedStates[stable.id];
    if (!state) continue;

    // Initialize narrative state if not present
    if (!state.narrativeState) {
      updatedStates[stable.id] = {
        ...state,
        narrativeState: createNarrativeState(),
      };
      continue;
    }

    const narrativeState = { ...state.narrativeState };
    let activeArcs = [...narrativeState.activeArcs];

    // Increase dramatic potential over time
    narrativeState.dramaticPotential = Math.min(
      1,
      narrativeState.dramaticPotential + DRAMATIC_POTENTIAL_INCREMENT,
    );

    // Advance existing arcs
    activeArcs = activeArcs.map((arc) => {
      const daysSinceStart = day - arc.startDay;
      let newStatus = arc.status;

      if (arc.status === "setup" && daysSinceStart >= SETUP_TO_RISING_ACTION_DAYS) {
        newStatus = "rising_action";
      } else if (
        arc.status === "rising_action" &&
        daysSinceStart >= SETUP_TO_RISING_ACTION_DAYS + RISING_ACTION_TO_CLIMAX_DAYS
      ) {
        newStatus = "climax";
      } else if (
        arc.status === "climax" &&
        daysSinceStart >=
          SETUP_TO_RISING_ACTION_DAYS + RISING_ACTION_TO_CLIMAX_DAYS + CLIMAX_TO_RESOLUTION_DAYS
      ) {
        newStatus = "resolution";
      }

      if (newStatus !== arc.status) {
        return { ...arc, status: newStatus };
      }
      return arc;
    });

    // Remove resolved arcs (keep them in storyBeats for history)
    activeArcs = activeArcs.filter((arc) => arc.status !== "resolution");

    narrativeState.activeArcs = activeArcs;

    // Generate new arc if opportunity exists
    const arcType = evaluateNarrativeOpportunity(stable, narrativeState, day);
    if (arcType) {
      const newArc = generateStoryArc(stable, arcType, day);
      narrativeState.activeArcs = [...narrativeState.activeArcs, newArc];
      narrativeState.dramaticPotential -= DRAMATIC_POTENTIAL_DECAY_ON_ARC;
    }

    updatedStates[stable.id] = {
      ...state,
      narrativeState,
    };
  }

  return { ...manager, stableStates: updatedStates };
}

// ─── Arc Queries ─────────────────────────────────────────────────────────────

/**
 * Get active narrative arcs for a stable.
 *
 * @param manager - Current NPC AI manager
 * @param stableId - Stable ID to query
 * @returns Array of active arcs (empty if none)
 */
export function getActiveArcs(manager: NpcAIManager, stableId: string): NarrativeArc[] {
  return manager.stableStates[stableId]?.narrativeState?.activeArcs ?? [];
}

// ─── Arc Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a narrative arc, setting it to "resolution" status and adding a final story beat.
 *
 * @param manager - Current NPC AI manager
 * @param stableId - Stable ID that owns the arc
 * @param arcId - Arc ID to resolve
 * @param day - Current game day
 * @param headline - Resolution headline
 * @param body - Resolution body text
 * @returns Updated manager with resolved arc
 */
export function resolveArc(
  manager: NpcAIManager,
  stableId: string,
  arcId: string,
  day: number,
  headline: string,
  body: string,
): NpcAIManager {
  const state = manager.stableStates[stableId];
  if (!state?.narrativeState) return manager;

  const beat = generateStoryBeat(arcId, day, headline, body);
  const updatedArcs = state.narrativeState.activeArcs.map((arc) =>
    arc.id === arcId ? { ...arc, status: "resolution" as const, beats: [...arc.beats, beat] } : arc,
  );

  return {
    ...manager,
    stableStates: {
      ...manager.stableStates,
      [stableId]: {
        ...state,
        narrativeState: {
          ...state.narrativeState,
          activeArcs: updatedArcs,
          storyBeats: [...state.narrativeState.storyBeats, beat],
        },
      },
    },
  };
}

// Beat detection logic extracted to narrativeBeatDetection.ts
export {
  detectRaceBeats,
  detectDynastyBeats,
  detectComebackBeats,
  detectAllianceDramaBeats,
} from "./narrativeBeatDetection";
