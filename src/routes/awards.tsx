import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyCase, TrophyStats } from "@/components/awards";
import { Badge } from "@/components/ui/badge";
import { useAwardsData } from "@/hooks/awards/useAwardsData";
import { REGION_AWARD_NAMES } from "@/core/awards/types";
import { REGION_COLOR_CLASSES } from "@/assets/awards";
import { Trophy, Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/awards")({
  component: AwardsPage,
});

function AwardsPage() {
  const { year, playerAwards, awardsByRegion, totalAwards, hotyCount, currentYearAwards } =
    useAwardsData();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
            <Trophy className="w-8 h-8 text-gold" />
            Awards
          </h1>
          <p className="text-cream-muted mt-1 font-[family-name:var(--font-body)]">
            Regional horse racing awards and championships
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-t700 text-cream flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {totalAwards} Total
          </Badge>
          {hotyCount > 0 && (
            <Badge className="bg-fame text-t950 border-fame flex items-center gap-1">
              <Star className="w-3 h-3" />
              {hotyCount} HOTY
            </Badge>
          )}
          {currentYearAwards > 0 && (
            <Badge
              variant="outline"
              className="border-gold-muted text-cream flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              {currentYearAwards} This Year
            </Badge>
          )}
        </div>
      </div>

      {/* Regional Stats */}
      <TrophyStats awards={playerAwards} />

      {/* Award Schedule Info */}
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
            Award Ceremony Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className={REGION_COLOR_CLASSES.north_america}>
              <div className="font-semibold text-cream">{REGION_AWARD_NAMES.north_america}</div>
              <div className="text-sm text-cream">Dec 31 (Day 365)</div>
              <div className="text-sm text-cream-muted">
                {awardsByRegion.north_america.length} awards
              </div>
            </div>
            <div className={REGION_COLOR_CLASSES.europe}>
              <div className="font-semibold text-cream">{REGION_AWARD_NAMES.europe}</div>
              <div className="text-sm text-cream">Nov 10 (Day 314)</div>
              <div className="text-sm text-cream-muted">{awardsByRegion.europe.length} awards</div>
            </div>
            <div className={REGION_COLOR_CLASSES.asia_pacific}>
              <div className="font-semibold text-cream">{REGION_AWARD_NAMES.asia_pacific}</div>
              <div className="text-sm text-cream">Jul 31 (Day 212)</div>
              <div className="text-sm text-cream-muted">
                {awardsByRegion.asia_pacific.length} awards
              </div>
            </div>
            <div className={REGION_COLOR_CLASSES.south_america}>
              <div className="font-semibold text-cream">{REGION_AWARD_NAMES.south_america}</div>
              <div className="text-sm text-cream">Apr 30 (Day 120)</div>
              <div className="text-sm text-cream-muted">
                {awardsByRegion.south_america.length} awards
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trophy Case */}
      <TrophyCase awards={playerAwards} variant="full" sortBy="year" />

      {/* Award Categories Info */}
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
            About Regional Awards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-cream-muted">
            Awards are given annually based on performance in graded stakes races. Each region has
            its own award ceremony date and categories inspired by real-world horse racing awards.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-cream">
                North America (Eclipse Awards)
              </h4>
              <ul className="text-sm text-cream-muted space-y-1">
                <li>• Horse of the Year</li>
                <li>• Champion 2YO, 3YO (Male/Female)</li>
                <li>• Champion Older Dirt (Male/Female)</li>
                <li>• Champion Sprint, Turf categories</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-cream">Europe (Cartier Awards)</h4>
              <ul className="text-sm text-cream-muted space-y-1">
                <li>• Horse of the Year</li>
                <li>• Champion 2YO, 3YO (Colt/Filly)</li>
                <li>• Champion Older Horse (Combined)</li>
                <li>• Champion Sprinter, Stayer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-cream">
                Asia-Pacific (Australian Awards)
              </h4>
              <ul className="text-sm text-cream-muted space-y-1">
                <li>• Racehorse of the Year</li>
                <li>• Champion 2YO, 3YO (Combined)</li>
                <li>• Champion Middle Distance</li>
                <li>• Champion International Performer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-cream">South America (Gran Premio)</h4>
              <ul className="text-sm text-cream-muted space-y-1">
                <li>• Horse of the Year</li>
                <li>• Potrillo/Potranca del Año</li>
                <li>• Campeón 3YO categories</li>
                <li>• Campeón Velocidad, Fondo</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
