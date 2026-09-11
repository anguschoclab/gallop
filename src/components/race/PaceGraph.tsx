import { useMemo } from "react";
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
import type { SectionalSplit } from "@/services/race/raceFacade";
import { SilkDot } from "@/components/SilkDot";
import { RunnerLegend } from "./RunnerLegend";
import { cn } from "@/lib/cn";
import { useRunnerHighlight } from "@/components/race/useRunnerHighlight";
import {
  PACE_GRAPH_HIGHLIGHT_STROKE,
  PACE_GRAPH_OWNED_STROKE,
  PACE_GRAPH_DEFAULT_STROKE,
  PACE_GRAPH_DIM_OPACITY,
  PACE_GRAPH_FULL_OPACITY,
  PACE_GRAPH_DOT_RADIUS,
  PACE_GRAPH_ACTIVE_DOT_RADIUS,
} from "@/constants";

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

  const { hovered, setHovered, pinned, togglePin, isHighlighted, anyHighlight } =
    useRunnerHighlight(runners);

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

  const getLineProps = (r: PaceGraphRunner) => {
    const highlight = isHighlighted(r.horseId);
    const dim = anyHighlight && !highlight;
    return {
      strokeWidth: highlight
        ? PACE_GRAPH_HIGHLIGHT_STROKE
        : r.owned
          ? PACE_GRAPH_OWNED_STROKE
          : PACE_GRAPH_DEFAULT_STROKE,
      strokeOpacity: dim ? PACE_GRAPH_DIM_OPACITY : PACE_GRAPH_FULL_OPACITY,
      dot: highlight ? { r: PACE_GRAPH_DOT_RADIUS, fill: r.silk } : false,
    };
  };

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
                const { strokeWidth, strokeOpacity, dot } = getLineProps(r);
                return (
                  <Line
                    key={r.horseId}
                    type="monotone"
                    dataKey={r.horseId}
                    stroke={r.silk || "var(--chart-1)"}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    dot={dot}
                    activeDot={{ r: PACE_GRAPH_ACTIVE_DOT_RADIUS }}
                    isAnimationActive={false}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <RunnerLegend
          finishOrder={finishOrder}
          runnerMap={runnerMap}
          pinned={pinned}
          hovered={hovered}
          onTogglePin={togglePin}
          onHover={setHovered}
        />
      </div>
    </div>
  );
}
