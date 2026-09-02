import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { buildRaceTimeViews, formatClockTime } from "@/core/common/formatting";
import { cn } from "@/lib/cn";

interface RaceTimeDisplayProps {
  /** Final time in seconds. */
  seconds: number | null | undefined;
  /** Race distance in metres — required for per-km / per-mile views. */
  distance?: number;
  /** Which view to show inline (defaults to the final time). */
  primary?: "final" | "perKm" | "perKmDrop" | "perMile" | "perMileDrop";
  /** Drop the leading minute on the inline final time. */
  dropMinute?: boolean;
  className?: string;
}

/**
 * Renders a race time with a hover/focus breakdown of all five presentations:
 * final, per km, per km (drop minute), per mile, per mile (drop minute).
 */
export function RaceTimeDisplay({
  seconds,
  distance,
  primary = "final",
  dropMinute = false,
  className,
}: RaceTimeDisplayProps) {
  if (seconds == null || !Number.isFinite(seconds)) {
    return <span className={cn("tabular-nums", className)}>—</span>;
  }

  if (!distance) {
    return (
      <span className={cn("tabular-nums", className)}>
        {formatClockTime(seconds, 2, dropMinute)}
      </span>
    );
  }

  const views = buildRaceTimeViews(seconds, distance);
  const shown = views.find((v) => v.key === primary) ?? views[0];
  const inline =
    primary === "final" && dropMinute ? formatClockTime(seconds, 2, true) : shown.value;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={views.map((v) => `${v.label}: ${v.value}`).join(", ")}
            className={cn(
              "tabular-nums underline decoration-dotted decoration-muted-foreground/40 cursor-help",
              className,
            )}
          >
            {inline}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-56">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest opacity-60">{distance}m</div>
            {views.map((v) => (
              <div key={v.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="opacity-70">{v.label}</span>
                <span className="font-mono tabular-nums">{v.value}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
