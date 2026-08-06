import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SectionalSplit } from "@/core/race/types";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";

interface PaceGraphRunner {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

interface PaceGraphProps {
  splits: SectionalSplit[];
  runners: PaceGraphRunner[];
  /** Race distance in meters (used to label finish marker). */
  distance?: number;
  className?: string;
}

interface PointDatum {
  /** Distance in meters along the race. */
  distance: number;
  label: string;
  /** Map of horseId -> position rank at this marker. */
  [horseId: string]: number | string;
}

/**
 * Pace / position graph: visualises field position over the course of a race.
 * Y axis is rank (1 = leader, inverted), X axis is distance (m) at each
 * sectional marker. Each runner is a line; owned runners are highlighted.
 */
export function PaceGraph({ splits, runners, distance, className }: PaceGraphProps) {
  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.horseId, r])), [runners]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    const init = new Set<string>();
    runners.forEach((r) => {
      if (r.owned) init.add(r.horseId);
    });
    return init;
  });

  const fieldSize = runners.length;

  // Build chart data: one row per split marker, with each runner's rank as a key.
  const data = useMemo<PointDatum[]>(() => {
    return splits.map((split) => {
      const row: PointDatum = {
        distance: Math.round(split.distanceMeters),
        label: split.label,
      };
      for (const entry of split.entries) {
        row[entry.horseId] = entry.rank;
      }
      return row;
    });
  }, [splits]);

  const finishOrder = useMemo(() => {
    const last = splits[splits.length - 1];
    if (!last) return runners.map((r) => r.horseId);
    return [...last.entries].sort((a, b) => a.rank - b.rank).map((e) => e.horseId);
  }, [splits, runners]);

  const togglePin = (horseId: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(horseId)) next.delete(horseId);
      else next.add(horseId);
      return next;
    });
  };

  const isHighlighted = (horseId: string) => pinned.has(horseId) || hovered === horseId;
  const anyHighlight = pinned.size > 0 || hovered !== null;

  if (splits.length === 0 || runners.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        <div className="h-72 bg-black/20 border border-white/5 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 24, left: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis
                dataKey="distance"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: "var(--chart-axis)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickFormatter={(v: number) => `${v}m`}
                label={{
                  value: "Distance",
                  position: "insideBottom",
                  offset: -10,
                  fill: "var(--chart-axis)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <YAxis
                reversed
                allowDecimals={false}
                domain={[1, fieldSize]}
                tick={{ fill: "var(--chart-axis)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                width={32}
                label={{
                  value: "Pos",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--chart-axis)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
                labelFormatter={(v: number) => `At ${v}m`}
                formatter={(value: number, key: string) => {
                  const r = runnerMap.get(key);
                  return [`Pos ${value}`, r?.name ?? key];
                }}
                itemSorter={(item: { value?: number | string }) => Number(item.value)}
              />
              {distance && (
                <ReferenceLine
                  x={Math.round(distance)}
                  stroke="var(--chart-axis)"
                  strokeDasharray="2 4"
                  label={{
                    value: "Fin",
                    position: "top",
                    fill: "var(--chart-axis)",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              )}
              {runners.map((r) => {
                const highlight = isHighlighted(r.horseId);
                const dim = anyHighlight && !highlight;
                return (
                  <Line
                    key={r.horseId}
                    type="monotone"
                    dataKey={r.horseId}
                    stroke={r.silk || "var(--chart-1)"}
                    strokeWidth={highlight ? 2.5 : r.owned ? 2 : 1.25}
                    strokeOpacity={dim ? 0.18 : 1}
                    dot={highlight ? { r: 3, fill: r.silk } : false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="border border-white/5 bg-black/20 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-white/5 font-mono text-[9px] uppercase tracking-widest text-cream/40">
            Runners ({finishOrder.length})
          </div>
          <ul className="overflow-y-auto custom-scrollbar max-h-64 divide-y divide-white/5">
            {finishOrder.map((id, i) => {
              const r = runnerMap.get(id);
              if (!r) return null;
              const active = pinned.has(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => togglePin(id)}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-white/[0.03] transition-colors",
                      active && "bg-white/[0.04]",
                    )}
                  >
                    <span className="font-mono tabular-nums text-cream/30 text-[10px] w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <SilkDot color={r.silk} size="sm" />
                    <span
                      className={cn(
                        "flex-1 truncate font-mono uppercase tracking-tight",
                        r.owned ? "text-success font-bold" : "text-cream/80",
                        active && "text-gold",
                      )}
                    >
                      {r.name}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full border",
                        active ? "bg-gold border-gold" : "border-white/20 bg-transparent",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2 border-t border-white/5 font-mono text-[9px] uppercase tracking-widest text-cream/30">
            Tap a runner to pin
          </div>
        </div>
      </div>
    </div>
  );
}
