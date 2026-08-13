import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";

export function useAwardsData() {
  const awards = useGame((s) => s.awards);
  const day = useGame((s) => s.day);
  const invitations = useGameWithShallow((s) => s.awardCeremonyInvitations) ?? [];
  const year = Math.floor((day - 1) / 365) + 1;

  const playerAwards = awards.filter((a) => !a.stableId);

  const awardsByRegion = useMemo(() => {
    const byRegion: Record<string, typeof awards> = {
      north_america: [],
      europe: [],
      asia_pacific: [],
      south_america: [],
    };
    for (const award of playerAwards) {
      byRegion[award.region].push(award);
    }
    return byRegion;
  }, [playerAwards]);

  const totalAwards = playerAwards.length;
  const hotyCount = playerAwards.filter((a) => a.category === "horse_of_the_year").length;
  const currentYearAwards = playerAwards.filter((a) => a.year === year).length;

  return {
    year,
    day,
    invitations,
    playerAwards,
    awardsByRegion,
    totalAwards,
    hotyCount,
    currentYearAwards,
  };
}
