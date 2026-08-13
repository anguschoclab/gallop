/**
 * TimeWindowSelect.tsx - Shared "last N weeks" selector.
 * Every instance reads/writes the same global window (see useTimeWindow), so
 * changing it on one chart set re-scopes them all.
 */
import { TIME_WINDOW_OPTIONS } from "@/core/analytics/timeWindow";
import { useTimeWindow } from "@/hooks/analytics/useTimeWindow";
import { cn } from "@/lib/cn";

interface TimeWindowSelectProps {
  className?: string;
  /** Hide the "Window" caption (for tight chart headers). */
  compact?: boolean;
}

export function TimeWindowSelect({ className, compact }: TimeWindowSelectProps) {
  const { weeks, setWeeks } = useTimeWindow();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!compact ? (
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cream/40">
          Window
        </span>
      ) : null}
      <div
        role="group"
        aria-label="Analytics time window"
        className="flex items-center gap-0.5 rounded-md border border-white/5 bg-black/20 p-0.5"
      >
        {TIME_WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={weeks === opt.value}
            onClick={() => setWeeks(opt.value)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chart-1)]",
              weeks === opt.value
                ? "bg-[color-mix(in_oklab,var(--chart-1)_25%,transparent)] text-cream"
                : "text-cream/45 hover:text-cream/80",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
