import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { REAL_WORLD_RECORDS } from "@/data/realWorldRecords";
import { pacePerMile } from "@/core/common/formatting";
import { iterateRaceRuns } from "@/core/race/bestPace";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import type { Race } from "@/core/race/types";

interface HorseBenchmarkDialogProps {
  horseId: string;
  horseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HorseRun {
  seconds: number;
  perMile: number;
  distance: number;
  surface?: "Turf" | "Dirt" | "Synthetic";
  raceName: string;
}

/** Every resolved run this horse recorded, normalised to seconds per mile. */
function runsForHorse(races: Race[], horseId: string): HorseRun[] {
  return iterateRaceRuns(races)
    .filter((r) => r.horseId === horseId)
    .map((r) => ({
      seconds: r.seconds,
      perMile: r.perMile,
      distance: r.distance,
      surface: r.surface,
      raceName: r.raceName,
    }))
    .sort((a, b) => a.perMile - b.perMile);
}

/**
 * Compares one horse's recorded times against the curated real-world benchmark
 * times, matching each benchmark to that horse's best comparable run.
 */
export function HorseBenchmarkDialog({
  horseId,
  horseName,
  open,
  onOpenChange,
}: HorseBenchmarkDialogProps) {
  const allRaces = useGameWithShallow((s: GameState) => s.races ?? []);

  const runs = useMemo(() => {
    const list = Array.isArray(allRaces) ? allRaces : Object.values(allRaces ?? {});
    return runsForHorse(list as Race[], horseId);
  }, [allRaces, horseId]);

  const best = runs[0];

  const rows = useMemo(
    () =>
      REAL_WORLD_RECORDS.map((benchmark) => {
        const benchmarkPerMile = pacePerMile(benchmark.seconds, benchmark.distanceMeters);
        const comparable = runs.filter(
          (r) =>
            (!r.surface || r.surface === benchmark.surface) &&
            Math.abs(r.distance - benchmark.distanceMeters) <= 400,
        );
        const match = comparable[0] ?? best;
        const exact = comparable.length > 0;
        const deltaPct =
          match && benchmarkPerMile > 0
            ? ((benchmarkPerMile - match.perMile) / benchmarkPerMile) * 100
            : undefined;
        return { benchmark, benchmarkPerMile, match, exact, deltaPct };
      }),
    [runs, best],
  );

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

            <div className="rounded border border-white/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest font-mono text-cream/50">
                    <th className="px-3 py-2 text-left">Benchmark</th>
                    <th className="px-3 py-2 text-right">Their / mi</th>
                    <th className="px-3 py-2 text-right">{horseName} / mi</th>
                    <th className="px-3 py-2 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(({ benchmark, benchmarkPerMile, match, exact, deltaPct }) => (
                    <tr key={benchmark.id} className="hover:bg-white/[0.02]">
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
                      <td className="px-3 py-2 text-right">
                        {deltaPct === undefined ? (
                          <span className="text-cream-muted">—</span>
                        ) : (
                          <Badge
                            variant={deltaPct >= 0 ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {deltaPct >= 0 ? "+" : ""}
                            {deltaPct.toFixed(2)}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] italic text-cream-muted">
              Positive delta means {horseName} ran faster per mile than the benchmark. Where no
              comparable trip and surface exists, the horse&apos;s career best pace is used.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
