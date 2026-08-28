import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/core/common/formatting";
import { type CashPressure } from "@/core/stable/cashPressure";
import { evaluatePrivateSaleThresholds } from "@/core/stable/privateSaleThresholds";
import type { Stable } from "@/game/types";

const LABEL_STYLES: Record<CashPressure["label"], string> = {
  comfortable: "text-cream-muted border-border/60",
  tight: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  strained: "text-orange-300 border-orange-400/40 bg-orange-400/10",
  desperate: "text-red-300 border-red-400/40 bg-red-400/10",
};

const METER_STYLES: Record<CashPressure["label"], string> = {
  comfortable: "bg-cream-muted",
  tight: "bg-amber-400",
  strained: "bg-orange-400",
  desperate: "bg-red-400",
};

const LABEL_COPY: Record<CashPressure["label"], string> = {
  comfortable: "Cash comfortable",
  tight: "Cash tight",
  strained: "Short of cash",
  desperate: "Desperate for cash",
};

interface CashPressureBadgeProps {
  stable: Stable;
  className?: string;
  /** Attachment-adjusted ask for the horse, enabling threshold detail. */
  ask?: number;
  /** Offer amount under consideration, enabling shortfall detail. */
  offerAmount?: number;
}

/**
 * Player-facing indicator of an NPC stable's cash pressure, explaining why
 * they may accept lowball private sale offers. Shows a 0-100 pressure meter
 * and, when an ask/offer is supplied, the exact accept threshold and how far
 * below it the offer sits.
 */
export function CashPressureBadge({
  stable,
  className,
  ask,
  offerAmount,
}: CashPressureBadgeProps) {
  const thresholds = evaluatePrivateSaleThresholds(stable, { ask, offerAmount });
  const pressure = thresholds.cashPressure;
  const runwayDays = Math.round(pressure.runwayDays);
  const acceptPct = Math.round(thresholds.acceptThreshold * 100);
  const basePct = Math.round(thresholds.baseAcceptThreshold * 100);

  const summary =
    `${LABEL_COPY[pressure.label]}. Cash pressure ${pressure.meter} of 100. ` +
    `About ${runwayDays} day${runwayDays === 1 ? "" : "s"} of upkeep covered. ` +
    `Accepts at ${acceptPct}% of their ask` +
    (thresholds.shortfallAmount !== undefined && thresholds.shortfallAmount > 0
      ? `; current offer is ${formatCurrency(thresholds.shortfallAmount)} below that.`
      : ".");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="button"
            aria-label={summary}
            className={cn(
              "inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          >
            <Badge
              variant="outline"
              className={cn("gap-1 cursor-help", LABEL_STYLES[pressure.label])}
            >
              <Wallet className="h-3 w-3" aria-hidden />
              {LABEL_COPY[pressure.label]}
            </Badge>
            <span className="inline-flex items-center gap-1.5" aria-hidden>
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-border/60">
                <span
                  className={cn("block h-full rounded-full", METER_STYLES[pressure.label])}
                  style={{ width: `${pressure.meter}%` }}
                />
              </span>
              <span className="text-xs tabular-nums text-cream-muted">{pressure.meter}</span>
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs space-y-1"
          tabIndex={0}
          role="tooltip"
          aria-label={summary}
        >
          <p className="font-medium">
            Cash pressure: {pressure.label} ({pressure.meter}/100)
          </p>
          <ul className="space-y-0.5 text-xs text-cream-muted">
            <li>
              Upkeep runway:{" "}
              <span className="tabular-nums text-cream">
                {runwayDays} day{runwayDays === 1 ? "" : "s"}
              </span>{" "}
              ({formatCurrency(Math.round(pressure.dailyUpkeep))}/day)
            </li>
            <li>
              Accept threshold:{" "}
              <span className="tabular-nums text-cream">{acceptPct}%</span> of their ask
              {acceptPct !== basePct && <> (down from {basePct}% under cash pressure)</>}
            </li>
            {thresholds.acceptAmount !== undefined && (
              <li>
                Accepts around{" "}
                <span className="tabular-nums text-cream">
                  {formatCurrency(thresholds.acceptAmount)}
                </span>
                ; counters above{" "}
                <span className="tabular-nums text-cream">
                  {formatCurrency(thresholds.counterAmount ?? 0)}
                </span>
              </li>
            )}
            {thresholds.offerRatio !== undefined && (
              <li>
                Your offer:{" "}
                <span className="tabular-nums text-cream">
                  {Math.round(thresholds.offerRatio * 100)}%
                </span>{" "}
                of ask —{" "}
                {thresholds.shortfallAmount && thresholds.shortfallAmount > 0 ? (
                  <span className="text-cream">
                    {formatCurrency(thresholds.shortfallAmount)} (
                    {(thresholds.shortfallPercent ?? 0).toFixed(1)} pts) below threshold
                  </span>
                ) : (
                  <span className="text-cream">at or above their threshold</span>
                )}
              </li>
            )}
            {thresholds.likelyCounterTerms !== undefined && (
              <li>
                Likely counter:{" "}
                <span className="tabular-nums text-cream">
                  {formatCurrency(thresholds.likelyCounterTerms)}
                </span>
              </li>
            )}
          </ul>
          {pressure.label !== "comfortable" && (
            <p className="text-xs text-cream-muted">
              Short of cash — more likely to accept lower offers or counter softly.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
