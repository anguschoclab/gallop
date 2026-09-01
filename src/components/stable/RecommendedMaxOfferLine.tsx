/**
 * RecommendedMaxOfferLine.tsx - Compact max-offer display for NPC stable cards
 *
 * Shows the softened accept threshold as a % of ask, the softening gap from the
 * personality base, and (when an ask/offer is known) dollar max offer, shortfall,
 * and a projected outcome chip.
 *
 * Dependencies: @/core/stable/recommendedMaxOffer (recommendedMaxOffer), @/core/common/formatting (formatCurrency)
 * Related files: ./StableCard.tsx (consumer)
 */

import { recommendedMaxOffer } from "@/core/stable/recommendedMaxOffer";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import type { Stable } from "@/game/types";

interface RecommendedMaxOfferLineProps {
  stable: Stable;
  /** Attachment-adjusted ask for a specific horse. */
  ask?: number;
  /** Player's current offer amount. */
  offerAmount?: number;
  className?: string;
}

const OUTCOME_STYLES: Record<string, string> = {
  accepted: "text-success border-success/40 bg-success/10",
  countered: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  declined: "text-red-300 border-red-400/40 bg-red-400/10",
};

const OUTCOME_LABELS: Record<string, string> = {
  accepted: "will accept",
  countered: "will counter",
  declined: "will decline",
};

/**
 * Compact one-line readout of the recommended max offer for an NPC stable.
 */
export function RecommendedMaxOfferLine({
  stable,
  ask,
  offerAmount,
  className,
}: RecommendedMaxOfferLineProps) {
  const result = recommendedMaxOffer(stable, { ask, offerAmount });
  const acceptPct = Math.round(result.acceptThreshold * 100);
  const basePct = Math.round(result.baseAcceptThreshold * 100);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs text-cream-muted", className)}>
      <span>
        Max offer <span className="tabular-nums text-cream">~{acceptPct}%</span> of ask
      </span>
      {result.softeningPoints > 0.5 && (
        <span className="text-amber-300">
          ↓ {result.softeningPoints.toFixed(0)} pts (down from {basePct}%)
        </span>
      )}
      {result.maxOfferAmount !== undefined && (
        <span>
          · <span className="tabular-nums text-cream">{formatCurrency(result.maxOfferAmount)}</span>{" "}
          to seal it
        </span>
      )}
      {result.shortfallAmount !== undefined && result.shortfallAmount > 0 && (
        <span className="text-red-300">
          · your offer {formatCurrency(result.shortfallAmount)} (
          {(result.shortfallPercent ?? 0).toFixed(1)} pts) short
        </span>
      )}
      {result.projectedOutcome && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 border text-[10px] font-medium",
            OUTCOME_STYLES[result.projectedOutcome],
          )}
        >
          {OUTCOME_LABELS[result.projectedOutcome]}
          {result.projectedOutcome === "countered" && result.counterMultiplier && (
            <> ~×{result.counterMultiplier.toFixed(2)}</>
          )}
        </span>
      )}
    </div>
  );
}
