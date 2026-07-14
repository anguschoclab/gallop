import { useGame } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Award, DollarSign, TrendingUp, Globe } from "lucide-react";
import type { LeaderboardType, Leaderboard, SireRanking } from "@/core/breeding/leaderboardTypes";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";
import { useTabShimmer } from "@/hooks/leaderboard/useTabShimmer";
import { useState } from "react";

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "aei", label: "AEI" },
  { value: "ci", label: "CI" },
  { value: "stakes", label: "Stakes Foals" },
  { value: "g1", label: "G1 Foals" },
  { value: "fee", label: "Standing Fee" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "elite", label: "Elite" },
  { value: "premium", label: "Premium" },
  { value: "solid", label: "Solid" },
  { value: "developing", label: "Developing" },
  { value: "unproven", label: "Unproven" },
];

const SORT_FNS: Record<string, (a: SireRanking, b: SireRanking) => number> = {
  score: (a, b) => b.value - a.value,
  aei: (a, b) => b.metrics.aei - a.metrics.aei,
  ci: (a, b) => b.metrics.ci - a.metrics.ci,
  stakes: (a, b) => b.metrics.lifetimeStakesFoals - a.metrics.lifetimeStakesFoals,
  g1: (a, b) => b.metrics.lifetimeG1Foals - a.metrics.lifetimeG1Foals,
  fee: (a, b) => b.metrics.standingFee - a.metrics.standingFee,
};

const FILTER_FNS: Record<string, (item: SireRanking) => boolean> = {
  all: () => true,
  elite: (r) => r.metrics.classification === "elite",
  premium: (r) => r.metrics.classification === "premium",
  solid: (r) => r.metrics.classification === "solid",
  developing: (r) => r.metrics.classification === "developing",
  unproven: (r) => r.metrics.classification === "unproven",
};

export function SireLeaderboardsTab() {
  const leaderboards = useGame((s) => s.sireLeaderboards);
  const [activeTab, setActiveTab] = useState<string>("overall");
  const isShimmering = useTabShimmer(activeTab);

  if (!leaderboards) {
    return <LeaderboardSkeleton rows={5} />;
  }

  const tabs: {
    key: LeaderboardType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "overall", label: "Overall", icon: Trophy },
    { key: "ci", label: "Comparable Index", icon: Target },
    { key: "stakes_producers", label: "Stakes Producers", icon: Award },
    { key: "g1_producers", label: "G1 Producers", icon: Award },
    { key: "turf_specialists", label: "Turf Specialists", icon: Target },
    { key: "dirt_specialists", label: "Dirt Specialists", icon: Target },
    { key: "sprint_sires", label: "Sprint Sires", icon: TrendingUp },
    { key: "staying_sires", label: "Staying Sires", icon: TrendingUp },
    { key: "value_sires", label: "Value Sires", icon: DollarSign },
    { key: "freshman_watch", label: "Freshman Watch", icon: TrendingUp },
    { key: "rising_stars", label: "Rising Stars", icon: TrendingUp },
    { key: "regional_north", label: "Northern Hemisphere", icon: Globe },
    { key: "regional_south", label: "Southern Hemisphere", icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <LeaderboardHeading
        title="Sire Leaderboards"
        description="Track stallion performance across multiple dimensions. Updated weekly."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="min-w-max">
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsContent key={tab.key} value={tab.key}>
              {isShimmering ? (
                <LeaderboardSkeleton rows={5} />
              ) : (
                <LeaderboardView
                  leaderboard={leaderboards[tab.key]}
                  icon={<Icon className="h-4 w-4 text-primary" />}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function LeaderboardView({ leaderboard, icon }: { leaderboard: Leaderboard; icon: React.ReactNode }) {
  const { sortValue, setSortValue, filterValue, setFilterValue, processed } = useLeaderboardControls<SireRanking>({
    items: leaderboard?.rankings ?? [],
    sortOptions: SORT_OPTIONS,
    filterOptions: FILTER_OPTIONS,
    sortFns: SORT_FNS,
    filterFns: FILTER_FNS,
    defaultSort: "score",
    defaultFilter: "all",
  });

  if (!leaderboard || leaderboard.rankings.length === 0) {
    return <LeaderboardEmpty message="No rankings available yet." />;
  }

  return (
    <LeaderboardShell title={leaderboard.title} description={leaderboard.description} icon={icon}>
      <LeaderboardControlsBar
        sortOptions={SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
        filterOptions={FILTER_OPTIONS}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
      />
      {processed.map((ranking: SireRanking) => (
        <LeaderboardRow
          key={ranking.stallionId}
          rank={ranking.rank}
          name={ranking.stallionName}
          meta={`AEI: ${ranking.metrics.aei.toFixed(1)} · CI: ${ranking.metrics.ci.toFixed(1)} · ${ranking.metrics.lifetimeStakesFoals} Stakes · ${ranking.metrics.lifetimeG1Foals} G1`}
          value={ranking.value.toFixed(1)}
        />
      ))}
    </LeaderboardShell>
  );
}
