/**
 * handlers/BaseHandler.ts - Base impact handler
 *
 * This file provides a base class for all impact handlers to deduplicate logic.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type {
  ImpactHandler,
  LookupMaps,
  ImpactHandlerFunction,
} from "@/platform/resolver/handlers/types";

export abstract class BaseHandler<
  T extends (...args: any[]) => any = ImpactHandlerFunction,
> implements ImpactHandler {
  protected abstract get handlers(): Record<string, T>;

  canHandle(type: string): boolean {
    return Object.hasOwn(this.handlers, type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = this.handlers[impact.type] as ImpactHandlerFunction;
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
