import { useLiveFreshness } from "@/hooks/shared/useLiveFreshness";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface LiveFreshnessBadgeProps {
  /** Wall-clock ms when the widget was last updated. */
  lastUpdatedAt?: number;
  /** Optional context label included in the accessible name (e.g. "Commentary"). */
  context?: string;
  className?: string;
}

const LEVEL_STYLES = {
  fresh: {
    badge: "bg-success/15 border-success/40 text-success",
    dot: "bg-success",
    label: "Live",
  },
  warning: {
    badge: "bg-warning/15 border-warning/40 text-warning",
    dot: "bg-warning",
    label: "Slowing",
  },
  stale: {
    badge: "bg-destructive/15 border-destructive/40 text-destructive",
    dot: "bg-destructive",
    label: "Stale data",
  },
};

export function LiveFreshnessBadge({ lastUpdatedAt, context, className }: LiveFreshnessBadgeProps) {
  const { timeAgo, level, staleSeconds } = useLiveFreshness(lastUpdatedAt ?? Date.now());
  const styles = LEVEL_STYLES[level];

  const tooltip =
    level === "stale"
      ? `No update received for ${staleSeconds}s. The broadcast may be paused or lagging.`
      : level === "warning"
        ? `Last update ${timeAgo}. The broadcast is beginning to lag.`
        : `Last updated ${timeAgo}.`;

  const ariaLabel = `${context ? `${context} ` : ""}last updated ${timeAgo}`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-full border",
              styles.badge,
              className,
            )}
            aria-label={ariaLabel}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                styles.dot,
                level === "fresh" && "animate-pulse",
              )}
            />
            <span className="text-[8px] font-bold uppercase tracking-tighter">{styles.label}</span>
            <span
              className={cn(
                "text-[8px] tabular-nums",
                level === "stale" ? "opacity-90" : "text-muted-foreground/80 lowercase",
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
