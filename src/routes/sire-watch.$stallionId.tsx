import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/platform/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ArrowLeft, TrendingUp, Zap } from "lucide-react";
import {
  getSireAnalytics,
  type SireClassification,
} from "@/domains/breeding/application/breedingFacade";
import { JargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";

export const Route = createFileRoute("/sire-watch/$stallionId")({
  component: SireProfilePage,
});

function SireProfilePage() {
  const { stallionId } = Route.useParams();
  const horses = useGame((s) => s.horses);

  const stallion = horses[stallionId];
  const allStallions = Object.values(horses).filter((h) => h.stud?.atStud);
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
            <h3 className="text-lg font-semibold mb-2 text-foreground">Stallion Not Found</h3>
            <p className="text-sm text-muted-foreground">
              This stallion is not currently at stud or does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analytics = getSireAnalytics(stallion, Object.values(horses), industryMeanEarnings, horses);

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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <BookmarkButton
          type="sire"
          id={stallion.id}
          label={stallion.name}
          subtitle={`Sire · ${analytics.classification}`}
          variant="full"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl text-foreground">{stallion.name}</CardTitle>
                <Badge
                  variant="secondary"
                  className={getClassificationColor(analytics.classification)}
                >
                  {analytics.classification.charAt(0).toUpperCase() +
                    analytics.classification.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <JargonTooltip term="Bloodline">Bloodline</JargonTooltip>:{" "}
                {stallion.bloodline || "Unknown"} · Age {stallion.age}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold text-foreground">
                  {analytics.aei.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">AEI</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">CI</p>
              <p className="text-2xl font-bold text-foreground">{analytics.ci.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Win %</p>
              <p className="text-2xl font-bold text-foreground">
                {analytics.progenyWinPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Stakes Winners</p>
              <p className="text-2xl font-bold text-foreground">{analytics.lifetimeStakesFoals}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">G1 Winners</p>
              <p className="text-2xl font-bold text-foreground">{analytics.lifetimeG1Foals}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Standing Fee</p>
              <p className="text-xl font-bold text-foreground">
                ${analytics.standingFee.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Book Size</p>
              <p className="text-xl font-bold text-foreground">{stallion.stud.bookSize} mares</p>
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
            <h3 className="text-lg font-semibold mb-2 text-foreground">Produce Record</h3>
            <p className="text-sm text-muted-foreground">
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
