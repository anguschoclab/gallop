/**
 * archetypeTypes.ts - Archetype type definition
 *
 * Extracted from archetypes.ts for modularity.
 */

export type Archetype = {
  id: string;
  name: string;
  description: string;
  targetPhenotype: {
    speed: number;
    stamina: number;
    acceleration: number;
    consistency: number;
    distance: number;
    surface: "Turf" | "Dirt" | "Synthetic" | "Versatile";
    trainability: number;
    durability: number;
    peakAge: number;
  };
  weights: {
    speed: number;
    stamina: number;
    acceleration: number;
    consistency: number;
  };
};
