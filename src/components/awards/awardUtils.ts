import type { AwardRegion, RegionalAward } from "@/game/awards/types";

export function groupByRegion(awards: RegionalAward[]): Record<AwardRegion, RegionalAward[]> {
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
