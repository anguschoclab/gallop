import { useGameSelector } from "@/hooks/shared/useGameSelector";
import { calculateOverallRating } from "@/core/horse/stats";
import { scoutGrade } from "@/core/horse/grading";
import { statGradeColor } from "@/core/common/uiTokens";
import { getDisplayableStats, getScoutStatus } from "@/core/npc/scouting";
import { isMaleHorse } from "@/core/horse/gender";
import type { Horse } from "@/game/types";

export function useHorseCard(horse: Horse, showScoutInfo = false) {
  const scoutReports = useGameSelector((s) => s.scoutReports);
  const day = useGameSelector((s) => s.day);
  const simpleHorseCards = useGameSelector(
    (s) => s.userSettings?.display?.simpleHorseCards ?? true,
  );

  const ovr = calculateOverallRating(horse);

  const scoutStatus =
    showScoutInfo && horse.stableId ? getScoutStatus(horse, scoutReports, day) : null;
  const displayStats =
    showScoutInfo && horse.stableId ? getDisplayableStats(horse, scoutReports, day) : null;

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
