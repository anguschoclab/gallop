import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/game/types";
import type { NarrativeEvent, CommentaryLine } from "./types";
import type { NarrativeState } from "./narrativeState";
import { buildFieldContext, deriveRunnerConditions } from "@/core/race/runnerConditions";
import type { RunnerHistory } from "@/core/race/runnerConditions";
import {
  CONDITION_TO_EVENT,
  CONDITION_COOLDOWN,
  TONE_PRIORITY,
  HIGH_IMPACT_CONDITIONS,
} from "@/constants/narrativeConditionConstants";

export interface ConditionCheckContext {
  state: NarrativeState;
  race: Race;
  createLine: (type: NarrativeEvent, timestamp: number, runner?: Runner) => CommentaryLine;
}

export function checkConditionTransitions(
  runners: Runner[],
  simTime: number,
  ctx: ConditionCheckContext,
): CommentaryLine[] {
  const { state, race, createLine } = ctx;
  const newLines: CommentaryLine[] = [];

  if (!state.hasAnnouncedStart || state.hasAnnouncedFinish) return newLines;

  const field = buildFieldContext(runners);

  for (const r of runners) {
    if (r.finishTime !== null) continue;

    state.updatePeakVelocity(r.horseId, r.velocity);

    const history: RunnerHistory = {
      peakVelocity: state.peakVelocities.get(r.horseId) ?? 0,
    };

    const conditions = deriveRunnerConditions(r, field, history, race.distance);
    const currentIds = new Set(conditions.map((c) => c.id));
    const previousIds = state.getActiveConditions(r.horseId);

    const newIds = [...currentIds].filter((id) => !previousIds.has(id));

    if (newIds.length === 0) {
      state.setActiveConditions(r.horseId, currentIds);
      continue;
    }

    const ailingNew = newIds.find((id) => id === "ailing");
    if (ailingNew) {
      const eventType = CONDITION_TO_EVENT["ailing"];
      const cooldown = CONDITION_COOLDOWN["ailing"];
      if (state.canAnnounce(eventType, r.horseId, simTime, cooldown)) {
        const line = createLine(eventType, simTime, r);
        newLines.push(line);
        state.setCooldown(eventType, r.horseId, simTime, cooldown);
      }
    }

    const nonAilingNew = newIds.filter((id) => id !== "ailing");
    if (nonAilingNew.length > 0) {
      const sorted = nonAilingNew.sort((a, b) => {
        const aCond = conditions.find((c) => c.id === a)!;
        const bCond = conditions.find((c) => c.id === b)!;
        if (aCond.emphatic !== bCond.emphatic) return aCond.emphatic ? -1 : 1;
        return TONE_PRIORITY[aCond.tone] - TONE_PRIORITY[bCond.tone];
      });

      const winner = sorted[0];
      const eventType = CONDITION_TO_EVENT[winner];
      const cooldown = CONDITION_COOLDOWN[winner];
      if (state.canAnnounce(eventType, r.horseId, simTime, cooldown)) {
        const line = createLine(eventType, simTime, r);
        if (HIGH_IMPACT_CONDITIONS.has(winner)) {
          line.isHighImpact = true;
        }
        newLines.push(line);
        state.setCooldown(eventType, r.horseId, simTime, cooldown);
      }
    }

    state.setActiveConditions(r.horseId, currentIds);
  }

  return newLines;
}
