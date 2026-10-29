/**
 * handlers/BaseHandler.ts - Base impact handler
 *
 * This file provides a base abstract class for impact handlers to reduce boilerplate
 * and enforce a consistent structure for mapping impact types to their respective functions.
 *
 * Dependencies: immer (WritableDraft), @/platform/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler, LookupMaps, ImpactHandlerFunction)
 * Related files: ./types.ts, ./SystemHandler.ts, etc.
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type { ImpactHandler, LookupMaps } from "@/platform/resolver/handlers/types";

export abstract class BaseHandler implements ImpactHandler {
  protected abstract get handlers(): Record<string, any>;

  canHandle(type: string): boolean {
    return Object.hasOwn(this.handlers, type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = this.handlers[impact.type];
    if (handler) {
      this.executeHandler(handler, draft, impact, lookupMaps);
    }
  }

  protected executeHandler(
    handler: any,
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: LookupMaps,
  ): void {
    handler(draft, impact, lookupMaps);
  }
}
