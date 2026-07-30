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
  const hasNarrative = stables.some((s) => manager.stableStates[s.id]?.narrativeState);
  if (!hasNarrative) return manager;

  const updatedStates = { ...manager.stableStates };

  for (const stable of stables) {
    const state = updatedStates[stable.id];
    if (!state?.narrativeState) continue;

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

// ─── Race Beat Detection ─────────────────────────────────────────────────────

/**
 * Detect dramatic race outcomes and generate story beats.
 *
 * Examines resolved races for narrative-worthy events:
 * - G1 wins by NPC stables (major achievement)
 * - Upset victories (low-rated horse beats high-rated field)
 * - Winning streaks (3+ consecutive wins)
 *
 * @param manager - Current NPC AI manager
 * @param resolvedRaces - Races resolved today
 * @param horseMap - Map of all horses for lookup
 * @param day - Current game day
 * @returns Updated manager with new story beats
 */
export function detectRaceBeats(
  manager: NpcAIManager,
  resolvedRaces: Race[],
  horseMap: Map<string, Horse>,
  day: number,
): NpcAIManager {
  let result = manager;

  for (const race of resolvedRaces) {
    if (!race.result || race.result.length === 0) continue;

    const winner = race.result.find((r) => r.position === 1);
    if (!winner) continue;

    const winnerHorse = horseMap.get(winner.horseId);
    if (!winnerHorse) continue;

    // Only generate beats for NPC-owned horses
    if (!winnerHorse.stableId) continue;
    const stableState = result.stableStates[winnerHorse.stableId];
    if (!stableState?.narrativeState) continue;

    // G1 win — major narrative beat
    if (race.graded?.grade === "G1") {
      const beat = generateStoryBeat(
        "g1_victory",
        day,
        `${winnerHorse.name} Triumphs in ${race.name}`,
        `${winnerHorse.name} delivered a stunning performance to win the ${race.graded.grade} ${race.name}, cementing their stable's reputation on the biggest stage.`,
      );
      result = addBeatToManager(result, winnerHorse.stableId, beat);
    }

    // Upset detection — winner has significantly lower rating than field average
    const fieldHorses = race.result
      .map((r) => horseMap.get(r.horseId))
      .filter((h): h is Horse => h !== undefined && h.id !== winnerHorse.id);
    if (fieldHorses.length >= 3) {
      const winnerRating =
        (winnerHorse.stats.speed +
          winnerHorse.stats.stamina +
          winnerHorse.stats.acceleration +
          winnerHorse.stats.consistency) /
        4;
      const fieldAvgRating =
        fieldHorses.reduce(
          (sum, h) =>
            sum +
            (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4,
          0,
        ) / fieldHorses.length;

      // Upset: winner is 15+ points below field average
      if (winnerRating < fieldAvgRating - 15) {
        const beat = generateStoryBeat(
          "upset",
          day,
          `Shock Result: ${winnerHorse.name} Stuns Field in ${race.name}`,
          `In a result few saw coming, ${winnerHorse.name} defied the odds to claim victory in ${race.name}, proving that heart and determination can overcome any disadvantage.`,
        );
        result = addBeatToManager(result, winnerHorse.stableId, beat);
      }
    }

    // Winning streak detection — 3+ consecutive wins
    const recentWins = winnerHorse.raceHistory
      .filter((r) => r.position === 1)
      .sort((a, b) => b.day - a.day);
    if (recentWins.length >= 3) {
      const lastThreeWins = recentWins.slice(0, 3);
      const allRecentRaces = winnerHorse.raceHistory
        .filter((r) => r.day >= lastThreeWins[2].day)
        .sort((a, b) => a.day - b.day);
      const isStreak = allRecentRaces.length === 3 && allRecentRaces.every((r) => r.position === 1);
      if (isStreak) {
        const beat = generateStoryBeat(
          "winning_streak",
          day,
          `${winnerHorse.name} on a Three-Race Win Streak`,
          `${winnerHorse.name} continues their dominant run with a third consecutive victory in ${race.name}. The racing world is taking notice of this remarkable streak.`,
        );
        result = addBeatToManager(result, winnerHorse.stableId, beat);
      }
    }
  }

  return result;
}

/**
 * Add a story beat to a stable's narrative state.
 *
 * @param manager - Current NPC AI manager
 * @param stableId - Stable ID to add the beat to
 * @param beat - Story beat to add
 * @returns Updated manager with new beat
 */
function addBeatToManager(manager: NpcAIManager, stableId: string, beat: StoryBeat): NpcAIManager {
  const state = manager.stableStates[stableId];
  if (!state?.narrativeState) return manager;

  return {
    ...manager,
    stableStates: {
      ...manager.stableStates,
      [stableId]: {
        ...state,
        narrativeState: {
          ...state.narrativeState,
          storyBeats: [...state.narrativeState.storyBeats, beat],
        },
      },
    },
  };
}
