import type { Race } from "@/game/types";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";

export interface Milestone {
  pos: number;
  id: number;
}

export function generateDynamicMilestones(race: Race): Milestone[] {
  const distance = race.distance;
  const milestones: Milestone[] = [];

  milestones.push({
    pos: distance * NARRATIVE_THRESHOLDS.HALFWAY_POSITION,
    id: 50,
  });

  if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_400) {
    milestones.push({
      pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_400M,
      id: 400,
    });
  }

  if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_200) {
    milestones.push({
      pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_200M,
      id: 200,
    });
  }

  if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_100) {
    milestones.push({
      pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_100M,
      id: 100,
    });
  }

  return milestones.sort((a, b) => a.pos - b.pos);
}
