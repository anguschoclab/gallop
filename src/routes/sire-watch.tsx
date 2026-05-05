import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Filter } from "lucide-react";
import { getSireAnalytics, type SireClassification, classifySire } from "@/core/breeding/sireAnalytics";

export const Route = createFileRoute("/sire-watch/")({
  component: SireWatchPage,
});

function SireWatchPage() {
  const horses = useGame((s) => s.horses);
  
  // Get all stallions at stud
  const stallions = horses.filter((h) => h.stud?.atStud);
  const sireAnalytics = stallions.map((s) => getSireAnalytics(s, stallions));
  
  // Sort by AEI (descending)
  const sortedSires = sireAnalytics.sort((a, b) => b.aei - a.aei);

  const getClassificationColor = (classification: SireClassification) => {
    switch (classification) {
      case "elite": return "bg-purple-500";
      case "premium": return "bg-blue-500";
      case "solid": return "bg-emerald-500";
      case "developing": return "bg-amber-500";
      case "unproven": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sire Watch</h1>
          <p className="text-muted-foreground">Analytics and performance metrics for active stallions.</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {sortedSires.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stallions at Stud</h3>
            <p className="text-sm text-muted-foreground">
              Retire horses to stud to begin tracking sire analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedSires.map((analytics) => (
            <Card key={analytics.stallionId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{analytics.stallionName}</CardTitle>
                      <Badge 
                        variant="secondary" 
                        className={getClassificationColor(analytics.classification)}
                      >
                        {analytics.classification.charAt(0).toUpperCase() + analytics.classification.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Standing Fee: ${analytics.standingFee.toLocaleString()} · {analytics.lifetimeFoals} Foals
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{analytics.aei.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">AEI</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">CI</p>
                    <p className="font-semibold">{analytics.ci.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Win %</p>
                    <p className="font-semibold">{analytics.progenyWinPercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stakes Winners</p>
                    <p className="font-semibold">{analytics.lifetimeStakesFoals}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">G1 Winners</p>
                    <p className="font-semibold">{analytics.lifetimeG1Foals}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline">{analytics.surfaceBias}</Badge>
                    <Badge variant="outline">{analytics.distancePreference}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => window.location.href = `/sire-watch/${analytics.stallionId}`}>
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
