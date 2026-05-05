import type { Jockey, JockeyArchetype, JockeyStats, JockeyTrait, JockeySilk, JockeySilkPattern } from "@/game/types";

/**
 * Creates a valid test jockey stats object
 */
function createTestJockeyStats(overrides?: Partial<JockeyStats>): JockeyStats {
  return {
    pacing: 75,        // Good stamina management
    positioning: 70,   // Good race positioning
    vigor: 80,         // Strong finish
    gateSkill: 75,     // Good start
    temperament: 70,   // Good with nervous horses
    ...overrides,
  };
}

/**
 * Creates a valid test jockey silk
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
 * Creates a complete valid test jockey with all required properties
 */
export function createTestJockey(overrides?: Partial<Jockey>): Jockey {
  return {
    id: "test-jockey-1",
    name: "Test Jockey",
    age: 25,
    archetype: "versatile" as JockeyArchetype,
    stats: createTestJockeyStats(),
    traits: [] as JockeyTrait[],
    silk: createTestJockeySilk(),
    careerStarts: 100,
    careerWins: 20,
    fame: 50,
    ridingFee: 100,
    ...overrides,
  };
}

/**
 * Creates an array of test jockeys for race simulation
 */
export function createTestJockeys(count: number = 10): Jockey[] {
  return Array.from({ length: count }, (_, i) => 
    createTestJockey({
      id: `test-jockey-${i + 1}`,
      name: `Test Jockey ${i + 1}`,
    })
  );
}
