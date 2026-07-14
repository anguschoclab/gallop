import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { MareRanking } from "@/core/breeding/leaderboardTypes";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "foals", label: "Foals Produced" },
  { value: "stakes", label: "Stakes Winners" },
  { value: "g1", label: "G1 Winners" },
  { value: "earnings", label: "Total Earnings" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "bluehen", label: "Blue Hen Only" },
  { value: "non", label: "Non-Blue Hen" },
];

const SORT_FNS: Record<string, (a: MareRanking, b: MareRanking) => number> = {
  score: (a, b) => b.value - a.value,
  foals: (a, b) => b.metrics.foalsProduced - a.metrics.foalsProduced,
  stakes: (a, b) => b.metrics.stakesWinnersProduced - a.metrics.stakesWinnersProduced,
  g1: (a, b) => b.metrics.g1WinnersProduced - a.metrics.g1WinnersProduced,
  earnings: (a, b) => b.metrics.totalFoalEarnings - a.metrics.totalFoalEarnings,
};

const FILTER_FNS: Record<string, (item: MareRanking) => boolean> = {
  all: () => true,
  bluehen: (r) => r.metrics.isBlueHen,
  non: (r) => !r.metrics.isBlueHen,
};

export function BlueHenLeaderboardTab() {
  const leaderboard = useGame((s) => s.blueHenLeaderboard);

  if (!leaderboard) {
    return <LeaderboardSkeleton rows={5} />;
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
        <BlueHenLeaderboardContent leaderboard={leaderboard} />
      )}
    </div>
  );
}

function BlueHenLeaderboardContent({ leaderboard }: { leaderboard: any }) {
  const { sortValue, setSortValue, filterValue, setFilterValue, processed } = useLeaderboardControls<MareRanking>({
    items: leaderboard.rankings,
    sortOptions: SORT_OPTIONS,
    filterOptions: FILTER_OPTIONS,
    sortFns: SORT_FNS,
    filterFns: FILTER_FNS,
    defaultSort: "score",
    defaultFilter: "all",
  });

  return (
    <LeaderboardShell
      title={leaderboard.title}
      description={leaderboard.description}
      icon={<Sparkles className="h-4 w-4 text-info" />}
    >
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
        filterOptions={FILTER_OPTIONS}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
      />
      {processed.map((ranking: MareRanking) => (
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
  );
}
