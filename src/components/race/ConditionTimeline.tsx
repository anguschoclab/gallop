/**
 * ConditionTimeline — compact per-race strip showing when each runner
 * condition (Flying, Battling, Boxed In, ...) switched on and off for the
 * selected horse, plotted against distance covered.
 */
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { ConditionTone } from "@/core/race/runnerConditions";
import type { ConditionSegment } from "@/hooks/race/useConditionTimeline";

/** Number of distance markers (including start and end) shown on the timeline axis. */
const DISTANCE_MARKER_COUNT = 4;

/** Minimum visual width (percentage) for a condition bar segment. */
const MIN_SEGMENT_WIDTH_PCT = 1.5;

const TONE_BAR: Record<ConditionTone, string> = {
  positive: "bg-success/80",
  caution: "bg-warning/80",
  negative: "bg-destructive/80",
  neutral: "bg-muted-foreground/50",
};

interface ConditionTimelineProps {
  segments: ConditionSegment[];
  distance: number;
  horseName?: string;
  className?: string;
}

function ConditionTimeline({ segments, distance, horseName, className }: ConditionTimelineProps) {
  const lanes = new Map<string, ConditionSegment[]>();
  for (const seg of segments) {
    const list = lanes.get(seg.id);
    if (list) list.push(seg);
    else lanes.set(seg.id, [seg]);
  }

  const markerCount = DISTANCE_MARKER_COUNT;

  return (
    <div
      className={cn("rounded-lg border border-white/10 bg-black/30 px-3 py-2 space-y-2", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
          Condition timeline{horseName ? ` · ${horseName}` : ""}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground font-mono">
          0–{distance}m
        </span>
      </div>

      {lanes.size === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No conditions recorded yet — they appear as the race unfolds.
        </p>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="space-y-1">
            {[...lanes.entries()].map(([id, segs]) => (
              <div key={id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {segs[0].label}
                </span>
                <div className="relative h-3 flex-1 rounded bg-white/5 overflow-hidden">
                  {Array.from({ length: markerCount - 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/10"
                      style={{ left: `${((i + 1) / markerCount) * 100}%` }}
                    />
                  ))}
                  {segs.map((seg, i) => {
                    const left = (seg.startPos / distance) * 100;
                    const width = Math.max(
                      MIN_SEGMENT_WIDTH_PCT,
                      ((seg.endPos - seg.startPos) / distance) * 100,
                    );
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute top-0 bottom-0 rounded-sm",
                              TONE_BAR[seg.tone],
                              seg.active && "animate-pulse",
                            )}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-56">
                          <p className="text-xs font-bold uppercase tracking-wide">{seg.label}</p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {Math.round(seg.startPos)}m → {Math.round(seg.endPos)}m ·{" "}
                            {seg.startTime.toFixed(1)}s–{seg.endTime.toFixed(1)}s
                            {seg.active ? " (ongoing)" : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{seg.detail}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      )}

      <div className="flex justify-between text-[9px] tabular-nums text-muted-foreground font-mono">
        {Array.from({ length: markerCount + 1 }, (_, i) => (
          <span key={i}>{Math.round((distance * i) / markerCount)}m</span>
        ))}
      </div>
    </div>
  );
}

export const MemoizedConditionTimeline = memo(ConditionTimeline);
export { ConditionTimeline };
