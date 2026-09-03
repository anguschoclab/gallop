import { useGameSelector } from "@/hooks/shared/useGameSelector";
import { calculateOverallRating } from "@/core/horse/stats";
import { scoutGrade } from "@/core/horse/grading";
import { statGradeColor } from "@/core/common/uiTokens";
import { getDisplayableStats, getScoutStatus } from "@/core/npc/scouting";
import { isMaleHorse } from "@/core/horse/gender";
import type { Horse } from "@/game/types";
import { getStableId } from "@/core/horse/ownership";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";

export function useHorseCard(rawHorse: Horse, showScoutInfo = false) {
  // World/NPC horses are stored with a deferred phenotype; resolve so the card
  // never renders zeroed ratings.
  const horse = ensurePhenotypeResolved(rawHorse);
  const scoutReports = useGameSelector((s) => s.scoutReports);
  const day = useGameSelector((s) => s.day);
  const simpleHorseCards = useGameSelector(
    (s) => s.userSettings?.display?.simpleHorseCards ?? true,
  );

  const ovr = calculateOverallRating(horse);

  const scoutStatus =
    showScoutInfo && getStableId(horse) ? getScoutStatus(horse, scoutReports, day) : null;
  const displayStats =
    showScoutInfo && getStableId(horse) ? getDisplayableStats(horse, scoutReports, day) : null;

  const genderColor =
    horse.gender === "gelding"
      ? "text-cream/40"
      : isMaleHorse(horse.gender)
        ? "text-blue-400"
        : "text-pink-400";

  const gradeColor = (score: number) => statGradeColor(scoutGrade(score));

  const sparklineData =
    horse.raceHistory
      ?.filter((h) => typeof h.beyer === "number")
      .slice(-8)
      .map((h, i) => ({ idx: i, beyer: h.beyer! })) || [];

  return {
    ovr,
    simpleHorseCards,
    scoutStatus,
    displayStats,
    genderColor,
    gradeColor,
    sparklineData,
  };
}
