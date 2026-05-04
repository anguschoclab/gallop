// NPC Stable Definitions - Configurable named stables + filler generation
// Pool-based system: Large pools of named stables, config determines how many spawn

import type { Stable, StableTier, StablePersonality } from "./types";
import type { Rng } from "./rng";
import { generateUUID } from "./uuid";

// Personality configurations affecting AI behavior
export const PERSONALITY_CONFIG: Record<StablePersonality, {
  description: string;
  raceEntryMod: number; // Multiplier for race entry frequency
  trainingMod: number; // Training slots used
  purseThresholdMod: number; // Purse attractiveness threshold
  gradedRaceBonus: number; // Extra appeal for graded races
  riskTolerance: number; // 0-1, affects horse selection
  youthPreference: number; // 0-1, preference for young horses (developer trait)
  specialistDistance?: number; // For specialist personality
  specialistSurface?: "Turf" | "Dirt" | "Synthetic";
}> = {
  aggressive: {
    description: "High-risk, high-reward strategy. Enters many races and spends freely.",
    raceEntryMod: 1.5,
    trainingMod: 8,
    purseThresholdMod: 0.7,
    gradedRaceBonus: 20,
    riskTolerance: 0.8,
    youthPreference: 0.3,
  },
  conservative: {
    description: "Careful, methodical approach. Selective entries and cost-conscious.",
    raceEntryMod: 0.7,
    trainingMod: 4,
    purseThresholdMod: 1.3,
    gradedRaceBonus: 10,
    riskTolerance: 0.3,
    youthPreference: 0.5,
  },
  developer: {
    description: "Focuses on young horses and long-term growth. Patient with 2-3 year olds.",
    raceEntryMod: 0.9,
    trainingMod: 6,
    purseThresholdMod: 1.0,
    gradedRaceBonus: 15,
    riskTolerance: 0.5,
    youthPreference: 0.9,
  },
  "win-now": {
    description: "Targets immediate results with proven horses. Ages 4-6 preferred.",
    raceEntryMod: 1.3,
    trainingMod: 7,
    purseThresholdMod: 0.9,
    gradedRaceBonus: 25,
    riskTolerance: 0.6,
    youthPreference: 0.1,
  },
  specialist: {
    description: "Focuses on specific distances or surfaces. Becomes expert in niche.",
    raceEntryMod: 1.0,
    trainingMod: 6,
    purseThresholdMod: 1.1,
    gradedRaceBonus: 15,
    riskTolerance: 0.5,
    youthPreference: 0.4,
    specialistDistance: 1600, // Default, will be randomized
    specialistSurface: "Turf",
  },
  breeder: {
    description: "Values broodmares and breeding stock. Keeps quality mares.",
    raceEntryMod: 0.8,
    trainingMod: 5,
    purseThresholdMod: 1.2,
    gradedRaceBonus: 12,
    riskTolerance: 0.4,
    youthPreference: 0.5,
  },
  trader: {
    description: "Buys and sells frequently. Targets claiming races and bargains.",
    raceEntryMod: 1.2,
    trainingMod: 5,
    purseThresholdMod: 0.8,
    gradedRaceBonus: 5,
    riskTolerance: 0.7,
    youthPreference: 0.4,
  },
  prestige: {
    description: "Targets graded stakes and prestigious races. Reputation over profit.",
    raceEntryMod: 1.1,
    trainingMod: 7,
    purseThresholdMod: 0.6,
    gradedRaceBonus: 35,
    riskTolerance: 0.6,
    youthPreference: 0.3,
  },
};

// Tier-based personality weights (higher = more likely)
const PERSONALITY_WEIGHTS: Record<StableTier, Partial<Record<StablePersonality, number>>> = {
  elite: { prestige: 3, aggressive: 2, "win-now": 2, specialist: 1, conservative: 1, developer: 1, breeder: 2, trader: 0.5 },
  mid: { aggressive: 2, "win-now": 2, specialist: 2, conservative: 2, developer: 1.5, trader: 1.5, prestige: 1, breeder: 1 },
  budget: { conservative: 3, developer: 2, trader: 2, specialist: 1.5, aggressive: 0.5, prestige: 0.5, "win-now": 1, breeder: 0.5 },
};

// Random silk color generator (hex)
const randomSilk = (rng: Rng) => {
  const hues = [0, 30, 60, 120, 180, 240, 270, 300, 330];
  const hue = rng.pick(hues);
  return `hsl(${hue}, 70%, 50%)`;
};

