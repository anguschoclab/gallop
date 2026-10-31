import type { WritableDraft } from "immer";
import type { GameState } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type { LookupMaps, ImpactHandlerFunction, ImpactHandler } from "@/platform/resolver/handlers/types";

export abstract class BaseHandler implements ImpactHandler {
  protected abstract get handlers(): Record<string, ImpactHandlerFunction | ((...args: any[]) => void)>;

  canHandle(type: string): boolean {
    return Object.hasOwn(this.handlers, type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = this.handlers[impact.type] as ImpactHandlerFunction | undefined;
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
