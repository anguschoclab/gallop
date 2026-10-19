import { useGameSelector } from "@/platform/game/hooks/useGameSelector";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";
import { scoutGrade } from "@/domains/horse/simulation/grading";
import { statGradeColor } from "@/shared/common/uiTokens";
import { getDisplayableStats, getScoutStatus } from "@/domains/agents/simulation/npc/scouting";
import { isMaleHorse } from "@/domains/horse/simulation/gender";
import type { Horse } from "@/platform/game/types";
import { getStableId } from "@/domains/horse/simulation/ownership";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";

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
      ? "text-foreground/40"
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
