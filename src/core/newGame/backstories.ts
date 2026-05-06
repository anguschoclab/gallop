import type { BackstoryId } from "@/game/types";
import type { FacilityType, FacilityLevel } from "@/core/facilities";

export type BackstoryDifficulty = "easy" | "standard" | "hard" | "very_hard";

export interface HorseSpec {
  tier: "starter" | "budget" | "mid" | "elite";
  count: number;
}

export interface Backstory {
  id: BackstoryId;
  label: string;
  blurb: string;
  startingCash: number;
  horses: HorseSpec[];
  /** Upgrades over the default all-basic facility set. Types not listed remain "basic". */
  facilityUpgrades: Partial<Record<FacilityType, FacilityLevel>>;
  /** Alias of facilityUpgrades — kept for UI code that reads `facilities`. */
  facilities: Partial<Record<FacilityType, FacilityLevel>>;
  /** Starting reputation score on the 0-1000 ManagerReputation scale. */
  reputationScore: number;
  /** Alias of reputationScore — kept for UI code that reads `reputation`. */
  reputation: number;
  difficulty: BackstoryDifficulty;
}

export const BACKSTORIES: Backstory[] = [
  {
    id: "inheritor",
    label: "The Inheritor",
    blurb:
      "Your great-aunt left you a working operation. Cash in the bank, a real barn, but the press is watching.",
    startingCash: 250_000,
    horses: [
      { tier: "mid", count: 2 },
      { tier: "budget", count: 2 },
    ],
    facilityUpgrades: {
      main_track: "standard",
      barn: "standard",
      veterinary_clinic: "standard",
    },
    reputationScore: 200,
    difficulty: "easy",
  },
  {
    id: "bloodstock_heir",
    label: "Bloodstock Heir",
    blurb: "One blueblood prospect, modest cash, and a name that opens doors at the sales.",
    startingCash: 60_000,
    horses: [
      { tier: "elite", count: 1 },
      { tier: "budget", count: 1 },
    ],
    facilityUpgrades: {
      main_track: "standard",
    },
    reputationScore: 150,
    difficulty: "standard",
  },
  {
    id: "claiming_trainer",
    label: "Claiming Trainer",
    blurb: "You know how to flip cheap horses. Three runners, modest cash, a basic shedrow.",
    startingCash: 30_000,
    horses: [{ tier: "budget", count: 3 }],
    facilityUpgrades: {},
    reputationScore: 75,
    difficulty: "standard",
  },
  {
    id: "bootstrapper",
    label: "Bootstrapper",
    blurb: "One claimed horse, an empty barn, and grit. Win on a shoestring.",
    startingCash: 8_000,
    horses: [{ tier: "starter", count: 1 }],
    facilityUpgrades: {},
    reputationScore: 0,
    difficulty: "very_hard",
  },
];

export function getBackstory(id: BackstoryId): Backstory {
  const found = BACKSTORIES.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown backstory: ${id}`);
  return found;
}
