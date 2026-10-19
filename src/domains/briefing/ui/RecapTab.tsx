import { Link } from "@tanstack/react-router";
import { useRecapData } from "@/domains/race/application/hooks/useRecapData";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BeyerBadge } from "@/domains/race/ui/BeyerBadge";
import { SectionalTimingTable } from "@/domains/race/ui/SectionalTimingTable";
import { PaceGraph } from "@/domains/race/ui/PaceGraph";
import { SpeedBreakdownChart } from "@/domains/race/ui/SpeedBreakdownChart";
import { calculateBeyerForResult } from "@/domains/race/application/raceFacade";
import { gradeColor } from "@/shared/common/uiTokens";
import { calculateClassBonus } from "@/shared/common/classBonus";
import { Trophy, Medal, Award, Clock, Flag } from "lucide-react";
import { EmptyState } from "@/shared/ui/common/EmptyState";
import { NumericValue } from "@/domains/horse/ui/HorseBits";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { cn } from "@/shared/lib/cn";
import { isPlayerOwned } from "@/domains/horse/application/horseFacade";
import type { Race, RaceResult } from "@/domains/race/application/raceFacade";

export function RecapTab() {
  const { localHorseMap, recentGradedRaces, calibratedPars } = useRecapData();

  if (recentGradedRaces.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title="No recaps yet"
        description="No graded races completed in the past 7 days. Check back after the weekend stakes have been run."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {recentGradedRaces.map((race: Race) => {
        const topFinishers = race
          .result!.slice(0, 3)
          .map((result: RaceResult) => {
            const horse = localHorseMap.get(result.horseId);
            if (!horse) return null;
            const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
            const beyer = calculateBeyerForResult(
              race.distance,
              result.time,
              classBonus,
              calibratedPars,
            );
            return { horse, result, beyer };
          })
          .filter((f): f is NonNullable<typeof f> => f !== null);

        return (
          <Card key={race.id} className="border-l-4 border-l-primary border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold font-[family-name:var(--font-display)]">
                      <Link to="/race/$raceId" params={{ raceId: race.id }}>
                        {race.name}
                      </Link>
                    </h3>
                    <Badge className={cn(gradeColor, "font-[family-name:var(--font-mono)]")}>
                      {race.graded!.grade}
                    </Badge>
                    <Badge className="bg-muted text-foreground font-[family-name:var(--font-mono)] tabular-nums">
                      Day <NumericValue value={race.day} />
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                    <span>{race.graded!.track}</span>
                    <span>
                      <NumericValue value={race.distance} suffix="m" />
                    </span>
                    <span>{race.graded!.surface}</span>
                    <span className="font-[family-name:var(--font-mono)] tabular-nums">
                      Purse ${race.purse.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFinishers.map((finisher, index: number) => {
                const positionIcon =
                  index === 0 ? (
                    <Trophy className="h-4 w-4 text-fame" />
                  ) : index === 1 ? (
                    <Medal className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Award className="h-4 w-4 text-warning" />
                  );

                return (
                  <div
                    key={finisher.horse.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      {positionIcon}
                      <SilkDot color={finisher.horse.silk} size="sm" />
                      <div>
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: finisher.horse.id }}
                          className="font-medium font-[family-name:var(--font-display)] text-foreground hover:underline hover:text-primary"
                        >
                          {finisher.horse.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                          <NumericValue
                            value={finisher.result.time.toFixed(2)}
                            suffix="s"
                            className="font-[family-name:var(--font-mono)] tabular-nums"
                          />{" "}
                          · <NumericValue value={Math.floor(finisher.horse.age)} suffix="YO" /> ·
                          OVR{" "}
                          <NumericValue
                            value={Math.round(
                              (finisher.horse.stats.speed +
                                finisher.horse.stats.stamina +
                                finisher.horse.stats.acceleration +
                                finisher.horse.stats.consistency) /
                                4,
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <BeyerBadge beyer={finisher.beyer} />
                  </div>
                );
              })}

              {race.sectionalSplits && race.sectionalSplits.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-primary/60" />
                    <span className="text-[10px] font-black uppercase tracking-wide text-foreground/40">
                      Pace / Position Graph
                    </span>
                  </div>
                  <PaceGraph
                    splits={race.sectionalSplits}
                    runners={race.result!.map((r: RaceResult) => {
                      const horse = localHorseMap.get(r.horseId);
                      return {
                        horseId: r.horseId,
                        name: horse?.name || "Unknown",
                        silk: horse?.silk || "var(--coat-black)",
                        owned: horse ? isPlayerOwned(horse) : false,
                      };
                    })}
                    distance={race.distance}
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="h-3 w-3 text-primary/60" />
                    <span className="text-[10px] font-black uppercase tracking-wide text-foreground/40">
                      Sectional Splits
                    </span>
                  </div>
                  <SectionalTimingTable
                    splits={race.sectionalSplits}
                    runners={race.result!.map((r: RaceResult) => {
                      const horse = localHorseMap.get(r.horseId);
                      return {
                        horseId: r.horseId,
                        name: horse?.name || "Unknown",
                        silk: horse?.silk || "var(--coat-black)",
                        owned: horse ? isPlayerOwned(horse) : false,
                      };
                    })}
                    distance={race.distance}
                  />
                  {race.snapshots && race.snapshots.length > 0 && (
                    <SpeedBreakdownChart
                      snapshots={race.snapshots}
                      runners={race.result!.map((r: RaceResult) => {
                        const horse = localHorseMap.get(r.horseId);
                        return {
                          horseId: r.horseId,
                          name: horse?.name || "Unknown",
                          silk: horse?.silk || "var(--coat-black)",
                          owned: horse ? isPlayerOwned(horse) : false,
                        };
                      })}
                      distance={race.distance}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
