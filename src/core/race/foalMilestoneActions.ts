/**
 * foalMilestoneActions.ts - Pure helpers for resolving foal development milestones.
 *
 * Extracted from racingSlice.resolveFoalMilestone so the slice becomes a thin
 * coordinator. The pure logic (stat application, milestone status update) lives
 * here; the slice handles state mutation via set().
 *
 * Per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse, FoalDevelopmentArc, MilestoneChoice)
 * Related files: src/game/store/slices/racingSlice.ts (coordinator)
 */

import type { Horse } from "@/game/types";
import type { FoalDevelopmentArc, MilestoneChoice } from "@/core/horse/foalDevelopment";

/** Result of resolving a milestone — the patch to apply to the horse. */
export interface MilestoneResolution {
  horseId: string;
  nextStats: Horse["stats"];
  nextArc: FoalDevelopmentArc;
  logText: string;
}

/**
 * Validate that a milestone can be resolved. Returns an error reason or null.
 * @param horse
 * @param milestoneKey
 * @param choiceKey
 */
export function validateMilestoneResolution(
  horse: Horse | undefined,
  milestoneKey: string,
  choiceKey: string,
): string | null {
  if (!horse) return "Horse not found.";
  if (!isPlayerOwnedCheck(horse)) return "You do not own this horse.";
  if (!horse.developmentArc) return "This horse has no development arc.";
  const milestone = horse.developmentArc.milestones.find((m) => m.key === milestoneKey);
  if (!milestone) return "Milestone not found.";
  if (milestone.status !== "pending") return "Milestone already resolved.";
  const choice = milestone.choices.find((c) => c.key === choiceKey);
  if (!choice) return "Choice not found.";
  return null;
}

function isPlayerOwnedCheck(horse: Horse): boolean {
  return horse.ownership?.type === "player";
}

/**
 * Apply a milestone choice to a horse, returning the updated stats and arc.
 * @param horse
 * @param milestoneKey
 * @param choice
 * @param currentDay
 */
export function applyMilestoneChoice(
  horse: Horse,
  milestoneKey: string,
  choice: MilestoneChoice,
  currentDay: number,
): { nextStats: Horse["stats"]; nextArc: FoalDevelopmentArc } {
  const nextStats = { ...horse.stats };
  for (const [stat, delta] of Object.entries(choice.delta) as [keyof typeof nextStats, number][]) {
    if (typeof delta !== "number") continue;
    const current = nextStats[stat] ?? 0;
    nextStats[stat] = Math.round(Math.max(0, Math.min(100, current + delta)));
  }

  const nextArc: FoalDevelopmentArc = {
    milestones: horse.developmentArc!.milestones.map((m) =>
      m.key === milestoneKey
        ? {
            ...m,
            status: "resolved" as const,
            resolvedChoiceKey: choice.key,
            resolvedOnDay: currentDay,
          }
        : m,
    ),
  };

  return { nextStats, nextArc };
}

/**
 * Build the log entry text for a resolved milestone.
 * @param horseName
 * @param milestoneLabel
 * @param choiceLabel
 */
export function buildMilestoneLogText(
  horseName: string,
  milestoneLabel: string,
  choiceLabel: string,
): string {
  return `${horseName}: ${milestoneLabel} — chose "${choiceLabel}".`;
}
