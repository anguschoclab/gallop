import type { Stable, StableTier, StablePersonality } from "@/game/types";

/**
 * Create a complete Stable object for testing.
 * @param overrides - Partial stable properties to override defaults
 * @returns A complete Stable object
 */
export function createTestStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "test-stable-id",
    name: "Test Stable",
    owner: "Test Owner",
    tier: "mid" as StableTier,
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: [],
    isMajor: false,
    colors: { primary: "#000000", secondary: "#ffffff" },
    personality: "aggressive" as StablePersonality,
    staff: {
      trainer: null,
      groom: null,
      nutritionist: null,
      farrier: null,
      veterinarian: null,
    },
    outposts: [],
    ...overrides,
  };
}
