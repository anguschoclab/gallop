import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";
import type { FacilityROI } from "./facilityAITypes";
import type { Stable } from "@/game/types";
import { FACILITY_UPGRADE_COSTS } from "@/core/facilities/facilityTypes";

const LEVEL_CAPACITY: Record<FacilityLevel, number> = {
  basic: 5,
  standard: 10,
  premium: 15,
  elite: 20,
};

export function shouldUpgradeForCapacity(
  facilityType: FacilityType,
  currentLevel: FacilityLevel,
  horseCount: number,
  stableCash: number,
): boolean {
  const capacity = LEVEL_CAPACITY[currentLevel] ?? 5;

  if (horseCount >= capacity * 0.8) {
    const upgradeCost = FACILITY_UPGRADE_COSTS[currentLevel];
    if (upgradeCost === null) return false;
    if (stableCash > upgradeCost * 2) {
      return true;
    }
  }

  return false;
}

export function getSpecializationPriority(personality: Stable["personality"]): FacilityType[] {
  switch (personality) {
    case "breeder":
      return ["barn", "nutrition_lab", "main_track", "veterinary_clinic"];
    case "aggressive":
    case "win-now":
      return ["main_track", "exercise_pool", "veterinary_clinic", "spa"];
    case "developer":
      return ["main_track", "veterinary_clinic", "exercise_pool", "barn"];
    case "trader":
      return ["main_track", "veterinary_clinic", "barn", "exercise_pool"];
    case "prestige":
      return ["barn", "main_track", "exercise_pool", "veterinary_clinic"];
    default:
      return ["main_track", "veterinary_clinic", "barn", "exercise_pool"];
  }
}

const LEVEL_ORDER: Record<FacilityLevel, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
  elite: 4,
};

export function shouldDivestFacility(roi: FacilityROI, currentLevel: FacilityLevel): boolean {
  if (LEVEL_ORDER[currentLevel] < 3) return false;
  if (roi.daysOwned < 30) return false;

  const roiPercent =
    roi.totalInvestment > 0 ? (roi.totalBenefit - roi.totalInvestment) / roi.totalInvestment : 0;

  if (roiPercent < -0.2) return true;

  return false;
}
