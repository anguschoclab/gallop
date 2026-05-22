import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AwardIcon, AwardIconWithYear } from "./AwardIcon";
import { AwardBadge, AwardListItem } from "./AwardBadge";
import { cn } from "@/lib/utils";
import type { AwardRegion, RegionalAward, RegionalAwardCategory } from "@/game/awards/types";
import {
  REGION_DISPLAY_NAMES,
  REGION_AWARD_NAMES,
  CATEGORY_DISPLAY_NAMES,
} from "@/game/awards/types";
import { REGION_COLOR_CLASSES } from "@/assets/awards";
import { getRegionFlag, getRegionCountryLabel } from "@/lib/countryFlag";
import { Trophy, Medal, Star } from "lucide-react";

const COMPACT_THRESHOLD = 5;

interface TrophyCaseProps {
  awards: RegionalAward[];
  ownerName?: string;
  variant?: "compact" | "full" | "wall";
  filterByRegion?: AwardRegion;
  sortBy?: "year" | "category" | "region";
  className?: string;
}

export function TrophyCase({
  awards,
  ownerName,
  variant = "full",
  filterByRegion,
  sortBy = "year",
  className,
}: TrophyCaseProps) {
  const [selectedRegion, setSelectedRegion] = useState<AwardRegion | "all">(
    filterByRegion || "all",
  );

  // Filter and sort awards
  const filteredAwards = awards.filter((award) => {
    if (selectedRegion !== "all" && award.region !== selectedRegion) return false;
    return true;
  });

  const sortedAwards = [...filteredAwards].sort((a, b) => {
    if (sortBy === "year") return b.year - a.year;
    if (sortBy === "category") return a.category.localeCompare(b.category);
    if (sortBy === "region") return a.region.localeCompare(b.region);
    return 0;
  });

  // Group by region for display
  const awardsByRegion = groupByRegion(sortedAwards);

  // Stats
  const totalAwards = awards.length;
  const hotyCount = awards.filter((a) => a.category === "horse_of_the_year").length;
  const recentAwards = awards.filter((a) => a.year >= new Date().getFullYear() - 1).length;

  if (variant === "compact") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Trophy Case
            </CardTitle>
            <Badge variant="secondary">{totalAwards}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {totalAwards === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No awards yet. Win graded stakes to earn awards!
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedAwards.slice(0, 10).map((award) => (
                <div
                  key={award.id}
                  className="flex-shrink-0"
                  title={`${CATEGORY_DISPLAY_NAMES[award.category]} (${award.year})`}
                >
                  <AwardIconWithYear
                    region={award.region}
                    category={award.category}
                    year={award.year}
                    size="small"
                  />
                </div>
              ))}
              {totalAwards > 10 && (
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                  <span className="text-xs text-muted-foreground">+{totalAwards - 10}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (variant === "wall") {
    return (
      <div className={cn("space-y-6", className)}>
        {ownerName && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">{ownerName}</h2>
            <p className="text-muted-foreground">
              {totalAwards} awards • {hotyCount} Horse of the Year
            </p>
          </div>
        )}

        {totalAwards === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No awards yet. Compete in graded stakes to build your trophy wall!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedAwards.map((award) => (
              <div
                key={award.id}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border",
                  "bg-card hover:bg-accent/50 transition-all",
                  "hover:scale-105 cursor-pointer",
                  REGION_COLOR_CLASSES[award.region],
                )}
              >
                <AwardIcon
                  region={award.region}
                  category={award.category}
                  size="medium"
                  year={award.year}
                />
                <span className="text-xs text-center mt-2 font-medium line-clamp-2">
                  {CATEGORY_DISPLAY_NAMES[award.category]}
                </span>
                <span className="text-[10px] opacity-70">{award.year}</span>
                {award.isHistoric && <Star className="w-3 h-3 text-fame mt-1" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant with tabs
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Trophy Case
            {ownerName && <span className="text-muted-foreground">- {ownerName}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Medal className="w-3 h-3" />
              {totalAwards}
            </Badge>
            {hotyCount > 0 && (
              <Badge className="bg-fame/20 text-fame flex items-center gap-1">
                <Star className="w-3 h-3" />
                {hotyCount} HOTY
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedRegion}
          onValueChange={(v) => setSelectedRegion(v as AwardRegion | "all")}
        >
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="north_america">North America</TabsTrigger>
            <TabsTrigger value="europe">Europe</TabsTrigger>
            <TabsTrigger value="asia_pacific">Asia-Pacific</TabsTrigger>
            <TabsTrigger value="south_america">South America</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <AwardsGrid awards={sortedAwards} />
          </TabsContent>

          {(["north_america", "europe", "asia_pacific", "south_america"] as AwardRegion[]).map(
            (region) => (
              <TabsContent key={region} value={region} className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{REGION_AWARD_NAMES[region]}</h3>
                  <p className="text-sm text-muted-foreground">{REGION_DISPLAY_NAMES[region]}</p>
                </div>
                <AwardsGrid awards={awardsByRegion[region] || []} />
              </TabsContent>
            ),
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Grid display for awards
function AwardsGrid({ awards }: { awards: RegionalAward[] }) {
  if (awards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No awards in this region yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {awards.map((award) => (
        <AwardBadge key={award.id} award={award} variant="card" showRegion />
      ))}
    </div>
  );
}

// Helper functions
function groupByRegion(awards: RegionalAward[]): Record<AwardRegion, RegionalAward[]> {
  const grouped: Record<AwardRegion, RegionalAward[]> = {
    north_america: [],
    europe: [],
    asia_pacific: [],
    south_america: [],
  };

  for (const award of awards) {
    grouped[award.region].push(award);
  }

  return grouped;
}

// Summary stats component
interface TrophyStatsProps {
  awards: RegionalAward[];
  className?: string;
}

export function TrophyStats({ awards, className }: TrophyStatsProps) {
  const total = awards.length;
  const hoty = awards.filter((a) => a.category === "horse_of_the_year").length;
  const byRegion = groupByRegion(awards);

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2", className)}>
      <div className="bg-region-na-bg/30 rounded-lg p-3 text-center border border-region-na-accent/20">
        <div className="text-2xl font-bold">{byRegion.north_america.length}</div>
        <div className="text-xs text-muted-foreground">North America</div>
      </div>
      <div className="bg-region-eu-bg/30 rounded-lg p-3 text-center border border-region-eu-accent/20">
        <div className="text-2xl font-bold">{byRegion.europe.length}</div>
        <div className="text-xs text-muted-foreground">Europe</div>
      </div>
      <div className="bg-region-apac-bg/30 rounded-lg p-3 text-center border border-region-apac-accent/20">
        <div className="text-2xl font-bold">{byRegion.asia_pacific.length}</div>
        <div className="text-xs text-muted-foreground">Asia-Pacific</div>
      </div>
      <div className="bg-region-sa-bg/30 rounded-lg p-3 text-center border border-region-sa-accent/20">
        <div className="text-2xl font-bold">{byRegion.south_america.length}</div>
        <div className="text-xs text-muted-foreground">South America</div>
      </div>
    </div>
  );
}
