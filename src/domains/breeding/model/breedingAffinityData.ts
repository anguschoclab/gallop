/**
 * breedingAffinityData.ts - Breeding affinity data
 *
 * This file provides famous nicking affinities and cross-family affinities
 * based on historical breeding data for sire line × dam line crosses.
 *
 * Dependencies: None (self-contained data)
 * Related files: strategy.ts (uses affinities for breeding scoring)
 */

// Famous nicking affinities - specific sire line × dam line crosses that have produced exceptional results
// Based on historical breeding data and Wikipedia article on Thoroughbred breeding theories
export const NICKING_AFFINITIES: Record<string, string[]> = {
  Danzig: ["Mr. Prospector", "Raise a Native", "Native Dancer"],
  "Mr. Prospector": ["Danzig", "Northern Dancer", "Storm Bird"],
  "Northern Dancer": ["Mr. Prospector", "Raise a Native", "Bold Ruler"],
  "Storm Cat": ["Mr. Prospector", "A.P. Indy", "Seattle Slew"],
  "A.P. Indy": ["Mr. Prospector", "Storm Cat", "Danzig"],
  "Seattle Slew": ["Mr. Prospector", "Bold Ruler", "Northern Dancer"],
  "Sadler's Wells": ["Danzig", "Storm Cat", "Mr. Prospector"],
  Galileo: ["Danzig", "Storm Cat", "Sadler's Wells"],
  Tapit: ["A.P. Indy", "Mr. Prospector", "Storm Cat"],
  "Bold Ruler": ["Princequillo", "Nasrullah", "Nearco"],
  Nasrullah: ["Princequillo", "Bold Ruler", "Nearco"],
  Secretariat: ["Princequillo", "Bold Ruler", "Nasrullah"],
};

// Cross-family nicking — Bruce Lowe family × sire-line affinities. Specific
// historical pairings produced exceptional progeny rates. Curated table:
// keys are sire bloodlines; values are { family: bonus } where bonus is the
// score boost (0..1) when dam belongs to that Bruce Lowe family.
export const CROSS_FAMILY_AFFINITIES: Record<string, Record<number, number>> = {
  "Northern Dancer": { 1: 0.8, 5: 0.7, 9: 0.6 },
  "Mr. Prospector": { 1: 0.75, 4: 0.7, 9: 0.65 },
  "Sadler's Wells": { 1: 0.85, 14: 0.7 },
  "Storm Cat": { 4: 0.7, 8: 0.65 },
  "Sunday Silence": { 1: 0.7, 9: 0.65, 12: 0.6 },
  Galileo: { 1: 0.85, 14: 0.75 },
  "A.P. Indy": { 1: 0.7, 8: 0.65 },
  "Seattle Slew": { 1: 0.7, 8: 0.6 },
  "Bold Ruler": { 4: 0.7, 14: 0.65 },
};

export interface BreedingCompatibilityResult {
  overallScore: number;
  factors: {
    nicking: { score: number; description: string };
    dosage: { score: number; description: string };
    inbreeding: { score: number; description: string; warning?: string };
    parentPerformance: { score: number; description: string };
    conformation: { score: number; description: string };
    temperament: { score: number; description: string };
    foundationStock: { score: number; description: string };
    founderEffect: { score: number; description: string; warning?: string };
    genetic: { score: number; description: string; warning?: string };
    blueHen: { score: number; description: string; isBlueHen: boolean };
    crossFamily: { score: number; description: string };
  };
  recommendation: string;
}
