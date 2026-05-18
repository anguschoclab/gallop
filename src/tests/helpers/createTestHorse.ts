import type {
  Horse,
  HorseGender,
  Hemisphere,
  HorseStats,
  RunningStyle,
  HorseMarkings,
  HealthStatus,
  BlueHenStatus,
  CoatColor,
  Pedigree,
  StudCareer,
} from "@/game/types";
import { createTestGenotype } from "./createTestGenotype";
import { createTestAppearance } from "./createTestAppearance";


/**
 * Creates valid test horse stats.
 *
 * @param overrides - Optional stat properties to override defaults
 * @returns Complete HorseStats object
 */
function createTestHorseStats(overrides?: Partial<HorseStats>): HorseStats {
  return {
    speed: 70,
    stamina: 70,
    acceleration: 70,
    consistency: 70,
    temperament: 50,
    conformation: 50,
    ...overrides,
  };
}

/**
 * Creates valid test horse markings.
 *
 * @returns Complete HorseMarkings object
 */
function createTestHorseMarkings(): HorseMarkings {
  return {
    socks: "none",
    face: "none",
    silverDapple: false,
    sabino: false,
    splashWhite: false,
  };
}

/**
 * Creates a complete valid test horse with ALL required properties.
 *
 * @param overrides - Optional horse properties to override defaults
 * @returns Complete Horse object
 */
export function createTestHorse(overrides?: Partial<Horse>): Horse {
  return {
    // Basic properties
    id: "test-horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt" as HorseGender,
    hemisphere: "Northern" as Hemisphere,
    silk: "#FF0000",
    stats: createTestHorseStats(),
    genotype: createTestGenotype(),
    energy: 100,
    form: 0,
    potential: 75,
    raceHistory: [],
    owned: true,
    fame: 50,

    // Optional basic properties
    sireName: "Test Sire",
    damName: "Test Dam",
    conformation: 70,
    temperament: 70,
    healthStatus: "healthy" as HealthStatus,
    coatColor: "bay" as CoatColor,
    runningStyle: "P" as RunningStyle,

    // NPC system properties
    scoutedStats: undefined,
    lastScoutedDay: undefined,
    consignedSaleId: undefined,

    // Breeding properties
    blueHenStatus: undefined,
    foalsProduced: undefined,
    lastFoaledDay: undefined,
    pedigree: { name: overrides?.name ?? "Test Horse", generation: 0, sireName: "Test Sire", damName: "Test Dam" },
    stud: undefined,
    bruceLoweFamily: undefined,

    // REQUIRED performance properties
    distanceAptitude: 1600, // Middle distance preference (800-3200m)
    surfaceAptitude: {
      // Surface preference multipliers
      Turf: 1.0,
      Dirt: 1.0,
      Synthetic: 1.0,
    },
    climbingAptitude: 1.0, // Uphill stamina multiplier (0.8-1.2)
    corneringAptitude: 1.0, // Turn speed multiplier (0.8-1.2)
    injuryProneness: 0.1, // Injury chance (0-1)
    height: 15.2, // Hands (14.0-18.0)
    weight: 500, // kg (400-600)
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,

    // REQUIRED DNA traits (Tier 1+2)
    heartScore: 1.0, // Late-race stamina multiplier (0.85-1.15)
    fiberBias: "average", // Sprint vs stayer preference
    strideType: "average", // Short vs long stride
    trackPreference: "balanced", // Track handedness preference
    mudAptitude: 1.0, // Soft ground performance (0.85-1.15)

    // REQUIRED DNA traits (development & training)
    trainability: 1.0, // Training gain multiplier (0.5-1.4)
    peakAge: 4, // Peak ability age (3-7)
    recoveryRate: 1.0, // Energy regen multiplier (0.7-1.4)

    // REQUIRED DNA traits (reproduction)
    fertility: 0.85, // Conception probability (0.7-0.99)
    foalingEase: 0.9, // Complication risk multiplier (0.7-1.0)

    // REQUIRED cosmetic markings
    markings: createTestHorseMarkings(),

    // REQUIRED health susceptibility
    bleederRisk: 0.05, // Mid-race fade chance (0-0.15)
    roarerRisk: 0.03, // Stamina collapse chance (0-0.10)
    ocdRisk: 0.03, // Bone injury chance (0-0.10)

    // REQUIRED population genetics
    bloodline: "Test Line",
    heterozygosity: 0.8,
    coefficientOfInbreeding: 0.0,
    ancestralHistoryCoefficient: 0.5,
    inbreedingTier: "outcross",
    prepotency: 0.5,

    // REQUIRED racing viability
    racingViable: true,
    lifecycleStatus: "active" as const,
    appearance: createTestAppearance(),
    healthStatusDay: 1,
    gelded: false,
    fitness: 50,
    fatigue: 0,
    peakingIndex: 50,
    recoveryPoints: 100,
    birthDay: 1,
    courseVisits: {},

    // Apply any overrides
    ...overrides,
  };
}

/**
 * Creates a test horse with specific gender (colt).
 *
 * @param overrides - Optional horse properties to override defaults
 * @returns Complete Horse object
 */
export function createTestColt(overrides?: Partial<Horse>): Horse {
  return createTestHorse({ gender: "colt", age: 3, ...overrides });
}

/**
 * Create a test filly (female horse, age 3)
 * @param overrides - Optional properties to override
 * @returns Complete Horse object
 */
export function createTestFilly(overrides?: Partial<Horse>): Horse {
  return createTestHorse({ gender: "filly", age: 3, ...overrides });
}

/**
 * Create a test stallion (male horse, age 5)
 * @param overrides - Optional properties to override
 * @returns Complete Horse object
 */
export function createTestStallion(overrides?: Partial<Horse>): Horse {
  return createTestHorse({ gender: "horse", age: 5, ...overrides });
}

/**
 * Create a test mare (female horse, age 5)
 * @param overrides - Optional properties to override
 * @returns Complete Horse object
 */
export function createTestMare(overrides?: Partial<Horse>): Horse {
  return createTestHorse({ gender: "mare", age: 5, ...overrides });
}

/**
 * Create a test gelding (castrated male horse, age 4)
 * @param overrides - Optional properties to override
 * @returns Complete Horse object
 */
export function createTestGelding(overrides?: Partial<Horse>): Horse {
  return createTestHorse({ gender: "gelding", age: 4, ...overrides });
}

/**
 * Creates an array of test horses.
 *
 * @param count - Number of horses to create
 * @param baseOverrides - Optional horse properties to apply to all horses
 * @returns Array of Horse objects
 */
export function createTestHorses(count: number, baseOverrides?: Partial<Horse>): Horse[] {
  return Array.from({ length: count }, (_, i) =>
    createTestHorse({
      id: `test-horse-${i + 1}`,
      name: `Test Horse ${i + 1}`,
      ...baseOverrides,
    }),
  );
}

/**
 * Creates a test horse owned by NPC.
 *
 * @param overrides - Optional horse properties to override defaults
 * @returns Complete Horse object
 */
export function createTestNpcHorse(overrides?: Partial<Horse>): Horse {
  return createTestHorse({
    owned: false,
    stableId: "test-npc-stable-1",
    fame: 30,
    ...overrides,
  });
}
