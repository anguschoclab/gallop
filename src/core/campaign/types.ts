export type CampaignGoalType =
  | "chase_g1"
  | "chase_g2"
  | "chase_g3"
  | "chase_major_race"
  | "maximize_earnings"
  | "develop_maiden"
  | "free_run";

export type CampaignRaceSlot = {
  dayTarget: number;
  dayWindow: number;
  raceId?: string;
  raceKey?: string;
  role: "target" | "prep" | "comeback";
  constraintDistance?: number;
  constraintSurface?: "Turf" | "Dirt" | "Synthetic";
  constraintGradeMin?: "G1" | "G2" | "G3" | "Stakes" | "Allowance";
  notes?: string;
  status: "planned" | "entered" | "completed" | "skipped" | "cancelled";
};

export type CampaignFlag = {
  day: number;
  type:
    | "poor_form"
    | "low_energy"
    | "health_issue"
    | "class_mismatch"
    | "upgrade_available"
    | "trait_confirmed";
  message: string;
  dismissed: boolean;
  suggestion?: Partial<CampaignRaceSlot>;
};

export type ConfirmedAptitudes = {
  surfaceStarts: Record<"Turf" | "Dirt" | "Synthetic", number>;
  distanceBandStarts: Record<"sprint" | "mile" | "intermediate" | "staying", number>;
  surfaceConfirmed?: "Turf" | "Dirt" | "Synthetic";
  distanceBandConfirmed?: "sprint" | "mile" | "intermediate" | "staying";
};

export type HorseCampaign = {
  horseId: string;
  goalType: CampaignGoalType;
  targetRaceKey?: string;
  slots: CampaignRaceSlot[];
  flags: CampaignFlag[];
  restWindowStart?: number;
  restWindowEnd?: number;
  autoManaged: boolean;
  confirmedAptitudes: ConfirmedAptitudes;
  createdDay: number;
  lastReviewedDay: number;
};

export type TripleCrownProgress = {
  horseId: string;
  triplecrownKey: string;
  year: number;
  legs: { raceKey: string; position: number; day: number }[];
  won: boolean;
};
