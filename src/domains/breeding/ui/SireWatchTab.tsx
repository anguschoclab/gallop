import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/platform/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { TrendingUp } from "lucide-react";
import {
  getSireAnalytics,
  type SireClassification,
} from "@/domains/breeding/application/breedingFacade";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardHeading,
  LeaderboardSkeleton,
} from "@/domains/leaderboard/ui/LeaderboardPrimitives";
import { useLeaderboardControls } from "@/domains/leaderboard/application/hooks/useLeaderboardControls";

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
  const sireAnalytics = stallions.map((s) =>
    getSireAnalytics(s, horseList, industryMeanEarnings, horses),
  );

  const { sortValue, setSortValue, filterValue, setFilterValue, processed } =
    useLeaderboardControls<SireAnalyticsWithId>({
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
        return "bg-fame text-background";
      case "premium":
        return "bg-info text-background";
      case "solid":
        return "bg-success text-background";
      case "developing":
        return "bg-warning text-background";
      case "unproven":
        return "bg-surface-hover text-foreground";
      default:
        return "bg-surface-hover text-foreground";
    }
  };

  if (!horses) {
    return (
      <div className="space-y-6">
        <LeaderboardHeading
          title="Sire Watch"
          description="Analytics and performance metrics for active stallions."
        />
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
                className="hover:shadow-md transition-shadow border-border"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base sm:text-lg text-foreground font-[family-name:var(--font-display)] truncate">
                          {analytics.stallionName}
                        </CardTitle>
                        <Badge className={getClassificationColor(analytics.classification)}>
                          {analytics.classification.charAt(0).toUpperCase() +
                            analytics.classification.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Standing Fee: ${analytics.standingFee.toLocaleString()} ·{" "}
                        {analytics.lifetimeFoals} Foals
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                          {analytics.aei.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">AEI</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">CI</p>
                      <p className="font-semibold text-foreground">{analytics.ci.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Win %</p>
                      <p className="font-semibold text-foreground">
                        {analytics.progenyWinPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stakes Winners</p>
                      <p className="font-semibold text-foreground">
                        {analytics.lifetimeStakesFoals}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">G1 Winners</p>
                      <p className="font-semibold text-foreground">{analytics.lifetimeG1Foals}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-border text-foreground">
                        {analytics.surfaceBias}
                      </Badge>
                      <Badge variant="outline" className="border-border text-foreground">
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
