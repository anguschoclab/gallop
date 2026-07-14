import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { BlueHenLeaderboard as BlueHenLeaderboardType, MareRanking } from "@/core/breeding/leaderboardTypes";

export function BlueHenLeaderboardTab() {
  const leaderboard = useGame((s) => s.blueHenLeaderboard);

  if (!leaderboard) {
    return (
      <Card className="border-gold-muted">
        <CardContent className="p-12 text-center">
          <p className="text-cream-muted">
            Blue Hen mare rankings will be available after the first week of gameplay.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Blue Hen Mare Rankings
        </h2>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Broodmares ranked by their produce record. Updated weekly.
        </p>
      </div>

      {leaderboard.rankings.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <p className="text-cream-muted">No broodmare data available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="text-cream font-[family-name:var(--font-display)]">
              {leaderboard.title}
            </CardTitle>
            <p className="text-sm text-cream-muted">{leaderboard.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.rankings.map((ranking: MareRanking) => (
                <div
                  key={ranking.mareId}
                  className="flex items-center justify-between p-3 bg-t700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-8 text-cream">#{ranking.rank}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-cream">{ranking.mareName}</p>
                        {ranking.metrics.isBlueHen && (
                          <Badge variant="outline" className="border-info text-info">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Blue Hen
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-cream-muted">
                        {ranking.metrics.foalsProduced} foals ·{" "}
                        {ranking.metrics.stakesWinnersProduced} Stakes ·{" "}
                        {ranking.metrics.g1WinnersProduced} G1 ·{" "}
                        ${(ranking.metrics.totalFoalEarnings / 1_000_000).toFixed(1)}M earnings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cream">{ranking.value}</p>
                    <p className="text-xs text-cream-muted">Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
