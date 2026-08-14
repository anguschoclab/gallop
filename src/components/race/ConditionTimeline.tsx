/**
 * ConditionTimeline — compact per-race strip showing when each runner
 * condition (Flying, Battling, Boxed In, ...) switched on and off for the
 * selected horse, plotted against distance covered.
 */
import { memo, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { LiveFreshnessBadge } from "@/components/race/LiveFreshnessBadge";
import type { ConditionTone } from "@/core/race/runnerConditions";
import type { ConditionSegment } from "@/hooks/race/useConditionTimeline";
import { Filter, Check } from "lucide-react";

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

const TONE_BADGE_STYLE: Record<ConditionTone, { active: string; dot: string }> = {
  positive: {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30",
    dot: "bg-emerald-400",
  },
  caution: {
    active: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30",
    dot: "bg-amber-400",
  },
  negative: {
    active: "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30",
    dot: "bg-rose-400",
  },
  neutral: {
    active: "bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-slate-500/30",
    dot: "bg-slate-400",
  },
};

interface ConditionTimelineProps {
  segments: ConditionSegment[];
  distance: number;
  horseName?: string;
  className?: string;
  /** Wall-clock ms when the last simulation tick fed this strip. */
  lastUpdatedAt?: number;
  /** Optional initial set of hidden condition IDs. */
  initialHiddenConditions?: string[];
  /** Optional callback fired when filter changes. */
  onFilterChange?: (hiddenIds: string[]) => void;
}

function ConditionTimeline({
  segments,
  distance,
  horseName,
  className,
  lastUpdatedAt,
  initialHiddenConditions,
  onFilterChange,
}: ConditionTimelineProps) {
  const lanes = useMemo(() => {
    const map = new Map<string, ConditionSegment[]>();
    for (const seg of segments) {
      const list = map.get(seg.id);
      if (list) list.push(seg);
      else map.set(seg.id, [seg]);
    }
    return map;
  }, [segments]);

  const availableConditions = useMemo(() => {
    return [...lanes.entries()].map(([id, segs]) => ({
      id,
      label: segs[0].label,
      tone: segs[0].tone,
    }));
  }, [lanes]);

  const [hiddenConditionIds, setHiddenConditionIds] = useState<Set<string>>(
    () => new Set(initialHiddenConditions ?? []),
  );

  const toggleCondition = (id: string) => {
    setHiddenConditionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onFilterChange?.([...next]);
      return next;
    });
  };

  const showAll = () => {
    setHiddenConditionIds(new Set());
    onFilterChange?.([]);
  };

  const hideAll = () => {
    const allIds = availableConditions.map((c) => c.id);
    setHiddenConditionIds(new Set(allIds));
    onFilterChange?.(allIds);
  };

  const visibleLanes = useMemo(() => {
    return [...lanes.entries()].filter(([id]) => !hiddenConditionIds.has(id));
  }, [lanes, hiddenConditionIds]);

  const markerCount = DISTANCE_MARKER_COUNT;

  return (
    <div
      className={cn("rounded-lg border border-white/10 bg-black/30 px-3 py-2 space-y-2", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
          Condition timeline{horseName ? ` · ${horseName}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <LiveFreshnessBadge context="In-running state" lastUpdatedAt={lastUpdatedAt} />
          <span className="text-[10px] tabular-nums text-muted-foreground font-mono">
            0–{distance}m
          </span>
        </div>
      </div>

      {lanes.size === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No conditions recorded yet — they appear as the race unfolds.
        </p>
      ) : (
        <>
          {/* Badge Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 pb-1 border-b border-white/5 text-[10px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                <Filter className="h-2.5 w-2.5" />
                Badges:
              </span>
              {availableConditions.map(({ id, label, tone }) => {
                const isHidden = hiddenConditionIds.has(id);
                const toneStyle = TONE_BADGE_STYLE[tone];
                return (
                  <button
                    key={id}
                    type="button"
                    role="button"
                    data-testid={`condition-filter-${id}`}
                    aria-pressed={!isHidden}
                    aria-label={`Toggle ${label} condition filter`}
                    onClick={() => toggleCondition(id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-broadcast-accent",
                      isHidden
                        ? "bg-black/40 border-white/10 text-muted-foreground/50 opacity-40 line-through hover:opacity-75"
                        : toneStyle.active,
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        isHidden ? "bg-muted-foreground/40" : toneStyle.dot,
                      )}
                    />
                    <span>{label}</span>
                    {!isHidden && <Check className="h-2.5 w-2.5 ml-0.5 opacity-80" />}
                  </button>
                );
              })}
            </div>

            {availableConditions.length > 1 && (
              <div className="flex items-center gap-1 text-[9px]">
                <button
                  type="button"
                  data-testid="condition-filter-all"
                  onClick={showAll}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cream/70 hover:text-white transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  data-testid="condition-filter-none"
                  onClick={hideAll}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cream/70 hover:text-white transition-colors"
                >
                  None
                </button>
              </div>
            )}
          </div>

          {/* Timeline Lanes */}
          {visibleLanes.length === 0 ? (
            <div className="py-3 px-2 text-center rounded bg-black/20 border border-white/5 space-y-1">
              <p className="text-[11px] text-muted-foreground">
                All {lanes.size} condition badges are hidden by filters.
              </p>
              <button
                type="button"
                data-testid="condition-filter-reset"
                onClick={showAll}
                className="text-[10px] text-broadcast-accent hover:underline font-bold"
              >
                Show All Conditions
              </button>
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="space-y-1">
                {visibleLanes.map(([id, segs]) => (
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
                              <p className="text-xs font-bold uppercase tracking-wide">
                                {seg.label}
                              </p>
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
        </>
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
