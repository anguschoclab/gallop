import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardRow,
  LeaderboardShell,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";

interface LeaderboardTableProps {
  leaderboard: any;
  icon: React.ReactNode;
  valueFormatter: (val: any) => string;
  valueLabel?: string;
}

const SORT_OPTIONS = [
  { value: "rank", label: "Rank" },
  { value: "value", label: "Value" },
  { value: "wins", label: "Wins" },
  { value: "starts", label: "Starts" },
];

const SORT_FNS: Record<string, (a: any, b: any) => number> = {
  rank: (a, b) => a.rank - b.rank,
  value: (a, b) => b.value - a.value,
  wins: (a, b) => b.metrics.wins - a.metrics.wins,
  starts: (a, b) => b.metrics.starts - a.metrics.starts,
};

export function LeaderboardTable({
  leaderboard,
  icon,
  valueFormatter,
  valueLabel = "Value",
}: LeaderboardTableProps) {
  const { sortValue, setSortValue, processed } = useLeaderboardControls<any>({
    items: leaderboard?.rankings ?? [],
    sortOptions: SORT_OPTIONS,
    sortFns: SORT_FNS,
    defaultSort: "rank",
  });

  if (!leaderboard) {
    return <LeaderboardSkeleton rows={5} />;
  }

  if (!leaderboard.rankings || leaderboard.rankings.length === 0) {
    return (
      <LeaderboardEmpty message="No records found yet. Keep racing to populate the leaderboards." />
    );
  }

  return (
    <LeaderboardShell title={leaderboard.title} icon={icon}>
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
      />
      {processed.map((entry: any) => (
        <LeaderboardRow
          key={entry.horseId}
          rank={entry.rank}
          name={
            <Link
              to="/stable/$horseId"
              params={{ horseId: entry.horseId }}
              className="font-bold uppercase tracking-tight hover:text-gold transition-colors"
            >
              {entry.horseName}
            </Link>
          }
          meta={`Age ${entry.metrics.age} · ${entry.sireName || "Unknown"}`}
          badges={
            <Badge variant="outline" className="text-xs">
              {entry.metrics.wins}W / {entry.metrics.starts}S
            </Badge>
          }
          value={valueFormatter(entry.value)}
          valueLabel={valueLabel}
        />
      ))}
    </LeaderboardShell>
  );
}
