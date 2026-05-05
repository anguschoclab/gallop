import type { Horse } from "../types";

/**
 * Updates the blue hen status of a dam after a stakes win
 * @param dam - The dam horse to update
 * @param raceGrade - The grade of the race won (G1, G2, G3, or undefined)
 */
export function updateBlueHenStatus(dam: Horse, raceGrade: "G1" | "G2" | "G3" | undefined): void {
  if (!dam.blueHenStatus) {
    dam.blueHenStatus = {
      isBlueHen: false,
      stakesWinnersProduced: 0,
      group1WinnersProduced: 0,
      blueHenScore: 0,
      foalsProduced: dam.foalsProduced?.length ?? 0,
    };
  }
  dam.blueHenStatus.stakesWinnersProduced += 1;
  if (raceGrade === "G1") {
    dam.blueHenStatus.group1WinnersProduced += 1;
  }
  const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
  const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
  dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
  if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
    dam.blueHenStatus.isBlueHen = true;
  }
  // Sync the count with the array length
  dam.blueHenStatus.foalsProduced = dam.foalsProduced?.length ?? 0;
}
