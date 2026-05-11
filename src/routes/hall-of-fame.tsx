import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, DollarSign, Calendar } from "lucide-react";
import { NumericValue } from "@/components/HorseBits";

export const Route = createFileRoute("/hall-of-fame")({
  component: HallOfFame,
});

function HallOfFame() {
  const hallOfFame = useGame((s) => s.hallOfFame || []);
  const horses = useGame((s) => s.horses);

  // ⚡ Bolt: Cache horses in an O(1) map to replace the previous O(N^2) `.find` inside the loop below.
  // Impact: Prevents N * M iterations where N is hallOfFame length and M is horses length.
  const horsesMap = useMemo(() => {
    return new Map(horses.map((h) => [h.id, h]));
  }, [horses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cream font-[family-name:var(--font-display)]">
          Hall of Fame
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Legendary horses inducted for their exceptional careers
        </p>
      </div>

      {hallOfFame.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 text-gold-muted mx-auto mb-4" />
            <p className="text-cream-muted">
              No horses have been inducted into the Hall of Fame yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hallOfFame
            .sort((a, b) => b.inductedOnDay - a.inductedOnDay)
            .map((inductee) => {
              const horse = horsesMap.get(inductee.horseId);
              return (
                <Card key={inductee.horseId} className="border-gold-muted bg-gold/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-[family-name:var(--font-display)] text-lg">
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: inductee.horseId }}
                          className="hover:underline hover:text-gold transition-colors"
                        >
                          {inductee.horseName}
                        </Link>
                      </CardTitle>
                      <Badge className="bg-gold text-t900">
                        <Trophy className="h-3 w-3 mr-1" />
                        HOF
                      </Badge>
                    </div>
                    <p className="text-xs text-cream-muted">
                      Inducted Day {inductee.inductedOnDay}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-gold" />
                        <span className="text-cream-muted">G1 Wins:</span>
                        <span className="font-semibold">{inductee.careerHighlights.g1Wins}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-chart-4" />
                        <span className="text-cream-muted">Graded Wins:</span>
                        <span className="font-semibold">
                          {inductee.careerHighlights.gradedWins}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-chart-2" />
                        <span className="text-cream-muted">Earnings:</span>
                        <span className="font-semibold">
                          <NumericValue
                            value={inductee.careerHighlights.lifetimeEarnings}
                            prefix="$"
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-chart-1" />
                        <span className="text-cream-muted">HOTY:</span>
                        <span className="font-semibold">
                          {inductee.careerHighlights.horseOfTheYearAwards}
                        </span>
                      </div>
                    </div>
                    {horse && (
                      <div className="pt-2 border-t border-gold-muted/30">
                        <p className="text-xs text-cream-muted">
                          Fame: <NumericValue value={horse.fame} suffix="/100" />
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
