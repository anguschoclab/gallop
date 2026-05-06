import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Award, DollarSign, TrendingUp, Globe } from "lucide-react";
import type { LeaderboardType } from "@/core/breeding/leaderboardTypes";

export const Route = createFileRoute("/sire-leaderboards 2")({
  component: SireLeaderboardsPage,
});

function SireLeaderboardsPage() {
  const leaderboards = useGame((s) => s.sireLeaderboards);

  if (!leaderboards) {
    return (
      <Card className="border-gold-muted">
        <CardContent className="p-12 text-center">
          <p className="text-cream-muted">
            Leaderboards will be available after the first week of gameplay.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tabs: { key: LeaderboardType; label: string; icon: any }[] = [
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Sire Leaderboards
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Track stallion performance across multiple dimensions. Updated weekly.
        </p>
      </div>

      <Tabs defaultValue="overall">
        <TabsList className="grid w-full grid-cols-7">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <LeaderboardView leaderboard={leaderboards[tab.key]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LeaderboardView({ leaderboard }: { leaderboard: any }) {
  if (!leaderboard || leaderboard.rankings.length === 0) {
    return (
      <Card className="border-gold-muted">
        <CardContent className="p-12 text-center">
          <p className="text-cream-muted">No rankings available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-cream font-[family-name:var(--font-display)]">
          {leaderboard.title}
        </CardTitle>
        <p className="text-sm text-cream-muted">{leaderboard.description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.rankings.map((ranking: any) => (
            <div
              key={ranking.stallionId}
              className="flex items-center justify-between p-3 bg-t700 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold w-8 text-cream">#{ranking.rank}</span>
                <div>
                  <p className="font-semibold text-cream">{ranking.stallionName}</p>
                  <p className="text-sm text-cream-muted">
                    AEI: {ranking.metrics.aei.toFixed(1)} · CI: {ranking.metrics.ci.toFixed(1)} ·
                    {ranking.metrics.lifetimeStakesFoals} Stakes · {ranking.metrics.lifetimeG1Foals}{" "}
                    G1
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cream">{ranking.value.toFixed(1)}</p>
                <p className="text-xs text-cream-muted">Score</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
