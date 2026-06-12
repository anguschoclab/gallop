import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AwardsGrid } from "./AwardsGrid";
import { groupByRegion } from "./awardUtils";
import type { AwardRegion, RegionalAward } from "@/core/awards/types";
import { REGION_AWARD_NAMES, REGION_DISPLAY_NAMES } from "@/core/awards/types";
import { Trophy, Medal, Star } from "lucide-react";

interface TrophyFullViewProps {
  awards: RegionalAward[];
  ownerName?: string;
  totalAwards: number;
  hotyCount: number;
  filterByRegion?: AwardRegion;
  sortBy?: "year" | "category" | "region";
  className?: string;
}

export function TrophyFullView({
  awards,
  ownerName,
  totalAwards,
  hotyCount,
  filterByRegion,
  sortBy = "year",
  className,
}: TrophyFullViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<AwardRegion | "all">(
    filterByRegion || "all",
  );

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

  const awardsByRegion = groupByRegion(sortedAwards);

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
