import { useMemo } from "react";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardRow,
  LeaderboardShell,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";
import type { Jockey } from "@/core/jockey/types";
import { getJockeyTier, JOCKEY_TIER_ORDER, JOCKEY_TIER_LABELS } from "@/core/jockey/jockeyTier";
import { ARCHETYPES } from "@/data/jockeys";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const SORT_OPTIONS = [
  { value: "wins", label: "Career Wins" },
  { value: "fame", label: "Fame" },
  { value: "winRate", label: "Win Rate" },
  { value: "potential", label: "Potential" },
  { value: "tier", label: "Tier" },
  { value: "archetype", label: "Riding Style" },
  { value: "name", label: "Name A–Z" },
];

const ARCHETYPE_ORDER: Record<string, number> = Object.fromEntries(
  ARCHETYPES.map((a, i) => [a, i]),
);

const tierBadgeClass = (tier: string): string => {
  if (tier === "elite") return "bg-fame/20 text-fame";
  if (tier === "mid") return "bg-primary/20 text-primary";
  return "bg-muted text-muted-foreground";
};

const tierLabel = (tier: string): string => JOCKEY_TIER_LABELS[tier] ?? tier;

const SORT_FNS: Record<string, (a: Jockey, b: Jockey) => number> = {
  wins: (a, b) => b.careerWins - a.careerWins,
  fame: (a, b) => b.fame - a.fame,
  winRate: (a, b) => {
    const aRate = a.careerStarts > 0 ? a.careerWins / a.careerStarts : 0;
    const bRate = b.careerStarts > 0 ? b.careerWins / b.careerStarts : 0;
    return bRate - aRate;
  },
  potential: (a, b) => b.potential - a.potential,
  tier: (a, b) => {
    const aTier = getJockeyTier(a);
    const bTier = getJockeyTier(b);
    return (JOCKEY_TIER_ORDER[bTier] ?? 0) - (JOCKEY_TIER_ORDER[aTier] ?? 0);
  },
  archetype: (a, b) => (ARCHETYPE_ORDER[a.archetype] ?? 0) - (ARCHETYPE_ORDER[b.archetype] ?? 0),
  name: (a, b) => a.name.localeCompare(b.name),
};

interface JockeyStandingsTableProps {
  jockeys: Jockey[];
}

export function JockeyStandingsTable({ jockeys }: JockeyStandingsTableProps) {
  const { sortValue, setSortValue, processed } = useLeaderboardControls<Jockey>({
    items: jockeys,
    sortOptions: SORT_OPTIONS,
    sortFns: SORT_FNS,
    defaultSort: "wins",
  });

  const winRate = useMemo(
    () => (j: Jockey) =>
      j.careerStarts > 0 ? ((j.careerWins / j.careerStarts) * 100).toFixed(1) : "0.0",
    [],
  );

  if (jockeys.length === 0) {
    return <LeaderboardEmpty message="No jockeys in standings yet." />;
  }

  return (
    <LeaderboardShell title="Jockey Standings" icon={<Users className="h-4 w-4 text-primary" />}>
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
      />
      {processed.map((jockey, index) => {
        const tier = getJockeyTier(jockey);
        return (
          <LeaderboardRow
            key={jockey.id}
            rank={index + 1}
            name={jockey.name}
            meta={`${jockey.careerWins}W / ${jockey.careerStarts}S · ${winRate(jockey)}% · ${jockey.archetype.replaceAll("_", " ").toUpperCase()}`}
            badges={
              <Badge variant="outline" className={`text-xs ${tierBadgeClass(tier)}`}>
                {tierLabel(tier)}
              </Badge>
            }
            value={jockey.careerWins}
            valueLabel="Wins"
          />
        );
      })}
    </LeaderboardShell>
  );
}
