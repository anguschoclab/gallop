// NPC Stable Definitions - Configurable named stables + filler generation
// Pool-based system: Large pools of named stables, config determines how many spawn
// Refactored to use modular configuration and generation systems

import type { Stable, StableTier } from "./types";
import type { Rng } from "./rng";
import { PERSONALITY_CONFIG, STABLE_CONFIG } from "@/core/stable/stableConfig";
import {
  shuffleAndPick,
  selectPersonality,
  getSpecialistPreferences,
} from "@/core/stable/stableSelection";
import {
  generateFillerStable,
  generateStableFromTemplate,
  type StablePoolEntry,
} from "@/core/stable/stableGeneration";

// Re-export for backward compatibility
export { PERSONALITY_CONFIG, STABLE_CONFIG };

// ELITE STABLE POOL - 10 real-world inspired operations (config picks 5)
const ELITE_POOL: StablePoolEntry[] = [
  {
    name: "Coolmore Stud",
    owner: "Magnier Family",
    isMajor: true,
    colors: { primary: "#1a472a", secondary: "#ffffff" },
    description:
      "Irish breeding powerhouse dominating European racing for decades. Home of Galileo and descendants.",
    country: "Ireland",
  },
  {
    name: "Godolphin",
    owner: "Sheikh Mohammed",
    isMajor: true,
    colors: { primary: "#0066cc", secondary: "#ffffff" },
    description:
      "Dubai-based global racing operation with strings across five continents. The world's largest racing stable.",
    country: "UAE",
  },
  {
    name: "Juddmonte Farms",
    owner: "Prince Khalid Abdullah",
    isMajor: true,
    colors: { primary: "#4a0080", secondary: "#ffd700" },
    description: "Saudi-owned American and European operation famous for Frankel and Enable.",
    country: "USA/UK",
  },
  {
    name: "WinStar Farm",
    owner: "Kenny Troutt",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#daa520" },
    description: "Kentucky mega-stable producing Kentucky Derby winners and champion stallions.",
    country: "USA",
  },
  {
    name: "Klaravich Stables",
    owner: "Seth Klarman",
    isMajor: true,
    colors: { primary: "#8b0000", secondary: "#ffffff" },
    description: "New York-based operation with graded stakes success across the Americas.",
    country: "USA",
  },
  {
    name: "Gainsborough Farm",
    owner: "Maktoum Family",
    isMajor: true,
    colors: { primary: "#228b22", secondary: "#ffd700" },
    description:
      "Historic Kentucky nursery with classic winners and influence on American bloodlines.",
    country: "USA",
  },
  {
    name: "Sackatoga Stable",
    owner: "Jack Knowlton",
    isMajor: true,
    colors: { primary: "#ff8c00", secondary: "#000000" },
    description: "New York partnership famous for Tiz the Law and Saratoga success stories.",
    country: "USA",
  },
  {
    name: "Skull Stable",
    owner: "Hugo Merry",
    isMajor: true,
    colors: { primary: "#000000", secondary: "#ffffff" },
    description: "Australian operation making waves in Asian and Australian racing circuits.",
    country: "Australia",
  },
  {
    name: "AMO Racing",
    owner: "Amit Singh",
    isMajor: true,
    colors: { primary: "#dc143c", secondary: "#ffd700" },
    description: "British-based syndicate targeting European pattern races and Royal Ascot.",
    country: "UK",
  },
  {
    name: "China Horse Club",
    owner: "Teo Ah Khing",
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#ffd700" },
    description: "Asian powerhouse with global reach, breeding and racing worldwide.",
    country: "China/International",
  },
];

