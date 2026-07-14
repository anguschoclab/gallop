import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { MareRanking } from "@/core/breeding/leaderboardTypes";
import {
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
} from "@/components/leaderboard/LeaderboardPrimitives";

export function BlueHenLeaderboardTab() {
  const leaderboard = useGame((s) => s.blueHenLeaderboard);

  if (!leaderboard) {
    return (
      <LeaderboardEmpty message="Blue Hen mare rankings will be available after the first week of gameplay." />
    );
  }

  return (
    <div className="space-y-6">
      <LeaderboardHeading
        title="Blue Hen Mare Rankings"
        description="Broodmares ranked by their produce record. Updated weekly."
      />

      {leaderboard.rankings.length === 0 ? (
        <LeaderboardEmpty message="No broodmare data available yet." />
      ) : (
        <LeaderboardShell
          title={leaderboard.title}
          description={leaderboard.description}
          icon={<Sparkles className="h-4 w-4 text-info" />}
        >
          {leaderboard.rankings.map((ranking: MareRanking) => (
            <LeaderboardRow
              key={ranking.mareId}
              rank={ranking.rank}
              name={ranking.mareName}
              badges={
                ranking.metrics.isBlueHen && (
                  <Badge variant="outline" className="border-info text-info">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Blue Hen
                  </Badge>
                )
              }
              meta={`${ranking.metrics.foalsProduced} foals · ${ranking.metrics.stakesWinnersProduced} Stakes · ${ranking.metrics.g1WinnersProduced} G1 · $${(ranking.metrics.totalFoalEarnings / 1_000_000).toFixed(1)}M earnings`}
              value={ranking.value}
            />
          ))}
        </LeaderboardShell>
      )}
    </div>
  );
}
