import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Timer } from "lucide-react";
import { RaceTimeDisplay } from "@/components/race/RaceTimeDisplay";
import { gradeColor } from "@/services/common/commonFacade";
import { formatCurrency } from "@/lib/formatting";
import type { TrackLedgerEntry } from "@/services/history/historyFacade";

function PrestigeChip({ label, delta, isPlayer }: { label: string; delta: number; isPlayer: boolean }) {
  const tone =
    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-cream-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${
        isPlayer ? "bg-primary/15 text-cream" : "bg-muted/40 text-cream-muted"
      }`}
    >
      <span className="truncate max-w-[9rem]">{label}</span>
      <span className={`tabular-nums font-semibold ${tone}`}>
        {delta > 0 ? "+" : ""}
        {delta}
      </span>
    </span>
  );
}

export function TrackLedgerRaces({ races }: { races: TrackLedgerEntry[] }) {
  if (races.length === 0) {
    return (
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-6 text-sm text-cream-muted flex items-center gap-2">
          <Timer className="h-4 w-4" />
          No races recorded at this course yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {races.map((race) => (
        <Card key={race.raceId} className="border-white/5 bg-slate-900/40">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {race.grade && (
                    <Badge variant="outline" className={gradeColor(race.grade)}>
                      {race.grade}
                    </Badge>
                  )}
                  <span className="truncate text-sm font-medium text-cream">{race.raceName}</span>
                </div>
                <p className="text-[11px] text-cream-muted">
                  Yr {race.year} · D{race.day} · {race.distance}m
                  {race.surface ? ` · ${race.surface}` : ""} · field of {race.fieldSize} ·{" "}
                  {formatCurrency(race.purse)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <RaceTimeDisplay
                  seconds={race.time}
                  distance={race.distance}
                  className="text-sm justify-end"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-cream">
              <Crown className="h-3.5 w-3.5 text-gold shrink-0" />
              <span className="font-medium truncate">{race.winnerName}</span>
              {race.winnerStableName && (
                <span className="text-cream-muted truncate">· {race.winnerStableName}</span>
              )}
              {race.winnerIsPlayer && (
                <Badge variant="default" className="text-[10px]">
                  Your stable
                </Badge>
              )}
              {race.runnerUpName && (
                <span className="text-cream-muted truncate hidden sm:inline">
                  · 2nd {race.runnerUpName}
                </span>
              )}
            </div>

            {race.prestigeDeltas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {race.prestigeDeltas.slice(0, 8).map((d) => (
                  <PrestigeChip
                    key={d.stableId}
                    label={d.stableName}
                    delta={d.delta}
                    isPlayer={d.isPlayer}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
