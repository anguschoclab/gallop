/**
 * helpers/reputation.ts - Re-export from @/core/reputation/reputationEvents
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing importers working during the transition.
 *
 * @deprecated Import from @/core/reputation/reputationEvents instead.
 */

export {
  applyReputationEvents,
  emptyReputation,
  MAX_REPUTATION_EVENTS,
} from "@/core/reputation/reputationEvents";
