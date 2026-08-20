/**
 * facilityManagementResolvers.ts - Facility and outpost management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "../pipeline";
import type {
  AnyIntent,
  FacilityUpgradeIntent,
  OutpostActionIntent,
  TransportIntent,
} from "@/core/resolver/intents";
import type {
  AnyImpact,
  CashImpact,
  FacilityUpgradeImpact,
  OutpostImpact,
  TransportImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

export function resolveFacilityIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { newDay, dailyRng } = context;

  switch (intent.type) {
    case "facility_upgrade": {
      const typedIntent = intent as FacilityUpgradeIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "facility_upgrade",
        facilityId: typedIntent.facilityId,
        nextLevel: typedIntent.nextLevel,
        cost: typedIntent.cost,
        reason: "Facility upgrade started",
      } as FacilityUpgradeImpact);

      if (typedIntent.cost && typedIntent.cost > 0) {
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: "player",
          amount: -typedIntent.cost,
          reason: `Upgrade ${typedIntent.facilityId}`,
        } as CashImpact);
      }
      return true;
    }

    case "outpost_action": {
      const typedIntent = intent as OutpostActionIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "outpost_action",
        stableId: typedIntent.stableId,
        action: typedIntent.action,
        outpostId: typedIntent.outpostId,
        metadata: {
          name: typedIntent.name,
          region: typedIntent.region,
          headTrainerId: typedIntent.headTrainerId,
        },
      } as OutpostImpact);

      if (typedIntent.cost && typedIntent.cost > 0) {
        const cashEntityId = typedIntent.source === "npc" ? typedIntent.stableId : "player";
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: cashEntityId,
          amount: -typedIntent.cost,
          reason: `Outpost ${typedIntent.action}`,
        } as CashImpact);
      }
      return true;
    }

    case "transport": {
      const typedIntent = intent as TransportIntent;
      const [fromOutpostId, toOutpostId] = typedIntent.transportId.split("->");
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "transport_horse",
        horseId: typedIntent.entityId,
        fromOutpostId,
        toOutpostId,
        fatigueSpike: 15,
        acclimatizationDays: 14,
        reason: `Transport from ${fromOutpostId} to ${toOutpostId}`,
      } as TransportImpact);

      if (typedIntent.cost && typedIntent.cost > 0) {
        const cashEntityId = intent.source === "npc" ? (intent.sourceId ?? "") : "player";
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: cashEntityId,
          amount: -typedIntent.cost,
          reason: "Horse transport",
        } as CashImpact);
      }
      return true;
    }

    default:
      return false;
  }
}
