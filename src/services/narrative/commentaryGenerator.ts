import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Horse, Race, Stable } from "@/game/types";
import { getStableId } from "@/core/horse/ownership";
import type { Rng } from "@/core/common/rng";
import {
  BIOGRAPHICAL_TEMPLATES,
  FRAGMENTS,
  EXPERT_INSIGHT_TEMPLATES,
  TEMPLATES,
} from "@/assets/narrative/templates";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import type { NarrativeEvent, CommentaryLine } from "./types";
export type { NarrativeEvent, CommentaryLine } from "./types";
import { composeSentence } from "./sentenceComposer";
import { generateProcedural } from "./proceduralGenerator";
import { DYNAMIC_OPENERS, DYNAMIC_TRAILERS } from "@/assets/narrative/dynamicClauses";

/**
 * Commentary Generation System
 * Generates narrative commentary lines from templates and context
 */

/**
 * Generate a commentary line from a template.
 *
 * @param type - Narrative event type
 * @param timestamp - Simulation time when event occurred
 * @param context - Narrative context for template resolution
 * @param context.race - Current race data
 * @param context.runner - Runner associated with event
 * @param context.horse - Horse data for the runner
 * @param context.stable - Stable data for the horse
 * @param context.rng - RNG service for template selection
 * @param context.lengths - Optional gap distance string
 * @param context.hasAnnouncedBio - Set of horses with announced biographies
 * @param context.lastRanks - Map of previous field ranks
 * @param lineCounter - Object wrapping unique ID counter
 * @param lineCounter.value - The current counter value
 * @returns Formatted CommentaryLine object
 */
export function generateCommentaryLine(
  type: NarrativeEvent,
  timestamp: number,
  context: {
    race: Race;
    runner?: Runner;
    horse?: Horse;
    stable: Stable | null;
    rng: Rng;
    lengths?: string;
    hasAnnouncedBio?: Set<string>;
    lastRanks?: Map<string, number>;
    courseSpec?: { straightLength?: number; circumference?: number };
    track?: { elevation?: number };
    raceContext?: {
      defendingChampion?: { horseName: string; year: number };
      trackRecordTime?: number;
      trackRecordHolder?: string;
      previousFinishPositions?: Record<string, number>;
      horseCourseVisits?: Record<string, number>;
    };
  },
  lineCounter: { value: number },
): CommentaryLine {
  const templates = TEMPLATES[type];
  if (!templates || templates.length === 0) {
    return { id: `${type}-${lineCounter.value++}`, text: "", timestamp, type, horseId: context.runner?.horseId, receivedAt: Date.now() };
  }

  let text: string;

  // 7A: Composable sentence fragments — 30% chance for SURGE, FLYING, FADE
  const composeTypes: NarrativeEvent[] = ["SURGE", "FLYING", "FADE"];
  if (composeTypes.includes(type) && context.rng.next() < 0.30) {
    const composed = composeSentence(type, context.rng);
    text = composed || templates[Math.floor(context.rng.next() * templates.length)];
  } else {
    // 7B: Procedural generation — 15% chance for LEAD_CHANGE, STRETCH, FINISH
    const proceduralTypes: NarrativeEvent[] = ["LEAD_CHANGE", "STRETCH", "FINISH"];
    if (proceduralTypes.includes(type) && context.rng.next() < 0.15) {
      const procedural = generateProcedural(type, context.rng);
      text = procedural || templates[Math.floor(context.rng.next() * templates.length)];
    } else {
      text = templates[Math.floor(context.rng.next() * templates.length)];
    }
  }

  // 7C: Hybrid dynamic clause injection — 10% chance to prepend opener / append trailer
  // Skip for milestone and factual events to preserve exact template matching
  const skipClauses: NarrativeEvent[] = [
    "MILESTONE", "MILESTONE_HALFWAY", "MILESTONE_FINAL_400",
    "MILESTONE_FINAL_200", "MILESTONE_FINAL_100",
    "START", "FINISH", "WEATHER_COMMENT",
  ];
  if (!skipClauses.includes(type) && context.rng.next() < 0.10) {
    const opener = DYNAMIC_OPENERS[Math.floor(context.rng.next() * DYNAMIC_OPENERS.length)];
    text = `${opener} ${text}`;
  }
  if (!skipClauses.includes(type) && context.rng.next() < 0.10) {
    const trailer = DYNAMIC_TRAILERS[Math.floor(context.rng.next() * DYNAMIC_TRAILERS.length)];
    text = `${text} ${trailer}`;
  }

  // Add prefixes for impactful events
  if (
    context.rng.next() < NARRATIVE_THRESHOLDS.PREFIX_PROBABILITY &&
    (type === "SURGE" || type === "LEAD_CHANGE")
  ) {
    const prefix = FRAGMENTS.PREFIXES[Math.floor(context.rng.next() * FRAGMENTS.PREFIXES.length)];
    text = `${prefix} ${text}`;
  }

  const sub = (token: string, value: string) => {
    text = text.split(token).join(value);
  };

  // Replace race context placeholders
  sub("{raceName}", context.race.name);
  sub("{raceClass}", context.race.raceClass);
  sub("{trackName}", context.race.graded?.track || "the track");
  sub("{weather}", context.race.weather || "clear");
  sub("{trackCondition}", context.race.trackCondition || "good");
  sub("{remaining}", (context.race.distance - (context.runner?.position || 0)).toFixed(0));
  sub("{grade}", context.race.graded?.grade || "");
  sub("{straightLength}", context.courseSpec?.straightLength?.toString() || "");
  sub("{circumference}", context.courseSpec?.circumference?.toString() || "");
  sub("{elevation}", context.track?.elevation?.toString() || "");

  // Race context placeholders
  if (context.raceContext) {
    const rc = context.raceContext;
    sub("{year}", rc.defendingChampion?.year?.toString() || "");
    sub("{recordTime}", rc.trackRecordTime?.toFixed(1) || "");
    sub("{recordHolder}", rc.trackRecordHolder || "");
    const horseId = context.runner?.horseId || "";
    sub("{prevPosition}", rc.previousFinishPositions?.[horseId]?.toString() || "");
    sub("{visits}", rc.horseCourseVisits?.[horseId]?.toString() || "");
  } else {
    sub("{year}", "");
    sub("{recordTime}", "");
    sub("{recordHolder}", "");
    sub("{prevPosition}", "");
    sub("{visits}", "");
  }

  if (context.lengths) {
    sub("{lengths}", context.lengths);
  }

  // Replace horse context placeholders. The runner name is always available,
  // even when no Horse record exists (e.g. auto-generated filler runners).
  if (context.runner) {
    const horse = context.horse;
    const stable = getStableId(horse) ? context.stable : null;

    // Add biographical template for surge/lead change
    if (
      (type === "SURGE" || type === "LEAD_CHANGE") &&
      context.hasAnnouncedBio &&
      !context.hasAnnouncedBio.has(context.runner.horseId) &&
      context.rng.next() < NARRATIVE_THRESHOLDS.BIO_TEMPLATE_PROBABILITY
    ) {
      const bio =
        BIOGRAPHICAL_TEMPLATES[Math.floor(context.rng.next() * BIOGRAPHICAL_TEMPLATES.length)];
      text = bio + " " + text;
      context.hasAnnouncedBio.add(context.runner.horseId);
    }

    sub("{horse}", context.runner.name);
    sub("{coat}", horse?.coatColor || "well-turned-out");
    sub("{gender}", horse?.gender || "runner");
    sub("{sire}", horse?.sireName || "an unheralded sire");
    sub("{dam}", horse?.damName || "an unheralded mare");
    sub("{stable}", stable?.name || "Independent");
    sub("{family}", horse?.bruceLoweFamily?.toString() || "Unknown");

    // Replace jockey placeholders
    const jockeyName = context.runner.jockeyName || context.runner.jockey?.name || "the jockey";
    sub("{jockey}", jockeyName);
    sub("{jockeyArchetype}", context.runner.jockey?.archetype || "versatile");

    // Replace rank placeholder
    if (context.lastRanks) {
      const rank = context.lastRanks.get(context.runner.horseId);
      if (rank) {
        sub("{rank}", getOrdinal(rank));
      }
    }
  }

  return {
    id: `${type}-${lineCounter.value++}`,
    text,
    timestamp,
    type,
    horseId: context.runner?.horseId,
    receivedAt: Date.now(),
  };
}

