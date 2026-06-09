import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import { calculateOverallRating } from "@/core/horse/stats";
import { scoutGrade, gradeColorClass } from "@/core/horse/grading";
import { getDisplayableStats, getScoutStatus } from "@/core/npc/scouting";
import { isMaleHorse } from "@/core/horse/gender";
import type { Horse } from "@/game/types";

export function useHorseCard(horse: Horse, showScoutInfo = false) {
  const scoutReports = (useGame as any)((s: any) => s.scoutReports, shallow);
  const day = useGame((s) => s.day);
  const simpleHorseCards = useGame((s) => s.userSettings?.display?.simpleHorseCards ?? true);

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

  const gradeColor = (score: number) => gradeColorClass(scoutGrade(score));

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
