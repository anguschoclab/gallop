/**
 * facilityAIRoi.ts - Facility ROI tracking and insights
 *
 * Extracted from facilityAI.ts for modularity.
 */

import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";
import type { Stable } from "@/game/types";
import { recordPersonalityOutcome } from "./personalitySystem";
import type { FacilityAIState, FacilityInvestment } from "./facilityAITypes";
import { trimHistory } from "./learningModule";

export function recordFacilityInvestment(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  fromLevel: FacilityLevel,
  toLevel: FacilityLevel,
  cost: number,
  stable: Stable,
  currentDay: number,
): FacilityAIState {
  const investment: FacilityInvestment = {
    facilityType,
    fromLevel,
    toLevel,
    cost,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.investmentHistory, investment];

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

  const roiKey = `${facilityType}:${toLevel}`;
  const existingRoi = aiState.roiTracking[roiKey];

  const roi = existingRoi
    ? {
        ...existingRoi,
        totalInvestment: existingRoi.totalInvestment + cost,
      }
    : {
        facilityType,
        level: toLevel,
        totalInvestment: cost,
        totalBenefit: 0,
        daysOwned: 0,
        lastUpdateDay: currentDay,
      };

  return {
    ...aiState,
    investmentHistory: trimmedHistory,
    roiTracking: {
      ...aiState.roiTracking,
      [roiKey]: roi,
    },
  };
}

export function updateFacilityROI(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  level: FacilityLevel,
  benefit: number,
  currentDay: number,
): FacilityAIState {
  const roiKey = `${facilityType}:${level}`;
  const roi = aiState.roiTracking[roiKey];

  if (roi) {
    const updatedRoi = {
      ...roi,
      totalBenefit: roi.totalBenefit + benefit,
      daysOwned: roi.daysOwned + (currentDay - roi.lastUpdateDay),
      lastUpdateDay: currentDay,
    };

    const contextKey = facilityType;
    const success = benefit > 50;
    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "facility_upgrade",
      { facilityId: `${facilityType}:${level}` },
      success,
      benefit,
      currentDay,
    );

    return {
      ...aiState,
      personalityState: newPersonalityState,
      roiTracking: {
        ...aiState.roiTracking,
        [roiKey]: updatedRoi,
      },
    };
  }

  return aiState;
}

export function getFacilityInsights(
  aiState: FacilityAIState,
  stableId: string,
): {
  totalInvestments: number;
  avgROI: number;
  totalFacilities: number;
  facilityLevels: Record<string, FacilityLevel>;
} {
  const stableInvestments = aiState.investmentHistory.filter((i) => i.stableId === stableId);
  const totalInvestments = stableInvestments.length;
  const totalInvestedAmount = stableInvestments.reduce((sum, i) => sum + i.cost, 0);

  const rois = Object.values(aiState.roiTracking);
  const totalBenefit = rois.reduce((sum, r) => sum + r.totalBenefit, 0);
  const avgROI =
    totalInvestedAmount > 0 ? (totalBenefit - totalInvestedAmount) / totalInvestedAmount : 0;

  const facilityLevels: Record<string, FacilityLevel> = {};
  for (const investment of stableInvestments) {
    facilityLevels[investment.facilityType] = investment.toLevel;
  }

  return {
    totalInvestments,
    avgROI,
    totalFacilities: Object.keys(facilityLevels).length,
    facilityLevels,
  };
}