// Configuration - Adjust these to change how many named stables spawn per tier
export const STABLE_CONFIG = {
  elite: { count: 5, reputationRange: [90, 98] as [number, number] },
  mid: { count: 10, reputationRange: [70, 86] as [number, number] },
  budget: { count: 5, reputationRange: [50, 65] as [number, number] },
  filler: { count: 100 },
};

// Base stable info without generated fields
type StablePoolEntry = Omit<Stable, "id" | "founded" | "cash" | "horses" | "tier" | "reputation" | "personality" | "preferredDistance" | "preferredSurface">;

// ELITE STABLE POOL - 10 real-world inspired operations (config picks 5)
const ELITE_POOL: StablePoolEntry[] = [
  {
    name: "Coolmore Stud",
    owner: "Magnier Family",
    isMajor: true,
    colors: { primary: "#1a472a", secondary: "#ffffff" },
    description: "Irish breeding powerhouse dominating European racing for decades. Home of Galileo and descendants.",
    country: "Ireland"
  },
  {
    name: "Godolphin",
    owner: "Sheikh Mohammed",
    isMajor: true,
    colors: { primary: "#0066cc", secondary: "#ffffff" },
    description: "Dubai-based global racing operation with strings across five continents. The world's largest racing stable.",
    country: "UAE"
  },
  {
    name: "Juddmonte Farms",
    owner: "Prince Khalid Abdullah",
    isMajor: true,
    colors: { primary: "#4a0080", secondary: "#ffd700" },
    description: "Saudi-owned American and European operation famous for Frankel and Enable.",
    country: "USA/UK"
  },
  {
    name: "WinStar Farm",
    owner: "Kenny Troutt",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#daa520" },
    description: "Kentucky mega-stable producing Kentucky Derby winners and champion stallions.",
    country: "USA"
  },
  {
    name: "Klaravich Stables",
    owner: "Seth Klarman",
    isMajor: true,
    colors: { primary: "#8b0000", secondary: "#ffffff" },
    description: "New York-based operation with graded stakes success across the Americas.",
    country: "USA"
  },
  {
    name: "Gainsborough Farm",
    owner: "Maktoum Family",
    isMajor: true,
    colors: { primary: "#228b22", secondary: "#ffd700" },
    description: "Historic Kentucky nursery with classic winners and influence on American bloodlines.",
    country: "USA"
  },
  {
    name: "Sackatoga Stable",
    owner: "Jack Knowlton",
    isMajor: true,
    colors: { primary: "#ff8c00", secondary: "#000000" },
    description: "New York partnership famous for Tiz the Law and Saratoga success stories.",
    country: "USA"
  },
  {
    name: "Skull Stable",
    owner: "Hugo Merry",
    isMajor: true,
    colors: { primary: "#000000", secondary: "#ffffff" },
    description: "Australian operation making waves in Asian and Australian racing circuits.",
    country: "Australia"
  },
  {
    name: "AMO Racing",
    owner: "Amit Singh",
    isMajor: true,
    colors: { primary: "#dc143c", secondary: "#ffd700" },
    description: "British-based syndicate targeting European pattern races and Royal Ascot.",
    country: "UK"
  },
  {
    name: "China Horse Club",
    owner: "Teo Ah Khing",
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#ffd700" },
    description: "Asian powerhouse with global reach, breeding and racing worldwide.",
    country: "China/International"
  }
];