/**
 * Generate expert insight commentary based on horse form and race context.
 *
 * @param runner - The runner to analyze
 * @param horse - Horse data for the runner
 * @param race - Current race data
 * @param stable - Stable data for the horse
 * @param rng - RNG service for selection
 * @returns Insight text or null if no insights applicable
 */
export function generateExpertInsight(
  runner: Runner,
  horse: Horse,
  race: Race,
  stable: Stable | null,
  rng: Rng,
): string | null {
  const insights: string[] = [];

  if (horse.form > NARRATIVE_THRESHOLDS.EXPERT_INSIGHT_POSITIVE_FORM)
    insights.push(...EXPERT_INSIGHT_TEMPLATES.POSITIVE_FORM);
  else if (horse.form < NARRATIVE_THRESHOLDS.EXPERT_INSIGHT_NEGATIVE_FORM)
    insights.push(...EXPERT_INSIGHT_TEMPLATES.NEGATIVE_FORM);

  if (stable?.preferredDistance) {
    const diff = Math.abs(race.distance - stable.preferredDistance);
    if (diff <= NARRATIVE_THRESHOLDS.EXPERT_INSIGHT_DISTANCE_FIT_TOLERANCE)
      insights.push(...EXPERT_INSIGHT_TEMPLATES.DISTANCE_FIT);
  }

  const hasRunDistance = horse.raceHistory.some((h) => h.distance === race.distance);
  if (!hasRunDistance && race.distance >= NARRATIVE_THRESHOLDS.EXPERT_INSIGHT_NEW_DISTANCE_MIN) {
    insights.push(...EXPERT_INSIGHT_TEMPLATES.NEW_DISTANCE);
  }

  const raceSurface = race.graded?.surface || race.graded_override?.surface || "Dirt";
  const surfaceApt = horse.surfaceAptitude?.[raceSurface];
  if (
    surfaceApt !== undefined &&
    surfaceApt >= NARRATIVE_THRESHOLDS.EXPERT_INSIGHT_SURFACE_APTITUDE
  ) {
    insights.push(...EXPERT_INSIGHT_TEMPLATES.SURFACE_FIT);
  }

  if (insights.length === 0) return null;

  let text = insights[Math.floor(rng.next() * insights.length)];
  text = text.split("{horse}").join(runner.name);
  text = text.split("{distance}").join(race.distance.toString());
  text = text.split("{surface}").join(raceSurface.toLowerCase());

  return text;
}

/**
 * Get ordinal number string (1st, 2nd, 3rd, etc.).
 *
 * @param n - Number to format
 * @returns Ordinal string
 */
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
