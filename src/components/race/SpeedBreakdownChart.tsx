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
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";
import { useRunnerHighlight } from "@/components/race/useRunnerHighlight";

interface SpeedBreakdownRunner {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

interface SpeedBreakdownChartProps {
  snapshots: RaceSnapshot[];
  runners: SpeedBreakdownRunner[];
  distance: number;
  className?: string;
}

interface ChartRow {
  distance: number;
  [key: string]: number;
}

export function SpeedBreakdownChart({
  snapshots,
  runners,
  distance,
  className,
}: SpeedBreakdownChartProps) {
  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.horseId, r])), [runners]);

  const { hovered, setHovered, pinned, togglePin, isHighlighted, anyHighlight } =
    useRunnerHighlight(runners);

  // Downsample to every 5th snapshot for Recharts performance
  const downsampled = useMemo(() => {
    return snapshots.filter((_, i) => i % 5 === 0);
  }, [snapshots]);

  const data = useMemo<ChartRow[]>(() => {
    return downsampled.map((snap) => {
      const row: ChartRow = { distance: 0 };
      let maxPos = 0;
      for (const h of snap.horses) {
        if (h.position > maxPos) maxPos = h.position;
      }
      row.distance = Math.round(maxPos);
      for (const h of snap.horses) {
        row[`${h.horseId}_seek`] = (h.seekContribution ?? 0) * 100;
        row[`${h.horseId}_spurt`] = (h.spurtContribution ?? 0) * 100;
      }
      return row;
    });
  }, [downsampled]);

  const finishOrder = useMemo(() => {
    const last = snapshots[snapshots.length - 1];
    if (!last) return runners.map((r) => r.horseId);
    const ordered = [...last.horses].sort((a, b) => b.position - a.position);
    return ordered.map((h) => h.horseId);
  }, [snapshots, runners]);

  const getSeekLineProps = (r: SpeedBreakdownRunner) => {
    const highlight = isHighlighted(r.horseId);
    const dim = anyHighlight && !highlight;
    return {
      strokeWidth: highlight ? 2 : r.owned ? 1.5 : 1,
      strokeOpacity: dim ? 0.12 : 0.5,
    };
  };

  const getSpurtLineProps = (r: SpeedBreakdownRunner) => {
    const highlight = isHighlighted(r.horseId);
    const dim = anyHighlight && !highlight;
    return {
      strokeWidth: highlight ? 2.5 : r.owned ? 2 : 1.25,
      strokeOpacity: dim ? 0.18 : 1,
    };
  };

  if (snapshots.length === 0 || runners.length === 0) return null;

  // Quarter markers for reference lines
  const markers = [0.25, 0.5, 0.75, 1.0].map((f) => Math.round(f * distance));

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
                domain={[0, Math.round(distance)]}
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
                tick={{ fill: "var(--chart-axis)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                width={40}
                label={{
                  value: "%",
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
                labelFormatter={(v: number) => `${v}m`}
                formatter={(value: number, key: string) => {
                  const [horseId, kind] = key.split("_");
                  const r = runnerMap.get(horseId);
                  const label = kind === "seek" ? "Seek" : "Spurt";
                  return [
                    `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`,
                    `${r?.name ?? horseId} · ${label}`,
                  ];
                }}
              />
              {markers.map((m) => (
                <ReferenceLine
                  key={m}
                  x={m}
                  stroke="var(--chart-axis)"
                  strokeDasharray="2 4"
                  strokeOpacity={0.3}
                />
              ))}
              {runners.map((r) => {
                const baseColor = r.silk || "var(--chart-1)";
                const seek = getSeekLineProps(r);
                const spurt = getSpurtLineProps(r);
                return (
                  <g key={r.horseId}>
                    <Line
                      type="monotone"
                      dataKey={`${r.horseId}_seek`}
                      stroke={baseColor}
                      strokeWidth={seek.strokeWidth}
                      strokeOpacity={seek.strokeOpacity}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey={`${r.horseId}_spurt`}
                      stroke={baseColor}
                      strokeWidth={spurt.strokeWidth}
                      strokeOpacity={spurt.strokeOpacity}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                      connectNulls
                    />
                  </g>
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
