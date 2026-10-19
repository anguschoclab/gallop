import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  TrophyCase,
  TrophyStats,
  CeremonyInvitations,
  InvitationHistoryPanel,
  G1WinnerHistory,
} from "@/domains/awards/ui";
import { Badge } from "@/shared/ui/badge";
import { useAwardsData } from "@/domains/awards/application/hooks/useAwardsData";
import {
  REGION_AWARD_NAMES,
  REGIONAL_CONFIGS,
  CATEGORY_DESCRIPTIONS,
} from "@/domains/awards/application/awardsFacade";
import { REGION_COLOR_CLASSES } from "@/domains/awards/ui/assets";
import { Trophy, Calendar, Star } from "lucide-react";

export function AwardsTab() {
  const {
    day,
    invitations,
    playerAwards,
    awardsByRegion,
    totalAwards,
    hotyCount,
    currentYearAwards,
    pendingAwardCeremonies,
    currentCeremonyIndex,
  } = useAwardsData();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground font-[family-name:var(--font-display)]">
            <Trophy className="w-6 h-6 text-primary" />
            Awards
          </h2>
          <p className="text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
            Regional horse racing awards and championships
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-muted text-foreground flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {totalAwards} Total
          </Badge>
          {hotyCount > 0 && (
            <Badge className="bg-fame text-background border-fame flex items-center gap-1">
              <Star className="w-3 h-3" />
              {hotyCount} HOTY
            </Badge>
          )}
          {currentYearAwards > 0 && (
            <Badge
              variant="outline"
              className="border-border text-foreground flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              {currentYearAwards} This Year
            </Badge>
          )}
        </div>
      </div>

      <TrophyStats awards={playerAwards} />

      {pendingAwardCeremonies.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-primary">
                {pendingAwardCeremonies.length} Pending Award Ceremony
                {pendingAwardCeremonies.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-primary/70">
                {currentCeremonyIndex !== undefined
                  ? `Currently processing ceremony ${currentCeremonyIndex + 1} of ${pendingAwardCeremonies.length}`
                  : "Awaiting ceremony processing"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <CeremonyInvitations invitations={invitations} day={day} />

      <InvitationHistoryPanel invitations={invitations} awards={playerAwards} day={day} />

      <AwardScheduleCard awardsByRegion={awardsByRegion} />

      <G1WinnerHistory />

      <TrophyCase awards={playerAwards} variant="full" sortBy="year" />

      <AboutAwardsCard />
    </div>
  );
}

function AwardScheduleCard({ awardsByRegion }: { awardsByRegion: Record<string, unknown[]> }) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)]">
          Award Ceremony Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className={REGION_COLOR_CLASSES.north_america}>
            <div className="font-semibold text-foreground">{REGION_AWARD_NAMES.north_america}</div>
            <div className="text-sm text-foreground">
              Dec 31 (Day {REGIONAL_CONFIGS.north_america.ceremonyDay})
            </div>
            <div className="text-sm text-muted-foreground">
              {awardsByRegion.north_america.length} awards
            </div>
          </div>
          <div className={REGION_COLOR_CLASSES.europe}>
            <div className="font-semibold text-foreground">{REGION_AWARD_NAMES.europe}</div>
            <div className="text-sm text-foreground">
              Nov 10 (Day {REGIONAL_CONFIGS.europe.ceremonyDay})
            </div>
            <div className="text-sm text-muted-foreground">
              {awardsByRegion.europe.length} awards
            </div>
          </div>
          <div className={REGION_COLOR_CLASSES.asia_pacific}>
            <div className="font-semibold text-foreground">{REGION_AWARD_NAMES.asia_pacific}</div>
            <div className="text-sm text-foreground">
              Jul 31 (Day {REGIONAL_CONFIGS.asia_pacific.ceremonyDay})
            </div>
            <div className="text-sm text-muted-foreground">
              {awardsByRegion.asia_pacific.length} awards
            </div>
          </div>
          <div className={REGION_COLOR_CLASSES.south_america}>
            <div className="font-semibold text-foreground">{REGION_AWARD_NAMES.south_america}</div>
            <div className="text-sm text-foreground">
              Apr 30 (Day {REGIONAL_CONFIGS.south_america.ceremonyDay})
            </div>
            <div className="text-sm text-muted-foreground">
              {awardsByRegion.south_america.length} awards
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AboutAwardsCard() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)]">
          About Regional Awards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Awards are given annually based on performance in graded stakes races. Each region has its
          own award ceremony date and categories inspired by real-world horse racing awards.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">
              North America (Eclipse Awards)
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Horse of the Year</li>
              <li>• Champion 2YO, 3YO (Male/Female)</li>
              <li>• Champion Older Dirt (Male/Female)</li>
              <li>• Champion Sprint, Turf categories</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">Europe (Cartier Awards)</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Horse of the Year</li>
              <li>• Champion 2YO, 3YO (Colt/Filly)</li>
              <li>• Champion Older Horse (Combined)</li>
              <li>• Champion Sprinter, Stayer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">
              Asia-Pacific (Australian Awards)
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Racehorse of the Year</li>
              <li>• Champion 2YO, 3YO (Combined)</li>
              <li>• Champion Middle Distance</li>
              <li>• Champion International Performer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">
              South America (Gran Premio)
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Horse of the Year</li>
              <li>• Potrillo/Potranca del Año</li>
              <li>• Campeón 3YO categories</li>
              <li>• Campeón Velocidad, Fondo</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/30">
          <h4 className="font-semibold text-sm mb-2 text-foreground">
            Award Category Descriptions
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(CATEGORY_DESCRIPTIONS).map(([key, desc]) => (
              <div key={key} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{key.replace(/_/g, " ")}</span>
                {" — "}
                {desc}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
