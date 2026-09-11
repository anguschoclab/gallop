/**
 * lib/formatting.ts — Layer-agnostic string formatting utilities.
 *
 * Re-exports pure formatting helpers from @/core/common/formatting so that
 * UI components and routes can import from @/lib instead of @/core, keeping
 * the adapter→core layering boundary intact.
 *
 * Per PR 9 of the megaplan: pure helpers with no domain coupling move to
 * src/lib/ (layer-agnostic utilities).
 */

export {
  formatCurrency,
  formatTime,
  formatClockTime,
  pacePerKm,
  pacePerMile,
  buildRaceTimeViews,
} from "@/core/common/formatting";

export type { RaceTimeView } from "@/core/common/formatting";
