import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";
import {
  getSireAnalytics,
  type SireClassification,
} from "@/core/breeding/sireAnalytics";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/hooks/leaderboard/useLeaderboardControls";

const SORT_OPTIONS = [
  { value: "aei", label: "AEI" },
  { value: "ci", label: "CI" },
  { value: "winPct", label: "Win %" },
  { value: "stakes", label: "Stakes Winners" },
  { value: "g1", label: "G1 Winners" },
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

type SireAnalyticsWithId = ReturnType<typeof getSireAnalytics>;

const SORT_FNS: Record<string, (a: SireAnalyticsWithId, b: SireAnalyticsWithId) => number> = {
  aei: (a, b) => b.aei - a.aei,
  ci: (a, b) => b.ci - a.ci,
  winPct: (a, b) => b.progenyWinPercentage - a.progenyWinPercentage,
  stakes: (a, b) => b.lifetimeStakesFoals - a.lifetimeStakesFoals,
  g1: (a, b) => b.lifetimeG1Foals - a.lifetimeG1Foals,
  fee: (a, b) => b.standingFee - a.standingFee,
};

const FILTER_FNS: Record<string, (item: SireAnalyticsWithId) => boolean> = {
  all: () => true,
  elite: (s) => s.classification === "elite",
  premium: (s) => s.classification === "premium",
  solid: (s) => s.classification === "solid",
  developing: (s) => s.classification === "developing",
  unproven: (s) => s.classification === "unproven",
};

export function SireWatchTab() {
  const navigate = useNavigate();
  const horses = useGame((s) => s.horses);
  const industryMeanEarnings = useGame((s) => s.industryMeanEarnings ?? 0);

  const stallions = Object.values(horses).filter((h) => h.stud?.atStud);
  const horseList = Object.values(horses);
  const sireAnalytics = stallions.map((s) => getSireAnalytics(s, horseList, industryMeanEarnings));

  const { sortValue, setSortValue, filterValue, setFilterValue, processed } = useLeaderboardControls<SireAnalyticsWithId>({
    items: sireAnalytics,
    sortOptions: SORT_OPTIONS,
    filterOptions: FILTER_OPTIONS,
    sortFns: SORT_FNS,
    filterFns: FILTER_FNS,
    defaultSort: "aei",
    defaultFilter: "all",
  });

  const getClassificationColor = (classification: SireClassification) => {
    switch (classification) {
      case "elite":
        return "bg-fame text-t950";
      case "premium":
        return "bg-info text-t950";
      case "solid":
        return "bg-success text-t950";
      case "developing":
        return "bg-warning text-t950";
      case "unproven":
        return "bg-t600 text-cream";
      default:
        return "bg-t600 text-cream";
    }
  };

  if (!horses) {
    return (
      <div className="space-y-6">
        <LeaderboardHeading title="Sire Watch" description="Analytics and performance metrics for active stallions." />
        <LeaderboardSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeaderboardHeading
        title="Sire Watch"
        description="Analytics and performance metrics for active stallions."
      />

      {sireAnalytics.length === 0 ? (
        <LeaderboardEmpty message="No stallions at stud. Retire horses to stud to begin tracking sire analytics." />
      ) : (
        <>
          <LeaderboardControlsBar
            sortOptions={SORT_OPTIONS}
            sortValue={sortValue}
            onSortChange={setSortValue}
            filterOptions={FILTER_OPTIONS}
            filterValue={filterValue}
            onFilterChange={setFilterValue}
          />
          <div className="grid gap-4">
            {processed.map((analytics) => (
              <Card
                key={analytics.stallionId}
                className="hover:shadow-md transition-shadow border-gold-muted"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base sm:text-lg text-cream font-[family-name:var(--font-display)] truncate">
                          {analytics.stallionName}
                        </CardTitle>
                        <Badge className={getClassificationColor(analytics.classification)}>
                          {analytics.classification.charAt(0).toUpperCase() +
                            analytics.classification.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-cream-muted">
                        Standing Fee: ${analytics.standingFee.toLocaleString()} ·{" "}
                        {analytics.lifetimeFoals} Foals
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-cream-muted" />
                        <span className="text-xl sm:text-2xl font-bold tabular-nums text-cream">
                          {analytics.aei.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-cream-muted">AEI</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                    <div>
                      <p className="text-cream-muted">CI</p>
                      <p className="font-semibold text-cream">{analytics.ci.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-cream-muted">Win %</p>
                      <p className="font-semibold text-cream">
                        {analytics.progenyWinPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-cream-muted">Stakes Winners</p>
                      <p className="font-semibold text-cream">{analytics.lifetimeStakesFoals}</p>
                    </div>
                    <div>
                      <p className="text-cream-muted">G1 Winners</p>
                      <p className="font-semibold text-cream">{analytics.lifetimeG1Foals}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gold-muted flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-gold-muted text-cream">
                        {analytics.surfaceBias}
                      </Badge>
                      <Badge variant="outline" className="border-gold-muted text-cream">
                        {analytics.distancePreference}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate({
                          to: "/sire-watch/$stallionId",
                          params: { stallionId: analytics.stallionId },
                        })
                      }
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
