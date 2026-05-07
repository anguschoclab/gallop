import type { Locus } from "@/core/common/types";
export type { Locus };

export type ColorGenotype = {
  extension: Locus; // E (black) or e (chestnut)
  agouti: Locus; // A (bay) or a (black)
  gray: Locus; // G (gray) or g (non-gray)
  cream: Locus; // Cr (dilute) or n (normal)
};

export type StatGenotype = {
  speed: Locus[]; // 10 loci
  stamina: Locus[]; // 10 loci
  acceleration: Locus[]; // 10 loci
  consistency: Locus[]; // 10 loci
};

export type PreferenceGenotype = {
  distance: Locus; // Maps to 800-3200m range
  surface: Locus; // Maps to Turf/Dirt/Synthetic bias
  climbing: Locus; // Hill power
  cornering: Locus; // Turn agility
};

export type MarkerGenotype = {
  leopardComplex: "dominant" | "recessive" | "heterozygous";
  csnbRisk: "high" | "low";
  sensoryPerception: "excellent" | "good" | "fair" | "poor";
  signalTransduction: "excellent" | "good" | "fair" | "poor";
  immunity: "excellent" | "good" | "fair" | "poor";
  geneticDiversity: number; // 0.5–1.0
  lethalCarriers: { csnb: boolean; hypp: boolean; olws: boolean; ffs1: boolean };
};

export type MarkingsGenotype = {
  socks: Locus;
  face: Locus;
  silverDapple: Locus;
  sabino: Locus;
  splashWhite: Locus;
};

export type HealthGenotype = {
  bleeder: Locus;
  roarer: Locus;
  ocd: Locus;
  efna5: Locus;
  pssm: Locus; // Polysaccharide Storage Myopathy
  rer: Locus; // Recurrent Exertional Rhabdomyolysis
  epm: Locus; // EPM immune susceptibility
};

export type Genotype = {
  color: ColorGenotype;
  stats: StatGenotype;
  preferences: PreferenceGenotype;
  style: Locus;
  mental: Locus;
  physical: Locus;
  durability: Locus;
  size: Locus;
  markers: MarkerGenotype;
  // --- New loci ---
  heart: Locus[];
  fiberType: Locus;
  stride: Locus;
  trackBias: Locus;
  mudAptitude: Locus;
  trainability: Locus;
  peakAge: Locus;
  recovery: Locus;
  fertility: Locus;
  foalingEase: Locus;
  markings: MarkingsGenotype;
  health: HealthGenotype;
};
