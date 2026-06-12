import { TrophyCompactView } from "./TrophyCompactView";
import { TrophyWallView } from "./TrophyWallView";
import { TrophyFullView } from "./TrophyFullView";
import { groupByRegion } from "./awardUtils";
import { cn } from "@/lib/cn";
import type { AwardRegion, RegionalAward } from "@/core/awards/types";

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
  const totalAwards = awards.length;
  const hotyCount = awards.filter((a) => a.category === "horse_of_the_year").length;

  if (variant === "compact") {
    return <TrophyCompactView awards={awards} totalAwards={totalAwards} className={className} />;
  }

  if (variant === "wall") {
    return (
      <TrophyWallView
        awards={awards}
        ownerName={ownerName}
        totalAwards={totalAwards}
        hotyCount={hotyCount}
        className={className}
      />
    );
  }

  return (
    <TrophyFullView
      awards={awards}
      ownerName={ownerName}
      totalAwards={totalAwards}
      hotyCount={hotyCount}
      filterByRegion={filterByRegion}
      sortBy={sortBy}
      className={className}
    />
  );
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
