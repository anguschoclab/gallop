import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, TrendingUp, Zap } from "lucide-react";
import { getSireAnalytics, type SireClassification } from "@/core/breeding/sireAnalytics";

export const Route = createFileRoute("/sire-watch/$stallionId")({
  component: SireProfilePage,
});

function SireProfilePage() {
  const { stallionId } = Route.useParams();
  const horses = useGame((s) => s.horses);

  const stallion = horses.find((h) => h.id === stallionId);
  const allStallions = horses.filter((h) => h.stud?.atStud);
  const industryMeanEarnings = useGame((s) => s.industryMeanEarnings ?? 0);

  if (!stallion || !stallion.stud?.atStud) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-cream-muted mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-cream">Stallion Not Found</h3>
            <p className="text-sm text-cream-muted">
              This stallion is not currently at stud or does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analytics = getSireAnalytics(stallion, horses, industryMeanEarnings);

  const getClassificationColor = (classification: SireClassification) => {
    switch (classification) {
      case "elite":
        return "bg-fame";
      case "premium":
        return "bg-info";
      case "solid":
        return "bg-success";
      case "developing":
        return "bg-warning";
      case "unproven":
        return "bg-muted-foreground";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl text-cream">{stallion.name}</CardTitle>
                <Badge
                  variant="secondary"
                  className={getClassificationColor(analytics.classification)}
                >
                  {analytics.classification.charAt(0).toUpperCase() +
                    analytics.classification.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-cream-muted">
                Bloodline: {stallion.bloodline || "Unknown"} · Age {stallion.age}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-cream-muted" />
                <span className="text-3xl font-bold text-cream">{analytics.aei.toFixed(1)}</span>
              </div>
              <p className="text-sm text-cream-muted">AEI</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-1">CI</p>
              <p className="text-2xl font-bold text-cream">{analytics.ci.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-1">Win %</p>
              <p className="text-2xl font-bold text-cream">
                {analytics.progenyWinPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-1">Stakes Winners</p>
              <p className="text-2xl font-bold text-cream">{analytics.lifetimeStakesFoals}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-1">G1 Winners</p>
              <p className="text-2xl font-bold text-cream">{analytics.lifetimeG1Foals}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-2">Standing Fee</p>
              <p className="text-xl font-bold text-cream">
                ${analytics.standingFee.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-cream-muted mb-2">Book Size</p>
              <p className="text-xl font-bold text-cream">{stallion.stud.bookSize} mares</p>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-cream-muted mb-2">Progeny Preferences</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">
                Surface: {analytics.surfaceBias}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Distance: {analytics.distancePreference}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2 text-cream">Produce Record</h3>
            <p className="text-sm text-cream-muted">
              {analytics.lifetimeFoals} total foals · {analytics.lifetimeStakesFoals} stakes winners
              ({analytics.progenyWinPercentage.toFixed(1)}%) · {analytics.lifetimeG1Foals} Group 1
              winners
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