// MID-TIER POOL - 15 real-world inspired operations (config picks 10)
const MID_POOL: StablePoolEntry[] = [
  {
    name: "Team Valor",
    owner: "Barry Irwin",
    isMajor: true,
    colors: { primary: "#4169e1", secondary: "#ff0000" },
    description:
      "International partnership stable famous for Animal Kingdom and Kentucky Derby victories.",
    country: "USA",
  },
  {
    name: "Reddam Racing",
    owner: "Paul Reddam",
    isMajor: true,
    colors: { primary: "#dc143c", secondary: "#ffffff" },
    description: "California-based operation with multiple Breeders' Cup and Kentucky Derby wins.",
    country: "USA",
  },
  {
    name: "Churchill Downs Stables",
    owner: "Bradley Racing",
    isMajor: true,
    colors: { primary: "#8b4513", secondary: "#ffd700" },
    description: "Kentucky operation with deep ties to the track and consistent stakes performers.",
    country: "USA",
  },
  {
    name: "Phoenix Thoroughbreds",
    owner: "Amer Abdulaziz",
    isMajor: true,
    colors: { primary: "#ff4500", secondary: "#000000" },
    description: "International investment fund with horses across Europe, America, and Australia.",
    country: "International",
  },
  {
    name: "Al Shaqab Racing",
    owner: "Qatar Royal Family",
    isMajor: true,
    colors: { primary: "#800080", secondary: "#ffd700" },
    description: "Qatari operation with strong presence in European turf racing and breeding.",
    country: "Qatar",
  },
  {
    name: "Shadwell Estate",
    owner: "Hamdan Al Maktoum",
    isMajor: true,
    colors: { primary: "#0000cd", secondary: "#ffffff" },
    description: "British breeding and racing operation with global influence and classic winners.",
    country: "UK",
  },
  {
    name: "Sunday Silence Ltd",
    owner: "Masayoshi Son",
    isMajor: true,
    colors: { primary: "#ff8c00", secondary: "#000000" },
    description: "Japanese breeding empire built on the legendary stallion Sunday Silence.",
    country: "Japan",
  },
  {
    name: "Moyglare Stud",
    owner: "Evlanoff Family",
    isMajor: true,
    colors: { primary: "#228b22", secondary: "#ffffff" },
    description: "Historic Irish breeding operation producing classic winners for over 50 years.",
    country: "Ireland",
  },
  {
    name: "Rathbarry Stud",
    owner: "Noreen O'Callaghan",
    isMajor: true,
    colors: { primary: "#8b0000", secondary: "#ffd700" },
    description: "Irish farm known for nurturing champions and successful broodmare band.",
    country: "Ireland",
  },
  {
    name: "Gestut Fahrhof",
    owner: "von Schroeder Family",
    isMajor: true,
    colors: { primary: "#191970", secondary: "#c0c0c0" },
    description: "German breeding nursery with influence across European racing.",
    country: "Germany",
  },
  {
    name: "Ecurie Pierre-Etienne",
    owner: "Pierre-Etienne Dubois",
    isMajor: true,
    colors: { primary: "#000080", secondary: "#ffffff" },
    description: "French operation with consistent success in Parisian tracks and Arc trials.",
    country: "France",
  },
  {
    name: "Arrowfield Stud",
    owner: "Ingham Family",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#ffd700" },
    description: "Australian powerhouse with Champion Sires and Golden Slipper winners.",
    country: "Australia",
  },
  {
    name: "Newgate Farm",
    owner: "Henry Field",
    isMajor: true,
    colors: { primary: "#4b0082", secondary: "#ffffff" },
    description: "Australian farm producing champion stallions and racehorses.",
    country: "Australia",
  },
  {
    name: "Yulong Investments",
    owner: "Zhang Yuesheng",
    isMajor: true,
    colors: { primary: "#ff6347", secondary: "#ffd700" },
    description: "Chinese-Australian operation acquiring top bloodstock worldwide.",
    country: "China/Australia",
  },
  {
    name: "Silk Racing",
    owner: "Australian Syndicate",
    isMajor: true,
    colors: { primary: "#800000", secondary: "#ffffff" },
    description: "Micro-share racing syndicate making ownership accessible to thousands.",
    country: "Australia",
  },
];

