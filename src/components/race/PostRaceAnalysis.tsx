import { SectionalTimingTable } from "@/components/race/SectionalTimingTable";
import { PaceGraph } from "@/components/race/PaceGraph";
import { SpeedBreakdownTable } from "@/components/race/SpeedBreakdownTable";
import { SpeedBreakdownChart } from "@/components/race/SpeedBreakdownChart";
import { JockeyReportPanel } from "@/components/race/JockeyReportPanel";
import { LiveSplitsTable } from "@/components/race/LiveSplitsTable";
import { RacePrestigeBreakdown } from "@/components/shared/PrestigeBreakdownPanel";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Horse } from "@/game/types";
import type { Race } from "@/core/race/types";

interface PostRaceAnalysisProps {
  race: Race;
  runners: Runner[];
  liveSplits: Map<string, number[]>;
  localHorseMap: Map<string, Horse>;
  calibratedPars: Record<number, number>;
}

/**
 * PostRaceAnalysis — the demoted Splits/Sectionals/Speed-Breakdown reveal.
 * Rendered behind a collapsible in the race route's review phase, so the
 * live broadcast doesn't compete with data tabs for attention.
 */
export function PostRaceAnalysis({
  race,
  runners,
  liveSplits,
  localHorseMap,
  calibratedPars,
}: PostRaceAnalysisProps) {
  const runnerProps = runners.map((r) => ({
    horseId: r.horseId,
    name: r.name,
    silk: r.silk,
    owned: r.isPlayer,
  }));

  const hasSectionals = race.resolved && race.sectionalSplits && race.sectionalSplits.length > 0;

  return (
    <div className="border border-white/10 bg-black/20 p-6 rounded-lg space-y-8">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
          <span className="h-1 w-12 bg-broadcast-accent" />
          Prestige Impact
        </h3>
        <RacePrestigeBreakdown
          trackId={race.trackId ?? race.graded?.trackId}
          trackName={race.graded?.track}
        />
      </div>
      {hasSectionals && (
        <>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
              <span className="h-1 w-12 bg-broadcast-accent" />
              Pace / Position Graph
            </h3>
            <PaceGraph
              splits={race.sectionalSplits ?? []}
              runners={runnerProps}
              distance={race.distance}
            />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
              <span className="h-1 w-12 bg-broadcast-accent" />
              Sectional Analysis
            </h3>
            <SectionalTimingTable
              splits={race.sectionalSplits ?? []}
              runners={runnerProps}
              distance={race.distance}
            />
          </div>
          {race.snapshots && race.snapshots.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
                  <span className="h-1 w-12 bg-broadcast-accent" />
                  Speed Breakdown
                </h3>
                <SpeedBreakdownChart
                  snapshots={race.snapshots}
                  runners={runnerProps}
                  distance={race.distance}
                />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
                  <span className="h-1 w-12 bg-broadcast-accent" />
                  Per-Runner Breakdown
                </h3>
                <SpeedBreakdownTable splits={race.sectionalSplits ?? []} runners={runnerProps} />
              </div>
            </>
          )}
          {runners.some((r) => r.isPlayer && r.finishTime !== null) && (
            <JockeyReportPanel
              runners={runners}
              ordered={[...runners].sort((a, b) => (a.finishTime ?? 999) - (b.finishTime ?? 999))}
              sectionalSplits={race.sectionalSplits}
            />
          )}
        </>
      )}

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
          <span className="h-1 w-12 bg-broadcast-accent" />
          Live Splits
        </h3>
        <LiveSplitsTable
          runners={runners}
          distance={race.distance}
          liveSplits={liveSplits}
          localHorseMap={localHorseMap}
          calibratedPars={calibratedPars}
        />
      </div>
    </div>
  );
}
