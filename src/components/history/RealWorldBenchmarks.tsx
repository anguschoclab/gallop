import { useMemo } from "react";
import { Globe2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { compareToRealWorld } from "@/core/history/almanacInsights";
import type { TrackRecord } from "@/core/history/historyTypes";

export function RealWorldBenchmarks({ records }: { records: TrackRecord[] }) {
  const comparisons = useMemo(() => compareToRealWorld(records), [records]);

  return (
    <div className="space-y-3">
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 flex items-start gap-2 text-xs text-cream-muted">
          <Globe2 className="h-4 w-4 shrink-0 text-primary" />
          <p>
            Curated real-world benchmark times, matched to the closest overall record in your world
            at the same surface and a comparable trip. Reference only — these never affect your game.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {comparisons.map(({ benchmark, gameRecord, speedDeltaPct }) => (
          <Card key={benchmark.id} className="border-white/5 bg-slate-900/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-cream truncate">{benchmark.horse}</h3>
                  <p className="text-[11px] text-cream-muted truncate">
                    {benchmark.race} · {benchmark.track} ({benchmark.country}) · {benchmark.year}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {benchmark.distanceMeters}m {benchmark.surface}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-cream-muted">Real-world time</span>
                <RaceTimeDisplay
                  seconds={benchmark.seconds}
                  distance={benchmark.distanceMeters}
                  className="text-xs"
                />
              </div>

              {gameRecord ? (
                <div className="space-y-1 border-t border-white/5 pt-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-cream-muted">
                      Your world: <span className="text-cream">{gameRecord.horseName}</span> ·{" "}
                      {gameRecord.trackName} {gameRecord.distance}m
                    </span>
                    <RaceTimeDisplay
                      seconds={gameRecord.time}
                      distance={gameRecord.distance}
                      className="text-xs shrink-0"
                    />
                  </div>
                  {speedDeltaPct !== undefined && (
                    <Badge
                      variant={speedDeltaPct >= 0 ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {speedDeltaPct >= 0 ? "+" : ""}
                      {speedDeltaPct.toFixed(2)}% pace vs benchmark
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="border-t border-white/5 pt-2 text-[11px] text-cream-muted">
                  No comparable record set in your world yet.
                </p>
              )}

              <p className="text-[11px] italic text-cream-muted">{benchmark.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
