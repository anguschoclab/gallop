/**
 * phases/raceCancellation.ts - Race cancellation phase
 *
 * Cancels non-graded races with fewer than MINIMUM_RACE_ENTRIES entries
 * exactly 2 game days (48h) before race day. Emits refund, inbox, and
 * campaign slot impacts.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/constants (PHASE_ORDER_RACE_CANCELLATION, MINIMUM_RACE_ENTRIES), @/core/uuid (generateUUID), @/core/resolver/impacts/index (AnyImpact, CashImpact, InboxImpact, CampaignSlotImpact)
 * Related files: ../phases/index.ts (registers phase), raceResolution.ts (guarded by cancelled flag)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { PHASE_ORDER_RACE_CANCELLATION, MINIMUM_RACE_ENTRIES } from "@/constants";
import { generateUUID } from "@/core/uuid";
import type {
  AnyImpact,
  CashImpact,
  InboxImpact,
  CampaignSlotImpact,
} from "@/core/resolver/impacts/index";
import type { Race } from "@/core/race/types";

export const raceCancellationPhase: PipelinePhase = {
  name: "raceCancellation",
  order: PHASE_ORDER_RACE_CANCELLATION,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const updatedRaces: Record<string, Race> = {};

    for (const race of Object.values(state.races)) {
      if (race.resolved || race.cancelled) {
        updatedRaces[race.id] = race;
        continue;
      }

      if (race.graded) {
        updatedRaces[race.id] = race;
        continue;
      }

      if (race.day !== newDay + 2) {
        updatedRaces[race.id] = race;
        continue;
      }

      if (race.entries.length >= MINIMUM_RACE_ENTRIES) {
        updatedRaces[race.id] = race;
        continue;
      }

      // Cancel the race
      updatedRaces[race.id] = {
        ...race,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      };

      // Refund entry fees for all entries
      for (const entry of race.entries) {
        const entityId = entry.ownership?.type === "npc" ? entry.ownership.stableId : "";
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceCancellation",
          logLevel: "conditional",
          type: "cash_change",
          entityId,
          amount: race.entryFee,
          reason: `Entry fee refund: ${race.name} cancelled (insufficient entries)`,
        } as CashImpact);
      }

      // Send inbox notification if any player-owned entry
      const hasPlayerEntry = race.entries.some((e) => e.ownership?.type === "player");
      if (hasPlayerEntry) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceCancellation",
          logLevel: "conditional",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "race",
            priority: "action",
            title: `Race Cancelled: ${race.name}`,
            body: `${race.name} on day ${race.day} has been cancelled due to insufficient entries. Your entry fee has been refunded.`,
            cta: {
              label: "View Race",
              route: "race.$raceId",
              params: { raceId: race.id },
            },
          },
        } as InboxImpact);
      }

      // Update campaign slots targeting this race
      const campaigns = state.campaigns ?? [];
      for (const campaign of campaigns) {
        for (let slotIdx = 0; slotIdx < campaign.slots.length; slotIdx++) {
          const slot = campaign.slots[slotIdx];
          if (slot.raceId === race.id && slot.status === "planned") {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
              phase: "raceCancellation",
              logLevel: "conditional",
              type: "campaign_slot",
              horseId: campaign.horseId,
              slotIndex: slotIdx,
              slot: { status: "cancelled" },
              reason: `Race ${race.name} cancelled (insufficient entries)`,
            } as CampaignSlotImpact);
          }
        }
      }
    }

    return {
      ...context,
      impacts: [...(context.impacts || []), ...impacts],
      state: {
        ...state,
        races: updatedRaces,
      },
    };
  },
};
