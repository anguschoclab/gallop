import { useMemo, useState } from "react";
import type { Horse } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SilkDot } from "@/components/SilkDot";
import { NumericValue } from "@/components/horse/HorseBits";
import { calculateHeadToHeadOdds } from "@/core/race/headToHead";
import { useHeadToHeadSim } from "@/hooks/horse/useHeadToHeadSim";
import { cn } from "@/lib/cn";
import { SIM_ITERATIONS, DEFAULT_SIM_DISTANCE } from "@/constants/uiConstants";

const DISTANCE_OPTIONS = [
  { label: "5F", value: 1000 },
  { label: "6F", value: 1200 },
  { label: "1M", value: 1600 },
  { label: "1¼M", value: 2000 },
  { label: "1½M", value: 2400 },
];

const SURFACE_OPTIONS: Array<{ label: string; value: "Turf" | "Dirt" | "Synthetic" }> = [
  { label: "Turf", value: "Turf" },
  { label: "Dirt", value: "Dirt" },
  { label: "Synthetic", value: "Synthetic" },
];

export function HeadToHeadSection({ horses }: { horses: Horse[] }) {
  const [distance, setDistance] = useState(DEFAULT_SIM_DISTANCE);
  const [surface, setSurface] = useState<"Turf" | "Dirt" | "Synthetic">("Turf");
  const { simResults, simRunning, runSim, clearSim } = useHeadToHeadSim();

  const odds = useMemo(
    () => calculateHeadToHeadOdds(horses, distance, surface),
    [horses, distance, surface],
  );

  const oddsMap = useMemo(() => new Map(odds.map((o) => [o.horseId, o])), [odds]);
  const simResultsMap = useMemo(
    () => (simResults ? new Map(simResults.map((r) => [r.horseId, r])) : null),
    [simResults],
  );

  return (
    <div className="border-t border-white/10 pt-4" data-testid="head-to-head-section">
      <h4 className="text-[11px] uppercase tracking-widest font-mono text-cream/50 mb-3">
        Head-to-Head Projection
      </h4>

      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest font-mono text-cream/40">
            Distance
          </span>
          <select
            value={distance}
            onChange={(e) => {
              setDistance(Number(e.target.value));
              clearSim();
            }}
            className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs font-mono text-cream"
          >
            {DISTANCE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest font-mono text-cream/40">
            Surface
          </span>
          <div className="flex gap-1">
            {SURFACE_OPTIONS.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-6 px-2 text-[10px] font-mono uppercase tracking-wider",
                  surface === s.value
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "text-cream/50 border border-white/5",
                )}
                onClick={() => {
                  setSurface(s.value);
                  clearSim();
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightweight odds */}
      <div className={cn("grid gap-3 mb-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {horses.map((h) => {
          const o = oddsMap.get(h.id);
          if (!o) return null;
          return (
            <div key={h.id} className="rounded border border-white/5 p-3 bg-white/[0.02]">
              <div className="flex items-center gap-1.5 mb-2">
                <SilkDot color={h.silk} size="sm" />
                <span className="text-xs font-bold text-cream">{h.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cream/50">Win %</span>
                  <NumericValue
                    value={(o.winPct * 100).toFixed(1)}
                    suffix="%"
                    className="text-gold font-bold"
                  />
                </div>
                <Progress value={o.winPct * 100} className="h-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-cream/50">Proj. Beyer</span>
                  <NumericValue value={o.projectedBeyer} className="text-cream/80" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cream/50">Finish Time</span>
                  <NumericValue
                    value={o.projectedFinishTime.toFixed(1)}
                    suffix="s"
                    className="text-cream/80"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monte Carlo simulation */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => runSim(horses, distance, surface)}
          disabled={simRunning}
          className="h-7 text-[10px] uppercase tracking-widest font-mono"
        >
          {simRunning ? "Running..." : `Run Simulation (${SIM_ITERATIONS}×)`}
        </Button>
        {simResults && (
          <span className="text-[10px] font-mono text-cream/40">{SIM_ITERATIONS} iterations completed</span>
        )}
      </div>

      {simResults && (
        <div className={cn("grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {horses.map((h) => {
            const r = simResultsMap?.get(h.id);
            if (!r) return null;
            return (
              <div key={h.id} className="rounded border border-gold/10 p-3 bg-gold/[0.02]">
                <div className="flex items-center gap-1.5 mb-2">
                  <SilkDot color={h.silk} size="sm" />
                  <span className="text-xs font-bold text-cream">{h.name}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-cream/50">Sim Win %</span>
                    <NumericValue
                      value={(r.winPct * 100).toFixed(1)}
                      suffix="%"
                      className="text-gold font-bold"
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cream/50">Avg Finish</span>
                    <NumericValue
                      value={r.avgFinishPosition.toFixed(2)}
                      className="text-cream/80"
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cream/50">Avg Time</span>
                    <NumericValue
                      value={r.avgFinishTime.toFixed(1)}
                      suffix="s"
                      className="text-cream/80"
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cream/50">Beyer Range</span>
                    <NumericValue
                      value={`${r.beyerRange[0]}–${r.beyerRange[1]}`}
                      className="text-cream/80"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