// BUDGET POOL - 10 up-and-coming and regional operations (config picks 5)
const BUDGET_POOL: StablePoolEntry[] = [
  {
    name: "Green Hills Racing",
    owner: "Tom O'Brien",
    isMajor: true,
    colors: { primary: "#2e8b57", secondary: "#f5f5dc" },
    description: "Up-and-coming regional stable building a reputation with smart claiming.",
    country: "USA",
  },
  {
    name: "Coastal Thoroughbreds",
    owner: "Sarah Martinez",
    isMajor: true,
    colors: { primary: "#4682b4", secondary: "#ffffff" },
    description:
      "California-based operation focused on claiming races and developing young talent.",
    country: "USA",
  },
  {
    name: "Highland Downs Farm",
    owner: "Angus MacLeod",
    isMajor: true,
    colors: { primary: "#556b2f", secondary: "#8b4513" },
    description: "Scottish operation punching above their weight in regional stakes.",
    country: "Scotland",
  },
  {
    name: "Sunrise Racing Club",
    owner: "Kenji Tanaka",
    isMajor: true,
    colors: { primary: "#ff6347", secondary: "#ffd700" },
    description: "Japanese partnership club with dreams of producing a Derby contender.",
    country: "Japan",
  },
  {
    name: "Outback Bloodstock",
    owner: "Bruce Wilson",
    isMajor: true,
    colors: { primary: "#8b4513", secondary: "#daa520" },
    description: "Australian syndicate focused on buying tried horses for local cups.",
    country: "Australia",
  },
  {
    name: "Bluegrass Dreams",
    owner: "Jenny Williams",
    isMajor: true,
    colors: { primary: "#1e90ff", secondary: "#ffffff" },
    description: "Kentucky startup building from the ground up with yearling purchases.",
    country: "USA",
  },
  {
    name: "Hawkesbury Stables",
    owner: "Mike Thompson",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#f0e68c" },
    description: "Regional Australian trainer taking on the metropolitan stables.",
    country: "Australia",
  },
  {
    name: "Flemington Lane",
    owner: "Emma Richardson",
    isMajor: true,
    colors: { primary: "#ff1493", secondary: "#ffffff" },
    description: "Melbourne-based syndicate targeting metropolitan midweek races.",
    country: "Australia",
  },
  {
    name: "Turfside Racing",
    owner: "Carlos Mendez",
    isMajor: true,
    colors: { primary: "#2f4f4f", secondary: "#ffd700" },
    description: "Spanish operation racing primarily in France and Iberian Peninsula.",
    country: "Spain",
  },
  {
    name: "Meadowbrook Farm",
    owner: "Lisa Chen",
    isMajor: true,
    colors: { primary: "#9370db", secondary: "#ffffff" },
    description: "New York regional stable developing homebreds and claimers.",
    country: "USA",
  },
];


/**
 * Generate all NPC stables (named + filler)
 * Named stables are randomly selected from pools based on config counts
 */
export function generateAllStables(day: number, rng: Rng, config = STABLE_CONFIG): Stable[] {
  const stables: Stable[] = [];

  // Select and create elite stables from pool
  const selectedElite = shuffleAndPick(ELITE_POOL, config.elite.count, rng);
  for (const template of selectedElite) {
    stables.push(
      generateStableFromTemplate(template, "elite", config.elite.reputationRange, day, rng),
    );
  }

  // Select and create mid-tier stables from pool
  const selectedMid = shuffleAndPick(MID_POOL, config.mid.count, rng);
  for (const template of selectedMid) {
    stables.push(
      generateStableFromTemplate(template, "mid", config.mid.reputationRange, day, rng),
    );
  }

  // Select and create budget stables from pool
  const selectedBudget = shuffleAndPick(BUDGET_POOL, config.budget.count, rng);
  for (const template of selectedBudget) {
    stables.push(
      generateStableFromTemplate(template, "budget", config.budget.reputationRange, day, rng),
    );
  }

  // Create filler stables
  for (let i = 0; i < config.filler.count; i++) {
    stables.push(generateFillerStable(i, day, rng));
  }

  return stables;
}

/**
 * Get stable by ID
 */
export function getStableById(stables: Stable[], id: string): Stable | undefined {
  return stables.find((s) => s.id === id);
}

/**
 * Get all major stables (non-filler)
 */
export function getMajorStables(stables: Stable[]): Stable[] {
  return stables.filter((s) => s.isMajor);
}

/**
 * Get stables by tier
 */
export function getStablesByTier(stables: Stable[], tier: StableTier): Stable[] {
  return stables.filter((s) => s.tier === tier);
}

/**
 * Calculate starting cash for a stable based on tier
 */
export function getStartingCashForTier(tier: StableTier, rng: Rng): number {
  switch (tier) {
    case "elite":
      return rng.int(500000, 1000000);
    case "mid":
      return rng.int(150000, 350000);
    case "budget":
      return rng.int(20000, 70000);
  }
}

/**
 * Calculate target horse count for a stable based on tier
 */
export function getTargetHorseCountForTier(tier: StableTier, isMajor: boolean, rng: Rng): number {
  if (!isMajor) return 10; // Filler stables always have 10
  switch (tier) {
    case "elite":
      return rng.int(30, 40); // 30-40
    case "mid":
      return rng.int(20, 30); // 20-30
    case "budget":
      return rng.int(15, 25); // 15-25
  }
}