// MID-TIER POOL - 15 real-world inspired operations (config picks 10)
const MID_POOL: StablePoolEntry[] = [
  {
    name: "Team Valor",
    owner: "Barry Irwin",
    isMajor: true,
    colors: { primary: "#4169e1", secondary: "#ff0000" },
    description: "International partnership stable famous for Animal Kingdom and Kentucky Derby victories.",
    country: "USA"
  },
  {
    name: "Reddam Racing",
    owner: "Paul Reddam",
    isMajor: true,
    colors: { primary: "#dc143c", secondary: "#ffffff" },
    description: "California-based operation with multiple Breeders' Cup and Kentucky Derby wins.",
    country: "USA"
  },
  {
    name: "Churchill Downs Stables",
    owner: "Bradley Racing",
    isMajor: true,
    colors: { primary: "#8b4513", secondary: "#ffd700" },
    description: "Kentucky operation with deep ties to the track and consistent stakes performers.",
    country: "USA"
  },
  {
    name: "Phoenix Thoroughbreds",
    owner: "Amer Abdulaziz",
    isMajor: true,
    colors: { primary: "#ff4500", secondary: "#000000" },
    description: "International investment fund with horses across Europe, America, and Australia.",
    country: "International"
  },
  {
    name: "Al Shaqab Racing",
    owner: "Qatar Royal Family",
    isMajor: true,
    colors: { primary: "#800080", secondary: "#ffd700" },
    description: "Qatari operation with strong presence in European turf racing and breeding.",
    country: "Qatar"
  },
  {
    name: "Shadwell Estate",
    owner: "Hamdan Al Maktoum",
    isMajor: true,
    colors: { primary: "#0000cd", secondary: "#ffffff" },
    description: "British breeding and racing operation with global influence and classic winners.",
    country: "UK"
  },
  {
    name: "Sunday Silence Ltd",
    owner: "Masayoshi Son",
    isMajor: true,
    colors: { primary: "#ff8c00", secondary: "#000000" },
    description: "Japanese breeding empire built on the legendary stallion Sunday Silence.",
    country: "Japan"
  },
  {
    name: "Moyglare Stud",
    owner: "Evlanoff Family",
    isMajor: true,
    colors: { primary: "#228b22", secondary: "#ffffff" },
    description: "Historic Irish breeding operation producing classic winners for over 50 years.",
    country: "Ireland"
  },
  {
    name: "Rathbarry Stud",
    owner: "Noreen O'Callaghan",
    isMajor: true,
    colors: { primary: "#8b0000", secondary: "#ffd700" },
    description: "Irish farm known for nurturing champions and successful broodmare band.",
    country: "Ireland"
  },
  {
    name: "Gestut Fahrhof",
    owner: "von Schroeder Family",
    isMajor: true,
    colors: { primary: "#191970", secondary: "#c0c0c0" },
    description: "German breeding nursery with influence across European racing.",
    country: "Germany"
  },
  {
    name: "Ecurie Pierre-Etienne",
    owner: "Pierre-Etienne Dubois",
    isMajor: true,
    colors: { primary: "#000080", secondary: "#ffffff" },
    description: "French operation with consistent success in Parisian tracks and Arc trials.",
    country: "France"
  },
  {
    name: "Arrowfield Stud",
    owner: "Ingham Family",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#ffd700" },
    description: "Australian powerhouse with Champion Sires and Golden Slipper winners.",
    country: "Australia"
  },
  {
    name: "Newgate Farm",
    owner: "Henry Field",
    isMajor: true,
    colors: { primary: "#4b0082", secondary: "#ffffff" },
    description: "Australian farm producing champion stallions and racehorses.",
    country: "Australia"
  },
  {
    name: "Yulong Investments",
    owner: "Zhang Yuesheng",
    isMajor: true,
    colors: { primary: "#ff6347", secondary: "#ffd700" },
    description: "Chinese-Australian operation acquiring top bloodstock worldwide.",
    country: "China/Australia"
  },
  {
    name: "Silk Racing",
    owner: "Australian Syndicate",
    isMajor: true,
    colors: { primary: "#800000", secondary: "#ffffff" },
    description: "Micro-share racing syndicate making ownership accessible to thousands.",
    country: "Australia"
  }
];

