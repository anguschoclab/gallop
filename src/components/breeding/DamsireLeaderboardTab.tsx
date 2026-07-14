import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { DamsireLeaderboard as DamsireLeaderboardType, DamsireRanking } from "@/core/breeding/leaderboardTypes";

export function DamsireLeaderboardTab() {
  const leaderboard = useGame((s) => s.damsireLeaderboard);

  if (!leaderboard) {
    return (
      <Card className="border-gold-muted">
        <CardContent className="p-12 text-center">
          <p className="text-cream-muted">
            Broodmare sire rankings will be available after the first week of gameplay.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Broodmare Sire Rankings
        </h2>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Stallions ranked by their daughters' produce as broodmares. Updated weekly.
        </p>
      </div>

      {leaderboard.rankings.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <p className="text-cream-muted">No broodmare sire data available yet.</p>
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
              {leaderboard.rankings.map((ranking: DamsireRanking) => (
                <div
                  key={ranking.damsireId}
                  className="flex items-center justify-between p-3 bg-t700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-8 text-cream">#{ranking.rank}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-cream">{ranking.damsireName}</p>
                        <Badge variant="outline" className="text-xs">
                          <Heart className="h-3 w-3 mr-1" />
                          {ranking.metrics.daughtersBred} daughters
                        </Badge>
                      </div>
                      <p className="text-sm text-cream-muted">
                        {ranking.metrics.stakesFoals} Stakes · {ranking.metrics.g1Foals} G1 ·{" "}
                        ${(ranking.metrics.totalEarnings / 1_000_000).toFixed(1)}M earnings
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
