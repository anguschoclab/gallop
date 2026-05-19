/**
 * handlers/FinanceHandler.ts - Finance impact handler
 *
 * This file handles finance-related impacts including cash changes and horse transfers.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/financialImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  cash_change: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { entityId, amount } = impactAny;
    if (entityId && entityId !== "player") {
      const stable =
        lookupMaps?.stableMap.get(entityId) || draft.npcStables.find((s) => s.id === entityId);
      if (stable) {
        stable.cash = Math.max(0, stable.cash + amount);
      }
    } else {
      draft.cash = Math.max(0, draft.cash + amount);
    }
  },

  horse_transfer: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, toStableId } = impactAny;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.stableId = toStableId;
      horse.owned = !toStableId;
    }
  },
};

export class FinanceHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return ["cash_change", "horse_transfer"].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
