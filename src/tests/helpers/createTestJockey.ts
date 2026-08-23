import type {
  Jockey,
  JockeyArchetype,
  JockeyStats,
  JockeyTrait,
  JockeySilk,
  JockeySilkPattern,
} from "@/game/types";
import { asJockeyId } from "@/core/types/branded";

/**
 * Creates a valid test jockey stats object.
 *
 * @param overrides - Optional stat properties to override defaults
 * @returns Complete JockeyStats object
 */
function createTestJockeyStats(overrides?: Partial<JockeyStats>): JockeyStats {
  return {
    pacing: 75, // Good stamina management
    positioning: 70, // Good race positioning
    vigor: 80, // Strong finish
    gateSkill: 75, // Good start
    temperament: 70, // Good with nervous horses
    ...overrides,
  };
}

/**
 * Creates a valid test jockey silk.
 *
 * @param overrides - Optional silk properties to override defaults
 * @returns Complete JockeySilk object
 */
function createTestJockeySilk(overrides?: Partial<JockeySilk>): JockeySilk {
  return {
    pattern: "solid" as JockeySilkPattern,
    primary: "#FF0000",
    secondary: "#FFFFFF",
    cap: "#FF0000",
    ...overrides,
  };
}

/**
 * Creates a complete valid test jockey with all required properties.
 *
 * @param overrides - Optional jockey properties to override defaults
 * @returns Complete Jockey object
 */
export function createTestJockey(overrides?: Partial<Jockey>): Jockey {
  const silk = createTestJockeySilk();
  return {
    id: asJockeyId("test-jockey-1"),
    name: "Test Jockey",
    age: 25,
    archetype: "versatile" as JockeyArchetype,
    tier: "mid" as Jockey["tier"],
    stats: createTestJockeyStats(),
    potential: 75,
    traits: [] as JockeyTrait[],
    silk: overrides?.silk ?? silk,
    careerStarts: 100,
    careerWins: 20,
    fame: 50,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 50,
    isApprentice: false,
    loyalty: 50,
    ...overrides,
  };
}

/**
 * Creates an array of test jockeys for race simulation.
 *
 * @param count - Number of jockeys to create (defaults to 10)
 * @returns Array of Jockey objects
 */
export function createTestJockeys(count: number = 10): Jockey[] {
  return Array.from({ length: count }, (_, i) =>
    createTestJockey({
      id: asJockeyId(`test-jockey-${i + 1}`),
      name: `Test Jockey ${i + 1}`,
    }),
  );
}
