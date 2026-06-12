import { TRAINING_COST_MAP, TRAINING_ENERGY_MAP } from "@/constants";

export const BASIC_TRAINING_TYPES = ["speed", "stamina", "acceleration"] as const;

export type BasicTrainingType = (typeof BASIC_TRAINING_TYPES)[number];

export interface AdvancedWorkout {
  key: string;
  label: string;
  cost: number;
  energy: number;
  stat?: string;
}

export const ADVANCED_WORKOUTS: AdvancedWorkout[] = [
  {
    key: "bullet",
    label: "Bullet",
    cost: TRAINING_COST_MAP.bullet,
    energy: Math.abs(TRAINING_ENERGY_MAP.bullet),
    stat: "speed",
  },
  {
    key: "breeze",
    label: "Breeze",
    cost: TRAINING_COST_MAP.breeze,
    energy: Math.abs(TRAINING_ENERGY_MAP.breeze),
    stat: "stamina",
  },
  {
    key: "gate_work",
    label: "Gate Work",
    cost: TRAINING_COST_MAP.gate_work,
    energy: Math.abs(TRAINING_ENERGY_MAP.gate_work),
    stat: "acceleration",
  },
  {
    key: "swimming",
    label: "Swimming",
    cost: TRAINING_COST_MAP.swimming,
    energy: Math.abs(TRAINING_ENERGY_MAP.swimming),
  },
  {
    key: "gallop",
    label: "Gallop",
    cost: TRAINING_COST_MAP.gallop,
    energy: Math.abs(TRAINING_ENERGY_MAP.gallop),
  },
];
