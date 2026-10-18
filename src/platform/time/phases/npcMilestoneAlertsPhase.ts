/**
 * phases/npcMilestoneAlertsPhase.ts - Rival-horse milestone alert phase
 *
 * Watches NPC horses for career milestones (debut, breakthrough graded win,
 * major earnings thresholds, peak-career transitions, retirement) and emits
 * inbox messages so the player hears about rivals worth tracking. Records the
 * announced milestone keys on the horse so each one fires only once.
 *
 * Dependencies: ../pipeline, @/domains/agents/simulation/npc/careerMilestones, @/core/horse/ownership
 * Related files: src/domains/agents/simulation/npc/careerMilestones.ts, phases/index.ts (registers phase)
 */

import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";
import type { Horse } from "@/platform/game/types";
import type { AnyImpact, InboxImpact } from "@/platform/resolver/impacts";
import type { InboxCategory, InboxPriority } from "@/domains/inbox/model/inboxTypes";
import type { RivalMilestoneKind } from "@/domains/agents/simulation/npc/careerMilestones";
import { isNpcOwned, isPlayerOwned, getStableId } from "@/domains/horse/simulation/ownership";
import { PHASE_ORDER_NPC_MILESTONE_ALERTS } from "@/platform/time/pipelineConstants";
import { generateUUID } from "@/shared/uuid/uuid";
import {
  detectPlayerMilestones,
  detectRivalMilestones,
  isNotableRival,
} from "@/domains/agents/simulation/npc/careerMilestones";

/** Maximum rival milestone alerts emitted on a single day, to avoid inbox spam. */
export const MAX_RIVAL_ALERTS_PER_DAY = 6;

/**
 * Maximum player milestone alerts emitted on a single day. Player milestones
 * are also processed as a backlog — unlike rivals, capped-off keys are left
 * unannounced so the remaining alerts land on subsequent days.
 */
export const MAX_PLAYER_ALERTS_PER_DAY = 8;

const PLAYER_KIND_CATEGORY: Record<RivalMilestoneKind, InboxCategory> = {
  debut: "race",
  breakthrough_win: "race",
  earnings: "race",
  peak_transition: "race",
  retirement: "retirement",
};

const PLAYER_KIND_PRIORITY: Record<RivalMilestoneKind, InboxPriority> = {
  debut: "info",
  breakthrough_win: "action",
  earnings: "info",
  peak_transition: "info",
  retirement: "info",
};

export const npcMilestoneAlertsPhase: PipelinePhase = {
  name: "npcMilestoneAlerts",
  order: PHASE_ORDER_NPC_MILESTONE_ALERTS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];
    // Per-kind mute switches from Settings → Notifications; muted milestones
    // are still recorded as announced so unmuting doesn't flood old alerts.
    const mutedKinds = state.userSettings?.notifications?.rivalMilestoneAlerts;
    const playerMutedKinds = state.userSettings?.notifications?.playerMilestoneAlerts;
    const horses: Record<string, Horse> = {};
    let changed = false;
    let emitted = 0;
    let playerEmitted = 0;

    for (const [id, horse] of Object.entries(state.horses)) {
      horses[id] = horse;

      if (isPlayerOwned(horse)) {
        const announced = horse.careerMilestonesAnnounced ?? [];
        const found = detectPlayerMilestones(horse, announced);
        if (found.length === 0) continue;

        const keys = [...announced];
        for (const milestone of found) {
          if (playerMutedKinds?.[milestone.kind] === false) {
            // Muted milestones are still recorded so unmuting doesn't replay them.
            keys.push(milestone.key);
            continue;
          }
          if (playerEmitted >= MAX_PLAYER_ALERTS_PER_DAY) continue; // stays pending for tomorrow
          keys.push(milestone.key);
          playerEmitted++;
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "npcMilestoneAlerts",
            logLevel: "always",
            type: "inbox_message",
            message: {
              day: newDay,
              category: PLAYER_KIND_CATEGORY[milestone.kind],
              priority: PLAYER_KIND_PRIORITY[milestone.kind],
              title: milestone.title,
              body: milestone.body,
              cta: {
                label: "View horse",
                route: "/stable/$horseId",
                params: { horseId: horse.id },
              },
            },
          } as InboxImpact);
        }

        if (keys.length !== announced.length) {
          horses[id] = { ...horse, careerMilestonesAnnounced: keys };
          changed = true;
        }
        continue;
      }

      if (!isNpcOwned(horse)) continue;
      if (!isNotableRival(horse)) continue;

      const announced = horse.careerMilestonesAnnounced ?? [];
      const found = detectRivalMilestones(horse, announced);
      if (found.length === 0) continue;

      const keys = [...announced];
      for (const milestone of found) {
        keys.push(milestone.key);
        if (mutedKinds?.[milestone.kind] === false) continue;
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
