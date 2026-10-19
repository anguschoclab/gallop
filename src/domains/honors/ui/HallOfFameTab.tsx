import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import type { GameState } from "@/platform/game/types";
import type { HallOfFameEntry } from "@/domains/history/application/historyFacade";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Trophy, Medal, DollarSign } from "lucide-react";
import { EmptyState } from "@/shared/ui/common/EmptyState";
import { NumericValue } from "@/domains/horse/ui/HorseBits";
import { Link } from "@tanstack/react-router";

export function HallOfFameTab() {
  const hallOfFame = useGameWithShallow((s: GameState) => s.hallOfFame || []);
  const horses = useGame((s: GameState) => s.horses);

  const horsesMap = useMemo(() => new Map(Object.entries(horses)), [horses]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-display)]">
          Hall of Fame
        </h2>
        <p className="text-muted-foreground font-[family-name:var(--font-body)]">
          Legendary horses inducted for their exceptional careers
        </p>
      </div>

      {hallOfFame.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No inductees yet"
          description="No horses have been inducted into the Hall of Fame yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hallOfFame
            .sort((a: HallOfFameEntry, b: HallOfFameEntry) => b.inductionDay - a.inductionDay)
            .map((inductee: HallOfFameEntry) => {
              const horse = horsesMap.get(inductee.horseId);
              return (
                <Card key={inductee.horseId} className="border-border bg-primary/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-[family-name:var(--font-display)] text-lg">
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: inductee.horseId }}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {inductee.name}
                        </Link>
                      </CardTitle>
                      <Badge className="bg-primary text-surface">
                        <Trophy className="h-3 w-3 mr-1" />
                        HOF
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inducted Day {inductee.inductionDay}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">G1 Wins:</span>
                        <span className="font-semibold">{inductee.g1Wins}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-chart-4" />
                        <span className="text-muted-foreground">Graded Wins:</span>
                        <span className="font-semibold">
                          {inductee.lifetimeWins - inductee.g1Wins}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-chart-2" />
                        <span className="text-muted-foreground">Earnings:</span>
                        <span className="font-semibold">
                          <NumericValue value={inductee.lifetimeEarnings} prefix="$" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-chart-1" />
                        <span className="text-muted-foreground">HOTY:</span>
                        <span className="font-semibold">
                          {inductee.achievements.filter((a) => a.includes("HOTY")).length}
                        </span>
                      </div>
                    </div>
                    {horse && (
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">
                          Fame: <NumericValue value={Math.round(horse.fame)} suffix="/100" />
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