// BUDGET POOL - 10 up-and-coming and regional operations (config picks 5)
const BUDGET_POOL: StablePoolEntry[] = [
  {
    name: "Green Hills Racing",
    owner: "Tom O'Brien",
    isMajor: true,
    colors: { primary: "#2e8b57", secondary: "#f5f5dc" },
    description: "Up-and-coming regional stable building a reputation with smart claiming.",
    country: "USA"
  },
  {
    name: "Coastal Thoroughbreds",
    owner: "Sarah Martinez",
    isMajor: true,
    colors: { primary: "#4682b4", secondary: "#ffffff" },
    description: "California-based operation focused on claiming races and developing young talent.",
    country: "USA"
  },
  {
    name: "Highland Downs Farm",
    owner: "Angus MacLeod",
    isMajor: true,
    colors: { primary: "#556b2f", secondary: "#8b4513" },
    description: "Scottish operation punching above their weight in regional stakes.",
    country: "Scotland"
  },
  {
    name: "Sunrise Racing Club",
    owner: "Kenji Tanaka",
    isMajor: true,
    colors: { primary: "#ff6347", secondary: "#ffd700" },
    description: "Japanese partnership club with dreams of producing a Derby contender.",
    country: "Japan"
  },
  {
    name: "Outback Bloodstock",
    owner: "Bruce Wilson",
    isMajor: true,
    colors: { primary: "#8b4513", secondary: "#daa520" },
    description: "Australian syndicate focused on buying tried horses for local cups.",
    country: "Australia"
  },
  {
    name: "Bluegrass Dreams",
    owner: "Jenny Williams",
    isMajor: true,
    colors: { primary: "#1e90ff", secondary: "#ffffff" },
    description: "Kentucky startup building from the ground up with yearling purchases.",
    country: "USA"
  },
  {
    name: "Hawkesbury Stables",
    owner: "Mike Thompson",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#f0e68c" },
    description: "Regional Australian trainer taking on the metropolitan stables.",
    country: "Australia"
  },
  {
    name: "Flemington Lane",
    owner: "Emma Richardson",
    isMajor: true,
    colors: { primary: "#ff1493", secondary: "#ffffff" },
    description: "Melbourne-based syndicate targeting metropolitan midweek races.",
    country: "Australia"
  },
  {
    name: "Turfside Racing",
    owner: "Carlos Mendez",
    isMajor: true,
    colors: { primary: "#2f4f4f", secondary: "#ffd700" },
    description: "Spanish operation racing primarily in France and Iberian Peninsula.",
    country: "Spain"
  },
  {
    name: "Meadowbrook Farm",
    owner: "Lisa Chen",
    isMajor: true,
    colors: { primary: "#9370db", secondary: "#ffffff" },
    description: "New York regional stable developing homebreds and claimers.",
    country: "USA"
  }
];

// Filler stable name components for generation
const FILLER_PREFIXES = [
  "Oak", "Pine", "Maple", "Cedar", "Willow", "Birch", "Elm", "Ash",
  "Spring", "Summer", "Autumn", "Winter", "Morning", "Evening", "Sunset",
  "Golden", "Silver", "Copper", "Iron", "Diamond", "Ruby", "Emerald",
  "Royal", "Crown", "Imperial", "Sovereign", "Regal", "Noble",
  "Running", "Galloping", "Flying", "Racing", "Thunder", "Lightning",
  "Prairie", "Meadow", "Valley", "Ridge", "Hill", "Brook", "Creek",
  "Star", "Moon", "Sun", "Sky", "Cloud", "Storm", "Rain",
  "Victory", "Champion", "Winner", "Triumph", "Glory"
];

const FILLER_SUFFIXES = [
  "Racing", "Stables", "Farm", "Stud", "Thoroughbreds", "Bloodstock",
  "Ranch", "Meadows", "Acres", "Fields", "Estates", "Park",
  "Lane Stables", "Ridge Farm", "Valley Stud", "Hill Racing",
  "Downs", "Heights", "Hollow", "Glen", "Crossing", "Point"
];

const FILLER_OWNERS = [
  "Racing Partnership", "Thoroughbred LLC", "Bloodstock Group", "Racing Syndicate",
  "Farm Inc.", "Stables Ltd", "Racing Club", "Partnership Group",
  "Investment LLC", "Bloodstock Partners", "Racing Ventures", "Farm Group"
];

const FILLER_COUNTRIES = [
  "USA", "UK", "Ireland", "France", "Germany", "Italy", "Spain",
  "Japan", "Australia", "New Zealand", "Hong Kong", "Singapore",
  "UAE", "South Africa", "Argentina", "Brazil", "Canada"
];

/**
 * Generate a single filler stable
 */
function generateFillerStable(index: number, day: number, rng: Rng): Stable {
  const prefix = rng.pick(FILLER_PREFIXES);
  const suffix = rng.pick(FILLER_SUFFIXES);
  const owner = rng.pick(FILLER_OWNERS);
  const country = rng.pick(FILLER_COUNTRIES);
  const personality = selectPersonality("budget", rng);
  const isSpecialist = personality === "specialist";
  
  return {
    id: generateUUID(),
    name: `${prefix} ${suffix}`,
    owner: owner,
    tier: "budget",
    reputation: rng.int(30, 55),
    founded: Math.max(1, day - rng.int(0, 365)),
    cash: rng.int(10000, 60000),
    horses: [],
    isMajor: false,
    colors: { primary: randomSilk(rng), secondary: randomSilk(rng) },
    country,
    personality,
    ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
  };
}

