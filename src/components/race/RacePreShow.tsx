import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { TacticsAnalyzer } from "@/components/tactics/TacticsAnalyzer";
import { buildPreShowField } from "@/core/race/preShowField";
import { Flag, Play } from "lucide-react";
import type { TrackCondition } from "@/game/types";

interface RacePreShowProps {
  race: {
    id: string;
    name: string;
    distance: number;
    surface?: string;
    trackId?: string;
    trackCondition?: TrackCondition;
    graded?: { grade?: string; track?: string };
  };
  runners: { horseId: string; name: string; silk: string; owned: boolean }[];
  runnerOdds: Map<string, string>;
  onStart: () => void;
}

/**
 * RacePreShow — the pre-race build-up act of the race-day broadcast.
 *
 * Stakes hook, the field rendered as a betting card (silks + morning-line
 * odds + favourite/owner flags), weather strip, and a single Start Race CTA.
 * The live simulation is gated until the player presses Start.
 */
export function RacePreShow({ race, runners, runnerOdds, onStart }: RacePreShowProps) {
  const field = buildPreShowField(runners, runnerOdds);
  const gradeLabel = race.graded?.grade ? `${race.graded.grade} Stakes` : "Race";
  const ownedRunner = runners.find((r) => r.owned);

  return (
    <div className="broadcast min-h-screen text-white bg-broadcast-track">
      <div className="relative z-10 max-w-3xl mx-auto p-6 space-y-6">
        {/* Stakes hook */}
        <div className="space-y-3">
          <Badge variant="g1" className="gap-1.5">
            <Flag className="h-3 w-3" />
            {gradeLabel}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-cream">
            {race.name}
          </h1>
          <p className="text-sm text-cream-muted">
            {race.distance}m{race.surface ? ` · ${race.surface}` : ""}
            {race.graded?.track ? ` · ${race.graded.track}` : ""}
          </p>
          <div className="pt-2">
            <WeatherForecastStrip trackId={race.trackId} trackCondition={race.trackCondition} />
          </div>
        </div>

        {/* The field, as a betting card */}
        <div className="border border-white/10 bg-black/20 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_80px] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/10">
            <span>Silk</span>
            <span>Runner</span>
            <span className="text-right">M/L</span>
          </div>
          {field.map((r) => (
            <div
              key={r.horseId}
              className="grid grid-cols-[40px_1fr_80px] gap-3 px-4 py-2.5 items-center border-b border-white/5 last:border-b-0"
            >
              <SilkDot color={r.silk} size="md" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-cream font-semibold">{r.name}</span>
                {r.isFavourite && (
                  <Badge variant="g1" className="text-[9px] px-1.5 py-0">
                    FAV
                  </Badge>
                )}
                {r.owned && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    YOURS
                  </Badge>
                )}
              </div>
              <span className="text-right font-mono text-cream tabular-nums">{r.oddsLabel}</span>
            </div>
          ))}
        </div>

        {/* Tactics analyzer for player's entered horse */}
        {ownedRunner && <TacticsAnalyzer horseId={ownedRunner.horseId} raceId={race.id} />}

        {/* Start CTA */}
        <div className="flex justify-center pt-2">
          <Button size="xl" onClick={onStart}>
            <Play className="h-5 w-5" />
            Start Race
          </Button>
        </div>
      </div>
    </div>
  );
}
