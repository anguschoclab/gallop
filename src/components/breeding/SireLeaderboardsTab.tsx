import { useGame } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Award, DollarSign, TrendingUp, Globe } from "lucide-react";
import type { LeaderboardType, Leaderboard, SireRanking } from "@/core/breeding/leaderboardTypes";
import {
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardRow,
  LeaderboardShell,
} from "@/components/leaderboard/LeaderboardPrimitives";

export function SireLeaderboardsTab() {
  const leaderboards = useGame((s) => s.sireLeaderboards);

  if (!leaderboards) {
    return (
      <LeaderboardEmpty message="Leaderboards will be available after the first week of gameplay." />
    );
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

      <Tabs defaultValue="overall">
        <TabsList className="grid w-full grid-cols-7">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsContent key={tab.key} value={tab.key}>
              <LeaderboardView leaderboard={leaderboards[tab.key]} icon={<Icon className="h-4 w-4 text-primary" />} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function LeaderboardView({ leaderboard, icon }: { leaderboard: Leaderboard; icon: React.ReactNode }) {
  if (!leaderboard || leaderboard.rankings.length === 0) {
    return <LeaderboardEmpty message="No rankings available yet." />;
  }

  return (
    <LeaderboardShell title={leaderboard.title} description={leaderboard.description} icon={icon}>
      {leaderboard.rankings.map((ranking: SireRanking) => (
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
