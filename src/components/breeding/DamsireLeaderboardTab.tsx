import { useGame } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { DamsireRanking } from "@/core/breeding/leaderboardTypes";
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
  { value: "stakes", label: "Stakes Foals" },
  { value: "g1", label: "G1 Foals" },
  { value: "earnings", label: "Total Earnings" },
  { value: "daughters", label: "Daughters Bred" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "high", label: "High Score (>50)" },
  { value: "medium", label: "Medium Score (20-50)" },
  { value: "low", label: "Low Score (<20)" },
];

const SORT_FNS: Record<string, (a: DamsireRanking, b: DamsireRanking) => number> = {
  score: (a, b) => b.value - a.value,
  stakes: (a, b) => b.metrics.stakesFoals - a.metrics.stakesFoals,
  g1: (a, b) => b.metrics.g1Foals - a.metrics.g1Foals,
  earnings: (a, b) => b.metrics.totalEarnings - a.metrics.totalEarnings,
  daughters: (a, b) => b.metrics.daughtersBred - a.metrics.daughtersBred,
};

const FILTER_FNS: Record<string, (item: DamsireRanking) => boolean> = {
  all: () => true,
  high: (r) => r.metrics.blueHenScore > 50,
  medium: (r) => r.metrics.blueHenScore >= 20 && r.metrics.blueHenScore <= 50,
  low: (r) => r.metrics.blueHenScore < 20,
};

export function DamsireLeaderboardTab() {
  const leaderboard = useGame((s) => s.damsireLeaderboard);

  if (!leaderboard) {
    return <LeaderboardSkeleton rows={5} />;
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
        <DamsireLeaderboardContent leaderboard={leaderboard} />
      )}
    </div>
  );
}

function DamsireLeaderboardContent({ leaderboard }: { leaderboard: any }) {
  const { sortValue, setSortValue, filterValue, setFilterValue, processed } =
    useLeaderboardControls<DamsireRanking>({
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
      icon={<Heart className="h-4 w-4 text-primary" />}
    >
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
        filterOptions={FILTER_OPTIONS}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
      />
      {processed.map((ranking: DamsireRanking) => (
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
  );
}
