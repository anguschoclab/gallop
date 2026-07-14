import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { DamsireRanking } from "@/core/breeding/leaderboardTypes";
import {
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
} from "@/components/leaderboard/LeaderboardPrimitives";

export function DamsireLeaderboardTab() {
  const leaderboard = useGame((s) => s.damsireLeaderboard);

  if (!leaderboard) {
    return (
      <LeaderboardEmpty message="Broodmare sire rankings will be available after the first week of gameplay." />
    );
  }

  return (
    <div className="space-y-6">
      <LeaderboardHeading
        title="Broodmare Sire Rankings"
        description="Stallions ranked by their daughters' produce as broodmares. Updated weekly."
      />

      {leaderboard.rankings.length === 0 ? (
        <LeaderboardEmpty message="No broodmare sire data available yet." />
      ) : (
        <LeaderboardShell
          title={leaderboard.title}
          description={leaderboard.description}
          icon={<Heart className="h-4 w-4 text-primary" />}
        >
          {leaderboard.rankings.map((ranking: DamsireRanking) => (
            <LeaderboardRow
              key={ranking.damsireId}
              rank={ranking.rank}
              name={ranking.damsireName}
              badges={
                <Badge variant="outline" className="text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  {ranking.metrics.daughtersBred} daughters
                </Badge>
              }
              meta={`${ranking.metrics.stakesFoals} Stakes · ${ranking.metrics.g1Foals} G1 · $${(ranking.metrics.totalEarnings / 1_000_000).toFixed(1)}M earnings`}
              value={ranking.value}
            />
          ))}
        </LeaderboardShell>
      )}
    </div>
  );
}
