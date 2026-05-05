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
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Stallion Not Found</h3>
            <p className="text-sm text-muted-foreground">
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
      <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl">{stallion.name}</CardTitle>
                <Badge 
                  variant="secondary" 
                  className={getClassificationColor(analytics.classification)}
                >
                  {analytics.classification.charAt(0).toUpperCase() + analytics.classification.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Bloodline: {stallion.bloodline || "Unknown"} · Age {stallion.age}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">{analytics.aei.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">AEI</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">CI</p>
              <p className="text-2xl font-bold">{analytics.ci.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Win %</p>
              <p className="text-2xl font-bold">{analytics.progenyWinPercentage.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Stakes Winners</p>
              <p className="text-2xl font-bold">{analytics.lifetimeStakesFoals}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">G1 Winners</p>
              <p className="text-2xl font-bold">{analytics.lifetimeG1Foals}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Standing Fee</p>
              <p className="text-xl font-bold">${analytics.standingFee.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Book Size</p>
              <p className="text-xl font-bold">{stallion.stud.bookSize} mares</p>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Progeny Preferences</p>
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
            <h3 className="text-lg font-semibold mb-2">Produce Record</h3>
            <p className="text-sm text-muted-foreground">
              {analytics.lifetimeFoals} total foals · {analytics.lifetimeStakesFoals} stakes winners ({analytics.progenyWinPercentage.toFixed(1)}%) · {analytics.lifetimeG1Foals} Group 1 winners
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
