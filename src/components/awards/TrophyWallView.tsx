import { AwardIcon } from "./AwardIcon";
import { REGION_COLOR_CLASSES } from "@/assets/awards";
import { cn } from "@/lib/utils";
import { Trophy, Star } from "lucide-react";
import type { RegionalAward } from "@/game/awards/types";
import { CATEGORY_DISPLAY_NAMES } from "@/game/awards/types";

interface TrophyWallViewProps {
  awards: RegionalAward[];
  ownerName?: string;
  totalAwards: number;
  hotyCount: number;
  className?: string;
}

export function TrophyWallView({ awards, ownerName, totalAwards, hotyCount, className }: TrophyWallViewProps) {
  const sortedAwards = [...awards].sort((a, b) => b.year - a.year);

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
