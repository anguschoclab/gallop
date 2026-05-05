// Backstory Archetypes for New Game Wizard
// Defines the different starting scenarios with varying difficulty and resources

import type { BackstoryId } from "@/game/types";
import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";

export interface HorseSpec {
  tier: "starter" | "budget" | "mid" | "elite";
  count: number;
}

export interface Backstory {
  id: BackstoryId;
  label: string;
  blurb: string; // 1-2 sentences shown on the card
  startingCash: number;
  horses: HorseSpec[];
  facilities: Partial<Record<FacilityType, FacilityLevel>>; // omitted = no facility
  reputation: number; // 0-1000 scale (ManagerReputation uses 0-1000)
  difficulty: "easy" | "standard" | "hard" | "very_hard";
}

export const BACKSTORIES: Backstory[] = [
  {
    id: "inheritor",
    label: "The Inheritor",
    blurb: "Your great-aunt left you a working operation. Cash in the bank, a real barn, but the press is watching.",
    startingCash: 250_000,
    horses: [{ tier: "mid", count: 2 }, { tier: "budget", count: 2 }],
    facilities: { main_track: "standard", barn: "standard", veterinary_clinic: "basic" },
    reputation: 450, // 45 * 10 for 0-1000 scale
    difficulty: "easy",
  },
  {
    id: "bloodstock_heir",
    label: "Bloodstock Heir",
    blurb: "One blueblood prospect, modest cash, and a name that opens doors at the sales.",
    startingCash: 60_000,
    horses: [{ tier: "elite", count: 1 }, { tier: "budget", count: 1 }],
    facilities: { main_track: "basic", barn: "basic" },
    reputation: 350, // 35 * 10 for 0-1000 scale
    difficulty: "standard",
  },
  {
    id: "claiming_trainer",
    label: "Claiming Trainer",
    blurb: "You know how to flip cheap horses. Three runners, modest cash, a basic shedrow.",
    startingCash: 30_000,
    horses: [{ tier: "budget", count: 3 }],
    facilities: { main_track: "basic", barn: "basic" },
    reputation: 200, // 20 * 10 for 0-1000 scale
    difficulty: "standard",
  },
  {
    id: "bootstrapper",
    label: "Bootstrapper",
    blurb: "One claimed horse, an empty barn, and grit. Win on a shoestring.",
    startingCash: 8_000,
    horses: [{ tier: "starter", count: 1 }],
    facilities: {},
    reputation: 100, // 10 * 10 for 0-1000 scale
    difficulty: "very_hard",
  },
];

// Personal owner names for the random button (not corporate like FILLER_OWNERS)
export const OWNER_NAMES = [
  "John Smith",
  "Maria Garcia",
  "A. Mauricia",
  "James Wilson",
  "Sarah Chen",
  "Michael Brown",
  "Emily Davis",
  "Robert Johnson",
  "Lisa Anderson",
  "David Martinez",
  "Jennifer Taylor",
  "William Thomas",
  "Jessica White",
  "Christopher Harris",
  "Ashley Martin",
  "Daniel Thompson",
  "Stephanie Garcia",
  "Matthew Robinson",
  "Nicole Clark",
  "Andrew Rodriguez",
  "Michelle Lewis",
  "Joshua Lee",
  "Amanda Walker",
  "Ryan Hall",
  "Melissa Allen",
  "Brandon Young",
  "Kimberly King",
  "Jason Wright",
  "Laura Scott",
  "Justin Green",
  "Hill Baker",
  "Rachel Adams",
  "Kevin Nelson",
  "Amy Hill",
  "Brian Moore",
  "Sandra Mitchell",
  "Eric Taylor",
  "Kathryn Anderson",
  "Jonathan Thomas",
  "Christina Jackson",
  "Brian White",
  "Pamela Harris",
  "Stephen Martin",
  "Deborah Thompson",
];

export function getBackstory(id: BackstoryId): Backstory {
  const backstory = BACKSTORIES.find((b) => b.id === id);
  if (!backstory) {
    throw new Error(`Unknown backstory ID: ${id}`);
  }
  return backstory;
}
