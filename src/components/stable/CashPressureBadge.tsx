import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { evaluateCashPressure, type CashPressure } from "@/core/stable/cashPressure";
import type { Stable } from "@/game/types";

const LABEL_STYLES: Record<CashPressure["label"], string> = {
  comfortable: "text-cream-muted border-border/60",
  tight: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  strained: "text-orange-300 border-orange-400/40 bg-orange-400/10",
  desperate: "text-red-300 border-red-400/40 bg-red-400/10",
};

const LABEL_COPY: Record<CashPressure["label"], string> = {
  comfortable: "Cash comfortable",
  tight: "Cash tight",
  strained: "Short of cash",
  desperate: "Desperate for cash",
};

/**
 * Player-facing indicator of an NPC stable's cash pressure, explaining why
 * they may accept lowball private sale offers.
 */
export function CashPressureBadge({ stable, className }: { stable: Stable; className?: string }) {
  const pressure = evaluateCashPressure(stable);
  const runwayDays = Math.round(pressure.runwayDays);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn("inline-flex", className)}>
            <Badge
              variant="outline"
              className={cn("gap-1 cursor-help", LABEL_STYLES[pressure.label])}
            >
              <Wallet className="h-3 w-3" aria-hidden />
              {LABEL_COPY[pressure.label]}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-1">
          <p className="font-medium">Cash pressure: {pressure.label}</p>
          <p className="text-xs text-cream-muted">
            Their cash covers roughly {runwayDays} day{runwayDays === 1 ? "" : "s"} of stable
            upkeep.
          </p>
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
