import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

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
    const impactAny = impact as any;

    switch (impact.type) {
      case "cash_change": {
        const { entityId, amount } = impactAny;
        if (entityId && entityId !== "player") {
          const stable = lookupMaps?.stableMap.get(entityId) || draft.npcStables.find((s) => s.id === entityId);
          if (stable) {
            stable.cash = Math.max(0, stable.cash + amount);
          }
        } else {
          draft.cash = Math.max(0, draft.cash + amount);
        }
        break;
      }

      case "horse_transfer": {
        const { horseId, toStableId } = impactAny;
        const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stableId = toStableId;
          horse.owned = !toStableId;
        }
        break;
      }
    }
  }

}
