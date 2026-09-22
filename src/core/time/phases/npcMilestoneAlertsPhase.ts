/**
 * phases/npcMilestoneAlertsPhase.ts - Rival-horse milestone alert phase
 *
 * Watches NPC horses for career milestones (debut, breakthrough graded win,
 * major earnings thresholds, peak-career transitions, retirement) and emits
 * inbox messages so the player hears about rivals worth tracking. Records the
 * announced milestone keys on the horse so each one fires only once.
 *
 * Dependencies: ../pipeline, @/core/npc/careerMilestones, @/core/horse/ownership
 * Related files: src/core/npc/careerMilestones.ts, phases/index.ts (registers phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { Horse } from "@/game/types";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";
import { isNpcOwned, getStableId } from "@/core/horse/ownership";
import { PHASE_ORDER_NPC_MILESTONE_ALERTS } from "@/constants";
import { generateUUID } from "@/core/uuid";
import { detectRivalMilestones, isNotableRival } from "@/core/npc/careerMilestones";

/** Maximum rival milestone alerts emitted on a single day, to avoid inbox spam. */
export const MAX_RIVAL_ALERTS_PER_DAY = 6;

export const npcMilestoneAlertsPhase: PipelinePhase = {
  name: "npcMilestoneAlerts",
  order: PHASE_ORDER_NPC_MILESTONE_ALERTS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const horses: Record<string, Horse> = {};
    let changed = false;
    let emitted = 0;

    for (const [id, horse] of Object.entries(state.horses)) {
      horses[id] = horse;
      if (!isNpcOwned(horse)) continue;
      if (!isNotableRival(horse)) continue;

      const announced = horse.careerMilestonesAnnounced ?? [];
      const found = detectRivalMilestones(horse, announced);
      if (found.length === 0) continue;

      const keys = [...announced];
      for (const milestone of found) {
        keys.push(milestone.key);
        if (emitted >= MAX_RIVAL_ALERTS_PER_DAY) continue;
        emitted++;
        const stableId = getStableId(horse);
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "npcMilestoneAlerts",
          logLevel: "always",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "ai_activity",
            priority: milestone.kind === "breakthrough_win" ? "low" : "info",
            title: milestone.title,
            body: milestone.body,
            ...(stableId
              ? {
                  cta: {
                    label: "View Rival Stable",
                    route: "/npc-stables/$stableId",
                    params: { stableId: String(stableId) },
                  },
                }
              : {}),
          },
        } as InboxImpact);
      }

      horses[id] = { ...horse, careerMilestonesAnnounced: keys };
      changed = true;
    }

    if (!changed) return context;

    return {
      ...context,
      state: { ...state, horses },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
