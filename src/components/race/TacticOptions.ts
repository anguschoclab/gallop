import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { AGGRESSIVENESS_DEFAULT } from "@/constants";

export interface InstructionPreset {
  id: string;
  name: string;
  desc: string;
  instructions: JockeyInstructions;
}

export const INSTRUCTION_PRESETS: InstructionPreset[] = [
  {
    id: "default",
    name: "Default",
    desc: "Jockey will use their best judgment based on horse style.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "tactical",
      earlyPosition: "midpack",
      moveTiming: "mid",
      aggressiveness: AGGRESSIVENESS_DEFAULT,
    },
  },
  {
    id: "front_runner_lead",
    name: "Lead at all costs",
    desc: "Aggressive push for the front. High speed boost but drains stamina fast.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "front_runner",
      earlyPosition: "lead",
      moveTiming: "early",
      aggressiveness: 85,
    },
  },
  {
    id: "hug_rail",
    name: "Hug the Rail",
    desc: "Stay inside and save ground. Front-runner style hugging the fence.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "front_runner",
      earlyPosition: "press",
      moveTiming: "early",
      aggressiveness: 70,
    },
  },
  {
    id: "stay_outside",
    name: "Stay Outside",
    desc: "Avoid traffic by staying wide. Closer style swinging wide for clear run.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "closer",
      earlyPosition: "midpack",
      moveTiming: "late",
      aggressiveness: 60,
    },
  },
  {
    id: "save_ground",
    name: "Save Ground",
    desc: "Drop back and draft behind other horses. Conserve stamina for late move.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "closer",
      earlyPosition: "drop_back",
      moveTiming: "late",
      aggressiveness: 40,
    },
  },
  {
    id: "late_kick",
    name: "Late Kick",
    desc: "Sit back and conserve energy for a massive boost in the final 20%.",
    instructions: {
      horseId: "",
      raceId: "",
      ridingStyle: "closer",
      earlyPosition: "drop_back",
      moveTiming: "late",
      aggressiveness: 75,
    },
  },
];

export type PresetId = (typeof INSTRUCTION_PRESETS)[number]["id"];

/**
 * Fill in horseId and raceId for a preset to create a complete JockeyInstructions.
 * @param preset
 * @param horseId
 * @param raceId
 */
export function buildInstructions(
  preset: InstructionPreset,
  horseId: string,
  raceId: string,
): JockeyInstructions {
  return {
    ...preset.instructions,
    horseId,
    raceId,
  };
}
