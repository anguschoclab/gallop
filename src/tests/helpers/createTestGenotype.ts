import type {
  Genotype,
  Locus,
  Allele,
  ColorGenotype,
  StatGenotype,
  PreferenceGenotype,
  MarkerGenotype,
  HealthGenotype,
  MarkingsGenotype,
} from "@/game/types";

/**
 * Creates a valid test allele (1-10).
 *
 * @param value - Initial allele value (defaults to 5)
 * @returns Valid Allele number
 */
function createAllele(value: number = 5): Allele {
  return Math.max(1, Math.min(5, value));
}

/**
 * Creates a valid test locus.
 *
 * @param allele1 - First allele value (defaults to 5)
 * @param allele2 - Second allele value (defaults to 5)
 * @returns Locus tuple [Allele, Allele]
 */
function createLocus(allele1: number = 5, allele2: number = 5): Locus {
  return [createAllele(allele1), createAllele(allele2)];
}

/**
 * Creates a valid test color genotype.
 *
 * @returns ColorGenotype object
 */
function createColorGenotype(): ColorGenotype {
  return {
    extension: createLocus(1, 0), // E/e - black/chestnut
    agouti: createLocus(1, 0), // A/a - bay/black
    gray: createLocus(0, 0), // G/g - gray/non-gray
    cream: createLocus(0, 0), // Cr/n - dilute/normal
  };
}

/**
 * Creates a valid test stat genotype (10 loci each).
 *
 * @returns StatGenotype object
 */
function createStatGenotype(): StatGenotype {
  return {
    speed: Array(10)
      .fill(null)
      .map(() => createLocus()),
    stamina: Array(10)
      .fill(null)
      .map(() => createLocus()),
    acceleration: Array(10)
      .fill(null)
      .map(() => createLocus()),
    consistency: Array(10)
      .fill(null)
      .map(() => createLocus()),
  };
}

/**
 * Creates a valid test preference genotype.
 *
 * @returns PreferenceGenotype object
 */
function createPreferenceGenotype(): PreferenceGenotype {
  return {
    distance: createLocus(5, 5), // Middle distance preference
    surface: createLocus(5, 5), // Balanced surface preference
    climbing: createLocus(5, 5), // Average climbing ability
    cornering: createLocus(5, 5), // Average cornering ability
  };
}

/**
 * Creates a valid test marker genotype.
 *
 * @returns MarkerGenotype object
 */
function createMarkerGenotype(): MarkerGenotype {
  return {
    leopardComplex: "recessive",
    csnbRisk: "low",
    sensoryPerception: "good",
    signalTransduction: "good",
    immunity: "good",
    geneticDiversity: 0.8,
    lethalCarriers: {
      csnb: false,
      hypp: false,
      olws: false,
      ffs1: false,
    },
  };
}

/**
 * Creates a valid test health genotype.
 *
 * @returns HealthGenotype object
 */
function createHealthGenotype(): HealthGenotype {
  return {
    bleeder: createLocus(2, 2), // Low bleeder risk
    roarer: createLocus(2, 2), // Low roarer risk
    ocd: createLocus(2, 2), // Low OCD risk
    efna5: createLocus(8, 8), // Good EFNA5 (racing viable)
  };
}

/**
 * Creates a valid test markings genotype.
 *
 * @returns MarkingsGenotype object
 */
function createMarkingsGenotype(): MarkingsGenotype {
  return {
    socks: createLocus(2, 2),
    face: createLocus(2, 2),
    silverDapple: createLocus(0, 0),
    sabino: createLocus(0, 0),
    splashWhite: createLocus(0, 0),
  };
}

/**
 * Creates a complete valid test genotype with all required properties.
 *
 * @param overrides - Optional genotype properties to override defaults
 * @returns Complete Genotype object
 */
export function createTestGenotype(overrides?: Partial<Genotype>): Genotype {
  return {
    color: createColorGenotype(),
    stats: createStatGenotype(),
    preferences: createPreferenceGenotype(),
    style: createLocus(5, 5), // Balanced running style
    mental: createLocus(5, 5), // Good temperament
    physical: createLocus(5, 5), // Good conformation
    durability: createLocus(5, 5), // Average durability
    size: createLocus(5, 5), // Average size
    markers: createMarkerGenotype(),
    heart: Array(5)
      .fill(null)
      .map(() => createLocus(5, 5)), // Good heart
    fiberType: createLocus(5, 5), // Balanced fiber type
    stride: createLocus(5, 5), // Balanced stride
    trackBias: createLocus(5, 5), // Balanced track preference
    mudAptitude: createLocus(5, 5), // Average mud aptitude
    trainability: createLocus(5, 5), // Good trainability
    peakAge: createLocus(5, 5), // Average peak age
    recovery: createLocus(5, 5), // Good recovery
    fertility: createLocus(5, 5), // Good fertility
    foalingEase: createLocus(5, 5), // Easy foaling
    markings: createMarkingsGenotype(),
    health: createHealthGenotype(),
    ...overrides,
  };
}
