import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Filter } from "lucide-react";
import {
  getSireAnalytics,
  type SireClassification,
  classifySire,
} from "@/core/breeding/sireAnalytics";

export const Route = createFileRoute("/sire-watch 2")({
  component: SireWatchPage,
});

function SireWatchPage() {
  const horses = useGame((s) => s.horses);
  const industryMeanEarnings = useGame((s) => s.industryMeanEarnings ?? 0);

  // Get all stallions at stud
  const stallions = horses.filter((h) => h.stud?.atStud);
  const sireAnalytics = stallions.map((s) => getSireAnalytics(s, horses, industryMeanEarnings));

  // Sort by AEI (descending)
  const sortedSires = sireAnalytics.sort((a, b) => b.aei - a.aei);

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
            Sire Watch
          </h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">
            Analytics and performance metrics for active stallions.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {sortedSires.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-cream-muted mb-4" />
            <h3 className="text-lg font-semibold text-cream mb-2">No Stallions at Stud</h3>
            <p className="text-sm text-cream-muted">
              Retire horses to stud to begin tracking sire analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedSires.map((analytics) => (
            <Card
              key={analytics.stallionId}
              className="hover:shadow-md transition-shadow border-gold-muted"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg text-cream font-[family-name:var(--font-display)]">
                        {analytics.stallionName}
                      </CardTitle>
                      <Badge className={getClassificationColor(analytics.classification)}>
                        {analytics.classification.charAt(0).toUpperCase() +
                          analytics.classification.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-cream-muted">
                      Standing Fee: ${analytics.standingFee.toLocaleString()} ·{" "}
                      {analytics.lifetimeFoals} Foals
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-cream-muted" />
                      <span className="text-2xl font-bold tabular-nums text-cream">
                        {analytics.aei.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-cream-muted">AEI</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
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
                <div className="mt-3 pt-3 border-t border-gold-muted flex justify-between items-center">
                  <div className="flex gap-2">
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
                    onClick={() => (window.location.href = `/sire-watch/${analytics.stallionId}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
