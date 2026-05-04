import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyCase, TrophyStats } from "@/components/awards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { REGION_AWARD_NAMES, REGION_DISPLAY_NAMES, CATEGORY_DISPLAY_NAMES } from "@/game/awards/types";
import { REGION_COLOR_CLASSES } from "@/assets/awards";
import { Trophy, Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/awards")({
  component: AwardsPage,
});

function AwardsPage() {
  const awards = useGame((s) => s.awards ?? []);
  const day = useGame((s) => s.day);
  const year = Math.floor((day - 1) / 365) + 1;

  // Get player awards only
  const playerAwards = awards.filter((a) => !a.stableId);

  // Group by region
  const awardsByRegion: Record<string, typeof awards> = {
    north_america: [],
    europe: [],
    asia_pacific: [],
    south_america: [],
  };

  for (const award of playerAwards) {
    awardsByRegion[award.region].push(award);
  }

  // Stats
  const totalAwards = playerAwards.length;
  const hotyCount = playerAwards.filter((a) => a.category === "horse_of_the_year").length;
  const currentYearAwards = playerAwards.filter((a) => a.year === year).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            Awards
          </h1>
          <p className="text-muted-foreground mt-1">
            Regional horse racing awards and championships
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {totalAwards} Total
          </Badge>
          {hotyCount > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-700 flex items-center gap-1">
              <Star className="w-3 h-3" />
              {hotyCount} HOTY
            </Badge>
          )}
          {currentYearAwards > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {currentYearAwards} This Year
            </Badge>
          )}
        </div>
      </div>

      {/* Regional Stats */}
      <TrophyStats awards={playerAwards} />

      {/* Award Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Award Ceremony Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className={REGION_COLOR_CLASSES.north_america}>
              <div className="font-semibold">{REGION_AWARD_NAMES.north_america}</div>
              <div className="text-sm">Dec 31 (Day 365)</div>
              <div className="text-sm text-muted-foreground">
                {awardsByRegion.north_america.length} awards
              </div>
            </div>
            <div className={REGION_COLOR_CLASSES.europe}>
              <div className="font-semibold">{REGION_AWARD_NAMES.europe}</div>
              <div className="text-sm">Nov 10 (Day 314)</div>
              <div className="text-sm text-muted-foreground">
                {awardsByRegion.europe.length} awards
              </div>
            </div>
            <div className={REGION_COLOR_CLASSES.asia_pacific}>
              <div className="font-semibold">{REGION_AWARD_NAMES.asia_pacific}</div>
              <div className="text-sm">Jul 31 (Day 212)</div>
              <div className="text-sm text-muted-foreground">
                {awardsByRegion.asia_pacific.length} awards
              </div>
            </div>
            <div className={REGION_COLOR_CLASSES.south_america}>
              <div className="font-semibold">{REGION_AWARD_NAMES.south_america}</div>
              <div className="text-sm">Apr 30 (Day 120)</div>
              <div className="text-sm text-muted-foreground">
                {awardsByRegion.south_america.length} awards
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trophy Case */}
      <TrophyCase
        awards={playerAwards}
        variant="full"
        sortBy="year"
      />

      {/* Award Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Regional Awards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Awards are given annually based on performance in graded stakes races. 
            Each region has its own award ceremony date and categories inspired by 
            real-world horse racing awards.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2">North America (Eclipse Awards)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Horse of the Year</li>
                <li>• Champion 2YO, 3YO (Male/Female)</li>
                <li>• Champion Older Dirt (Male/Female)</li>
                <li>• Champion Sprint, Turf categories</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Europe (Cartier Awards)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Horse of the Year</li>
                <li>• Champion 2YO, 3YO (Colt/Filly)</li>
                <li>• Champion Older Horse (Combined)</li>
                <li>• Champion Sprinter, Stayer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Asia-Pacific (Australian Awards)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Racehorse of the Year</li>
                <li>• Champion 2YO, 3YO (Combined)</li>
                <li>• Champion Middle Distance</li>
                <li>• Champion International Performer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">South America (Gran Premio)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
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
