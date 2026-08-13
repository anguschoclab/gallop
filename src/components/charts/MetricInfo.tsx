/**
 * MetricInfo.tsx - Small "?" affordance that explains exactly what a metric means.
 * Used by every ChartCard so each bar/line has a written definition.
 */
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface MetricInfoProps {
  /** One-sentence definition: what is measured, and over what denominator. */
  definition: string;
  /** Optional second line: how it is computed. */
  formula?: string;
  className?: string;
}

export function MetricInfo({ definition, formula, className }: MetricInfoProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Metric definition"
            onClick={(e) => e.preventDefault()}
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded-full text-cream/35",
              "transition-colors hover:text-[var(--chart-1)] focus-visible:outline-none",
              "focus-visible:ring-1 focus-visible:ring-[var(--chart-1)]",
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] space-y-1 text-left">
          <p className="text-[11px] leading-snug">{definition}</p>
          {formula ? (
            <p className="font-mono text-[10px] leading-snug text-muted-foreground">{formula}</p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