/**
 * Shuffle array and return a random subset
 */
function shuffleAndPick<T>(array: T[], count: number, rng: Rng): T[] {
  const shuffled = [...array].sort(() => rng.next() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Select a random personality based on tier weights
 */
function selectPersonality(tier: StableTier, rng: Rng): StablePersonality {
  const weights = PERSONALITY_WEIGHTS[tier];
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  let randomVal = rng.next() * totalWeight;
  
  for (const [personality, weight] of Object.entries(weights)) {
    randomVal -= weight || 0;
    if (randomVal <= 0) {
      return personality as StablePersonality;
    }
  }
  
  return "conservative"; // Fallback
}

/**
 * Get random specialist preferences for specialist personality
 */
function getSpecialistPreferences(rng: Rng) {
  const distances = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
  const surfaces: ("Turf" | "Dirt" | "Synthetic")[] = ["Turf", "Dirt", "Synthetic"];
  
  return {
    preferredDistance: rng.pick(distances),
    preferredSurface: rng.pick(surfaces),
  };
}

/**
 * Generate all NPC stables (named + filler)
 * Named stables are randomly selected from pools based on config counts
 */
export function generateAllStables(day: number, rng: Rng, config = STABLE_CONFIG): Stable[] {
  const stables: Stable[] = [];
  
  // Select and create elite stables from pool
  const selectedElite = shuffleAndPick(ELITE_POOL, config.elite.count, rng);
  for (const template of selectedElite) {
    const [minRep, maxRep] = config.elite.reputationRange;
    const personality = selectPersonality("elite", rng);
    const isSpecialist = personality === "specialist";
    stables.push({
      ...template,
      id: generateUUID(),
      tier: "elite",
      reputation: rng.int(minRep, maxRep),
      founded: Math.max(1, day - 365 * 3),
      cash: rng.int(500000, 1000000),
      horses: [],
      personality,
      ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
    });
  }
  
  // Select and create mid-tier stables from pool
  const selectedMid = shuffleAndPick(MID_POOL, config.mid.count, rng);
  for (const template of selectedMid) {
    const [minRep, maxRep] = config.mid.reputationRange;
    const personality = selectPersonality("mid", rng);
    const isSpecialist = personality === "specialist";
    stables.push({
      ...template,
      id: generateUUID(),
      tier: "mid",
      reputation: rng.int(minRep, maxRep),
      founded: Math.max(1, day - 365 * 2),
      cash: rng.int(150000, 350000),
      horses: [],
      personality,
      ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
    });
  }
  
  // Select and create budget stables from pool
  const selectedBudget = shuffleAndPick(BUDGET_POOL, config.budget.count, rng);
  for (const template of selectedBudget) {
    const [minRep, maxRep] = config.budget.reputationRange;
    const personality = selectPersonality("budget", rng);
    const isSpecialist = personality === "specialist";
    stables.push({
      ...template,
      id: generateUUID(),
      tier: "budget",
      reputation: rng.int(minRep, maxRep),
      founded: Math.max(1, day - 365),
      cash: rng.int(20000, 100000),
      horses: [],
      personality,
      ...(isSpecialist ? getSpecialistPreferences(rng) : {}),
    });
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
  return stables.find(s => s.id === id);
}

/**
 * Get all major stables (non-filler)
 */
export function getMajorStables(stables: Stable[]): Stable[] {
  return stables.filter(s => s.isMajor);
}

/**
 * Get stables by tier
 */
export function getStablesByTier(stables: Stable[], tier: StableTier): Stable[] {
  return stables.filter(s => s.tier === tier);
}

/**
 * Calculate starting cash for a stable based on tier
 */
export function getStartingCashForTier(tier: StableTier, rng: Rng): number {
  switch (tier) {
    case "elite": return rng.int(500000, 1000000);
    case "mid": return rng.int(150000, 350000);
    case "budget": return rng.int(20000, 70000);
  }
}

/**
 * Calculate target horse count for a stable based on tier
 */
export function getTargetHorseCountForTier(tier: StableTier, isMajor: boolean, rng: Rng): number {
  if (!isMajor) return 10; // Filler stables always have 10
  switch (tier) {
    case "elite": return rng.int(30, 40); // 30-40
    case "mid": return rng.int(20, 30); // 20-30
    case "budget": return rng.int(15, 25); // 15-25
  }
}
