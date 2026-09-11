import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { REAL_WORLD_RECORDS } from "@/data/realWorldRecords";
import {
  runsForHorse,
  computeHorseBenchmarkStanding,
  type BenchmarkMatchupRow,
} from "@/services/history/historyFacade";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import type { Race } from "@/services/race/raceFacade";
import { cn } from "@/lib/cn";

interface HorseBenchmarkDialogProps {
  horseId: string;
  horseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SortOption = "rank" | "curated" | "distance";
type SurfaceFilter = "all" | "Turf" | "Dirt";

/**
 * Compares one horse's recorded times against the curated real-world benchmark
 * times, matching each benchmark to that horse's best comparable run and
 * calculating an at-a-glance field rank and percentile standing.
 */
export function HorseBenchmarkDialog({
  horseId,
  horseName,
  open,
  onOpenChange,
}: HorseBenchmarkDialogProps) {
  const allRaces = useGameWithShallow((s: GameState) => s.races ?? []);
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [surfaceFilter, setSurfaceFilter] = useState<SurfaceFilter>("all");

  const runs = useMemo(() => {
    const list = Array.isArray(allRaces) ? allRaces : Object.values(allRaces ?? {});
    return runsForHorse(list as Race[], horseId);
  }, [allRaces, horseId]);

  const standing = useMemo(() => computeHorseBenchmarkStanding(runs), [runs]);
  const best = runs[0];

  const displayedRows = useMemo(() => {
    let list: BenchmarkMatchupRow[] = standing.rows;
    if (surfaceFilter !== "all") {
      list = list.filter((r) => r.benchmark.surface === surfaceFilter);
    }
    if (sortBy === "curated") {
      return [...list].sort((a, b) => {
        const ia = REAL_WORLD_RECORDS.findIndex((x) => x.id === a.benchmark.id);
        const ib = REAL_WORLD_RECORDS.findIndex((x) => x.id === b.benchmark.id);
        return ia - ib;
      });
    }
    if (sortBy === "distance") {
      return [...list].sort((a, b) => a.benchmark.distanceMeters - b.benchmark.distanceMeters);
    }
    // Default: rank (best delta advantage first)
    return [...list].sort((a, b) => a.rank - b.rank);
  }, [standing.rows, surfaceFilter, sortBy]);

  const tierBadgeClass = useMemo(() => {
    switch (standing.tier.variant) {
      case "gold":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "amber":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      case "emerald":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "slate":
        return "bg-slate-700/40 text-slate-300 border-slate-600/40";
      default:
        return "bg-white/5 text-cream-muted border-white/10";
    }
  }, [standing.tier.variant]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-sm text-gold">
            {horseName} vs reference times
          </DialogTitle>
        </DialogHeader>

        {runs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recorded race times for this horse yet.
          </p>
        ) : (
          <div className="space-y-3">
            {/* At-a-glance KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded flex flex-col justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
                  Field Rank
                </div>
                <div className="font-mono text-lg font-bold text-cream my-0.5">
                  #{standing.rank}
                  <span className="text-xs text-cream/30"> / {standing.fieldSize}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] w-fit font-mono tracking-wider", tierBadgeClass)}
                >
                  {standing.tier.label}
                </Badge>
              </div>

              <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded flex flex-col justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
                  Field Percentile
                </div>
                <div className="font-mono text-lg font-bold text-cream my-0.5">
                  {standing.percentile}%
                  <span className="text-xs text-cream/40 font-normal">
                    {" "}
                    · Top {standing.topPercentile}%
                  </span>
                </div>
                <div
                  className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden"
                  role="meter"
                  aria-valuenow={standing.percentile}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Field percentile: ${standing.percentile}%`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                    style={{ width: `${standing.percentile}%` }}
                  />
                </div>
              </div>

              <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded flex flex-col justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
                  Outpaced
                </div>
                <div className="font-mono text-lg font-bold text-cream my-0.5">
                  {standing.outpacedCount}
                  <span className="text-xs text-cream/30"> / {standing.totalBenchmarks}</span>
                </div>
                <div className="text-[10px] font-mono text-cream/50">
                  {standing.surfaceBreakdown.Turf.outpaced}/{standing.surfaceBreakdown.Turf.total}{" "}
                  Turf · {standing.surfaceBreakdown.Dirt.outpaced}/
                  {standing.surfaceBreakdown.Dirt.total} Dirt
                </div>
              </div>

              <div className="border border-white/5 bg-slate-900/60 p-2.5 rounded flex flex-col justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wide text-cream/50">
                  Avg Pace Delta
                </div>
                <div
                  className={cn(
                    "font-mono text-lg font-bold my-0.5",
                    standing.averageDeltaPct >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {standing.averageDeltaPct >= 0 ? "+" : ""}
                  {standing.averageDeltaPct.toFixed(2)}%
                </div>
                <div className="text-[10px] font-mono text-cream/40">
                  {standing.averageDeltaPct >= 0 ? "Pace advantage" : "Pace deficit"}
                </div>
              </div>
            </div>

            {/* Career Best Pace Summary */}
            <div className="flex items-center justify-between gap-2 rounded border border-white/10 bg-slate-900/40 px-3 py-2 text-xs">
              <span className="text-cream-muted">
                Career best pace ·{" "}
                <span className="text-cream">
                  {best.raceName} ({best.distance}m)
                </span>
              </span>
              <RaceTimeDisplay
                seconds={best.seconds}
                distance={best.distance}
                primary="perMile"
                className="text-xs shrink-0"
              />
            </div>

            {/* Filters & Sorting Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                {(["all", "Turf", "Dirt"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSurfaceFilter(s)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors",
                      surfaceFilter === s
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-white/5 text-cream-muted hover:text-cream",
                    )}
                  >
                    {s === "all" ? `All (${standing.totalBenchmarks})` : s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cream-muted">
                <span>Sort:</span>
                {(
                  [
                    { id: "rank", label: "Rank" },
                    { id: "curated", label: "Curated" },
                    { id: "distance", label: "Distance" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={cn(
                      "px-2 py-0.5 rounded uppercase transition-colors",
                      sortBy === opt.id
                        ? "bg-white/15 text-cream font-bold"
                        : "hover:text-cream bg-white/5",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Benchmark Table */}
            <div className="rounded border border-white/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide font-mono text-cream/50">
                    <th className="px-2 py-2 text-center w-8">#</th>
                    <th className="px-3 py-2 text-left">Benchmark</th>
                    <th className="px-3 py-2 text-right">Their / mi</th>
                    <th className="px-3 py-2 text-right">{horseName} / mi</th>
                    <th className="px-2 py-2 text-center">Standing</th>
                    <th className="px-3 py-2 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedRows.map(
                    ({ benchmark, benchmarkPerMile, match, exact, deltaPct, rank }) => (
                      <tr key={benchmark.id} className="hover:bg-white/[0.02]">
                        <td className="px-2 py-2 text-center font-mono text-[10px] text-cream/40">
                          #{rank}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-cream">{benchmark.horse}</div>
                          <div className="text-[10px] text-cream-muted">
                            {benchmark.race} · {benchmark.distanceMeters}m {benchmark.surface}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <RaceTimeDisplay
                            seconds={benchmark.seconds}
                            distance={benchmark.distanceMeters}
                            primary="perMile"
                            className="text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {match ? (
                            <div className="space-y-0.5">
                              <RaceTimeDisplay
                                seconds={match.seconds}
                                distance={match.distance}
                                primary="perMile"
                                className="text-xs"
                              />
                              <div className="text-[10px] text-cream-muted">
                                {exact ? `${match.distance}m` : `best run · ${match.distance}m`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-cream-muted">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {deltaPct === undefined ? (
                            <span className="text-cream-muted">—</span>
                          ) : deltaPct > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            >
                              Ahead
                            </Badge>
                          ) : deltaPct < 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-rose-500/10 text-rose-400 border-rose-500/30"
                            >
                              Behind
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                            >
                              Tied
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {deltaPct === undefined ? (
                            <span className="text-cream-muted">—</span>
                          ) : (
                            <Badge
                              variant={deltaPct >= 0 ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] font-mono",
                                deltaPct >= 0
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 text-cream-muted",
                              )}
                            >
                              {deltaPct >= 0 ? "+" : ""}
                              {deltaPct.toFixed(2)}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] italic text-cream-muted">
              Positive delta means {horseName} ran faster per mile than the benchmark. Field rank
              reflects standing in a 16-runner field (15 benchmarks + {horseName}). Where no
              comparable trip and surface exists, the horse&apos;s career best pace is used.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
