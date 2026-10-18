import type { GameState } from "@/platform/game/types";
import type { AnyIntent } from "@/platform/resolver/intents";
import { INTENT_TYPE_SET } from "@/platform/resolver/intentTypeRegistry";
import type { IntentValidator } from "@/platform/resolver/validators/types";

export class StructuralIntentValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return INTENT_TYPE_SET.has(type);
  }

  validate(intent: AnyIntent, _state: GameState): { valid: boolean; reason?: string } {
    if (!INTENT_TYPE_SET.has(intent.type)) return { valid: false, reason: "Unknown intent type" };
    if (!intent.id) return { valid: false, reason: "Intent id missing" };
    if (!intent.entityId) return { valid: false, reason: "Intent entity missing" };
    if (!["player", "npc", "system"].includes(intent.source)) {
      return { valid: false, reason: "Unknown intent source" };
    }
    if (!Number.isFinite(intent.day) || intent.day < 1) {
      return { valid: false, reason: "Invalid intent day" };
    }
    if (!Number.isFinite(intent.priority)) {
      return { valid: false, reason: "Invalid intent priority" };
    }
    return { valid: true };
  }
}
