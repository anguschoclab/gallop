import type { Runner } from "@/game/raceSim";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/game/rng";
import {
  BIOGRAPHICAL_TEMPLATES,
  FRAGMENTS,
  EXPERT_INSIGHT_TEMPLATES,
  TEMPLATES,
} from "@/assets/narrative/templates";

/**
 * Commentary Generation System
 * Generates narrative commentary lines from templates and context
 */

export type NarrativeEvent =
  | "START"
  | "LEAD_CHANGE"
  | "SURGE"
  | "FADE"
  | "STRETCH"
  | "FINISH"
  | "POSITION_CHECK"
  | "DRAFTING"
  | "HOT_PACE"
  | "WEATHER_COMMENT"
  | "STABLE_WATCH"
  | "MILESTONE"
  | "EXPERT_INSIGHT"
  | "GAP_ANNOUNCEMENT"
  | "ATMOSPHERE"
  | "LANE_WATCH";

export interface CommentaryLine {
  id: string;
  text: string;
  timestamp: number;
  type: NarrativeEvent;
  horseId?: string;
  isHighImpact?: boolean;
}

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
  },
  lineCounter: { value: number },
): CommentaryLine {
  const templates = TEMPLATES[type];
  if (!templates || templates.length === 0) {
    return { id: "", text: "", timestamp: 0, type: "START" };
  }

  let text = templates[Math.floor(context.rng.next() * templates.length)];

  // Add prefixes for impactful events
  if (context.rng.next() < 0.2 && (type === "SURGE" || type === "LEAD_CHANGE")) {
    const prefix = FRAGMENTS.PREFIXES[Math.floor(context.rng.next() * FRAGMENTS.PREFIXES.length)];
    text = `${prefix} ${text}`;
  }

  // Replace race context placeholders
  text = text.replace("{raceName}", context.race.name);
  text = text.replace("{raceClass}", context.race.raceClass);
  text = text.replace("{trackName}", context.race.graded?.track || "the track");
  text = text.replace("{weather}", context.race.weather || "clear");
  text = text.replace("{trackCondition}", context.race.trackCondition || "good");
  text.replace("{remaining}", (context.race.distance - (context.runner?.position || 0)).toFixed(0));

  if (context.lengths) {
    text = text.replace("{lengths}", context.lengths);
  }

  // Replace horse context placeholders
  if (context.runner && context.horse) {
    const stable = context.horse.stableId ? context.stable : null;

    // Add biographical template for surge/lead change
    if (
      (type === "SURGE" || type === "LEAD_CHANGE") &&
      context.hasAnnouncedBio &&
      !context.hasAnnouncedBio.has(context.runner.horseId) &&
      context.rng.next() < 0.35
    ) {
      const bio =
        BIOGRAPHICAL_TEMPLATES[Math.floor(context.rng.next() * BIOGRAPHICAL_TEMPLATES.length)];
      text = bio + " " + text;
      context.hasAnnouncedBio.add(context.runner.horseId);
    }

    text = text.replace("{horse}", context.runner.name);
    text = text.replace("{coat}", context.horse.coatColor || "colored");
    text = text.replace("{gender}", context.horse.gender || "runner");
    text = text.replace("{sire}", context.horse.sireName || "Unknown Sire");
    text = text.replace("{dam}", context.horse.damName || "Unknown Dam");
    text.replace("{stable}", stable?.name || "Independent");
    text.replace("{family}", context.horse.bruceLoweFamily?.toString() || "Unknown");

    // Replace rank placeholder
    if (context.lastRanks) {
      const rank = context.lastRanks.get(context.runner.horseId);
      if (rank) {
        text = text.replace("{rank}", getOrdinal(rank));
      }
    }
  }

  return {
    id: `${type}-${lineCounter.value++}`,
    text,
    timestamp,
    type,
    horseId: context.runner?.horseId,
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

  if (horse.form > 5) insights.push(...EXPERT_INSIGHT_TEMPLATES.POSITIVE_FORM);
  else if (horse.form < -5) insights.push(...EXPERT_INSIGHT_TEMPLATES.NEGATIVE_FORM);

  if (stable?.preferredDistance) {
    const diff = Math.abs(race.distance - stable.preferredDistance);
    if (diff <= 200) insights.push(...EXPERT_INSIGHT_TEMPLATES.DISTANCE_FIT);
  }

  const hasRunDistance = horse.raceHistory.some((h) => h.distance === race.distance);
  if (!hasRunDistance && race.distance >= 1600) {
    insights.push(...EXPERT_INSIGHT_TEMPLATES.NEW_DISTANCE);
  }

  if (insights.length === 0) return null;

  let text = insights[Math.floor(rng.next() * insights.length)];
  text = text.replace("{horse}", runner.name);
  text = text.replace("{distance}", race.distance.toString());

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
