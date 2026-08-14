import { useLiveFreshness } from "@/hooks/shared/useLiveFreshness";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface LiveFreshnessBadgeProps {
  /** Wall-clock ms when the widget was last updated. */
  lastUpdatedAt?: number;
  /** Optional context label included in the accessible name (e.g. "Commentary"). */
  context?: string;
  className?: string;
}

export function LiveFreshnessBadge({
  lastUpdatedAt,
  context,
  className,
}: LiveFreshnessBadgeProps) {
  const { timeAgo, isStale, staleSeconds } = useLiveFreshness(
    lastUpdatedAt ?? Date.now(),
  );

  const tooltip = isStale
    ? `No update received for ${staleSeconds}s. The broadcast may be paused or lagging.`
    : `Last updated ${timeAgo}.`;

  const ariaLabel = `${context ? `${context} ` : ""}last updated ${timeAgo}`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-full border",
              isStale
                ? "bg-warning/15 border-warning/40 text-warning"
                : "bg-black/40 border-white/5",
              className,
            )}
            aria-label={ariaLabel}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isStale
                  ? "bg-warning"
                  : "bg-destructive animate-pulse",
              )}
            />
            <span className="text-[8px] font-bold uppercase tracking-tighter">
              {isStale ? "Stale data" : "Live"}
            </span>
            <span
              className={cn(
                "text-[8px] tabular-nums",
                isStale ? "opacity-90" : "text-muted-foreground lowercase",
              )}
            >
              {timeAgo}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-[11px]">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
