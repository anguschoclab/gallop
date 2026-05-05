import type { Horse } from "./types";
import { calculateDosageMetrics, interpretDosageIndex } from "./dosage";
import { findHorseByName, type PedigreeHorse } from "./pedigreeData";
import { TRAIT_SCORE } from "./geneticsEngine";

/**
 * Calculate genetic compatibility based on horse genome research
 * Based on the Wikipedia article on Horse Genome which identified:
 * - Genes governing sensory perception, signal transduction, and immunity
 * - Breed-specific genetic variations (1 million SNPs cataloged)
 * - Leopard complex (Lp) gene linked to TRPM1 and CSNB risk
 */
export function calculateGeneticCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string; warning?: string } {
  const sireGenetics = sire.geneticMarkers || {};
  const damGenetics = dam.geneticMarkers || {};

  let score = 0;
  const warnings: string[] = [];

  // Evaluate sensory perception genes
  const sensoryScore = evaluateGeneticTrait(
    sireGenetics.sensoryPerception,
    damGenetics.sensoryPerception,
  );
  score += sensoryScore * 0.25;

  // Evaluate signal transduction genes
  const signalScore = evaluateGeneticTrait(
    sireGenetics.signalTransduction,
    damGenetics.signalTransduction,
  );
  score += signalScore * 0.25;

  // Evaluate immunity genes
  const immunityScore = evaluateGeneticTrait(sireGenetics.immunity, damGenetics.immunity);
  score += immunityScore * 0.25;

  // Evaluate genetic diversity (breed-specific variations)
  const sireDiversity = sireGenetics.geneticDiversity || 0.5;
  const damDiversity = damGenetics.geneticDiversity || 0.5;
  const avgDiversity = (sireDiversity + damDiversity) / 2;
  score += avgDiversity * 0.25;

  // Check for Leopard complex (Lp) homozygous risk
  if (sireGenetics.leopardComplex === "dominant" && damGenetics.leopardComplex === "dominant") {
    warnings.push("Both parents homozygous for Leopard complex - high CSNB risk in foal");
  }

  // Check for covering sickness transmission risk
  // Based on Wikipedia: Covering sickness is a sexually transmitted disease
  if (sire.healthStatus === "covering_sickness" || dam.healthStatus === "covering_sickness") {
    warnings.push(
      "High risk of covering sickness (dourine) transmission - sexually transmitted disease with 50%+ mortality",
    );
  }

  let description = "Moderate genetic compatibility";
  if (score >= 0.8) description = "Excellent genetic compatibility";
  else if (score >= 0.6) description = "Good genetic compatibility";
  else if (score >= 0.4) description = "Moderate genetic compatibility";
  else description = "Poor genetic compatibility";

  return {
    score,
    description,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

/**
 * Calculate blue hen contribution based on dam's production record
 * Based on the Breednet article on Blue Hens:
 * - Blue hens are exceptional broodmares that produce multiple high-quality offspring
 * - They often produce multiple Group 1 winners (e.g., Polished Gem produced Kyprios and other G1 winners)
 * - Blue hen status is determined by the quality and quantity of offspring
 */
export function calculateBlueHenContribution(dam: Horse): {
  score: number;
  description: string;
  isBlueHen: boolean;
} {
  const blueHenStatus = dam.blueHenStatus;

  if (!blueHenStatus) {
    return { score: 0.3, description: "Unknown production record", isBlueHen: false };
  }

  let score = 0.3; // Base score for any mare

  // Bonus for stakes winners
  score += Math.min(blueHenStatus.stakesWinnersProduced * 0.15, 0.3);

  // Bonus for Group 1 winners (more valuable)
  score += Math.min(blueHenStatus.group1WinnersProduced * 0.25, 0.3);

  // Blue hen score contribution
  score += (blueHenStatus.blueHenScore / 100) * 0.1;

  score = Math.min(score, 1.0);

  const isBlueHen = blueHenStatus.isBlueHen;

  let description = "Standard production record";
  if (isBlueHen) {
    description = `Blue Hen - ${blueHenStatus.stakesWinnersProduced} stakes winners, ${blueHenStatus.group1WinnersProduced} G1 winners`;
  } else if (blueHenStatus.stakesWinnersProduced >= 2) {
    description = `Excellent producer - ${blueHenStatus.stakesWinnersProduced} stakes winners`;
  } else if (blueHenStatus.stakesWinnersProduced >= 1) {
    description = `Good producer - ${blueHenStatus.stakesWinnersProduced} stakes winner${blueHenStatus.stakesWinnersProduced > 1 ? "s" : ""}`;
  }

  return { score, description, isBlueHen };
}

function evaluateGeneticTrait(sireTrait: string | undefined, damTrait: string | undefined): number {
  const sireValue = TRAIT_SCORE[sireTrait || "fair"] ?? 0.5;
  const damValue = TRAIT_SCORE[damTrait || "fair"] ?? 0.5;
  return (sireValue + damValue) / 2;
}

/**
 * Calculate founder effect score
 * Based on the Wikipedia article on Foundation Stock which explains the founder effect:
 * "The loss of genetic variation that occurs when a new population is established by a very small number of individuals"
 * Founder effect creates standardized breeds through fixation of traits, but excessive inbreeding can make populations vulnerable
 */
export function calculateFounderEffect(
  sireName: string,
  damName: string,
): { score: number; description: string; warning?: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { score: 0.5, description: "Unknown pedigree" };
  }

  // Count unique ancestors in 4 generations to assess genetic diversity
  const sireAncestors = new Set<string>();
  const damAncestors = new Set<string>();

  function collectAncestors(
    horse: PedigreeHorse | undefined,
    depth: number = 0,
    ancestors: Set<string>,
  ): void {
    if (depth > 4 || !horse) return;
    ancestors.add(horse.name);

    if (horse.sire) {
      const sireHorse = findHorseByName(horse.sire);
      if (sireHorse) collectAncestors(sireHorse, depth + 1, ancestors);
    }
    if (horse.dam) {
      const damHorse = findHorseByName(horse.dam);
      if (damHorse) collectAncestors(damHorse, depth + 1, ancestors);
    }
  }

  collectAncestors(sire, 0, sireAncestors);
  collectAncestors(dam, 0, damAncestors);

  // Combine and count unique ancestors
  const allAncestors = new Set([...sireAncestors, ...damAncestors]);
  const uniqueCount = allAncestors.size;

  // Expected maximum unique ancestors in 4 generations (theoretical maximum is ~30)
  // Lower count indicates stronger founder effect (more inbreeding)
  const expectedMax = 30;
  const diversityRatio = uniqueCount / expectedMax;

  let description = "";
  let warning = "";

  if (diversityRatio >= 0.8) {
    description = "High genetic diversity - low founder effect";
  } else if (diversityRatio >= 0.6) {
    description = "Moderate genetic diversity";
  } else if (diversityRatio >= 0.4) {
    description = "Limited genetic diversity - moderate founder effect";
  } else if (diversityRatio >= 0.2) {
    description = "Low genetic diversity - strong founder effect";
    warning = "Strong founder effect may limit genetic variation";
  } else {
    description = "Very low genetic diversity - severe founder effect";
    warning = "Severe founder effect - high risk of genetic issues";
  }

  // Score: higher diversity is better for long-term viability
  // However, some founder effect is necessary for breed standardization
  const score = Math.min(diversityRatio + 0.2, 1); // Base score with minimum

  return { score, description, warning };
}

/**
 * Calculate foundation stock proximity score
 * Horses closer to foundation stock (especially the 3 major sires and foundation mares) get a bonus
 * Based on the Wikipedia article on Foundation Stock which notes the importance of tracing to foundation animals
 */
export function calculateFoundationStockProximity(
  sireName: string,
  damName: string,
): { score: number; description: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { score: 0, description: "Unknown pedigree" };
  }

  let score = 0;
  const reasons: string[] = [];

  // Check for major foundation sires in pedigree (within 4 generations)
  const majorFoundationSires = ["Byerley Turk", "Darley Arabian", "Godolphin Arabian"];

  function checkForFoundationInLine(horse: PedigreeHorse | undefined, depth: number = 0): void {
    if (depth > 4 || !horse) return;

    if (horse.isFoundationSire) {
      if (majorFoundationSires.includes(horse.name)) {
        score += 0.15; // Major foundation sire
        reasons.push(`Major foundation sire ${horse.name} in pedigree`);
      } else {
        score += 0.05; // Minor foundation sire
        reasons.push(`Minor foundation sire ${horse.name} in pedigree`);
      }
    }

    if (horse.isFoundationMare) {
      score += 0.1; // Foundation mare
      reasons.push(`Foundation mare ${horse.name} (Family ${horse.bruceLoweFamily})`);
    }

    if (horse.sire) {
      const sireHorse = findHorseByName(horse.sire);
      if (sireHorse) checkForFoundationInLine(sireHorse, depth + 1);
    }
  }

  // Check sire line
  checkForFoundationInLine(sire);

  // Check dam line (tail-female is especially important)
  checkForFoundationInLine(dam);

  // Bonus for Bruce Lowe family consistency (same family on both sides can be good or bad depending on context)
  if (sire.bruceLoweFamily && dam.bruceLoweFamily) {
    if (sire.bruceLoweFamily === dam.bruceLoweFamily) {
      score += 0.05; // Same family - can indicate strong linebreeding
      reasons.push(`Both from Bruce Lowe Family ${sire.bruceLoweFamily}`);
    }
  }

  // Cap the score at 0.5 (50% bonus maximum from foundation stock)
  score = Math.min(score, 0.5);

  let description = "Limited foundation stock proximity";
  if (score >= 0.4) description = "Excellent foundation stock proximity";
  else if (score >= 0.25) description = "Strong foundation stock proximity";
  else if (score >= 0.15) description = "Moderate foundation stock proximity";
  else if (score >= 0.05) description = "Some foundation stock influence";

  if (reasons.length > 0) {
    description += ` (${reasons.slice(0, 2).join(", ")})`;
  }

  return { score, description };
}

// Famous nicking affinities - specific sire line × dam line crosses that have produced exceptional results
// Based on historical breeding data and Wikipedia article on Thoroughbred breeding theories
const NICKING_AFFINITIES: Record<string, string[]> = {
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

/**
 * Check if there's a nicking affinity between sire and dam lines
 */
export function checkNickingAffinity(
  sireName: string,
  damName: string,
): { hasAffinity: boolean; affinity: number; description: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { hasAffinity: false, affinity: 0, description: "Unknown pedigree" };
  }

  // Check if sire is in our nicking database
  const sireLine = sire.sire || sire.name;
  const damSireLine = dam.sire;

  if (!damSireLine) {
    return { hasAffinity: false, affinity: 0, description: "No dam sire data" };
  }

  // Check for direct nicking affinity
  const affinities = NICKING_AFFINITIES[sireLine] || [];
  if (affinities.includes(damSireLine)) {
    return {
      hasAffinity: true,
      affinity: 0.3, // 30% bonus for known nicking
      description: `Strong nicking: ${sireLine} × ${damSireLine}`,
    };
  }

  // Check if dam's sire is in the same general sire line family
  const damSire = findHorseByName(damSireLine);
  if (damSire && damSire.sire) {
    const grandSire = damSire.sire;
    if (affinities.includes(grandSire)) {
      return {
        hasAffinity: true,
        affinity: 0.15, // 15% bonus for indirect nicking
        description: `Moderate nicking: ${sireLine} × ${damSireLine} (via ${grandSire})`,
      };
    }
  }

  return { hasAffinity: false, affinity: 0, description: "No known nicking" };
}

/**
 * Calculate inbreeding coefficient based on shared ancestors in pedigree
 * Simplified version - checks for common ancestors in first 4 generations
 */
export function calculateInbreedingCoefficient(
  sireName: string,
  damName: string,
): { coefficient: number; warning: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { coefficient: 0, warning: "" };
  }

  // BFS both pedigrees to depth 4 so dam-line ancestors aren't ignored.
  const sireAncestors = new Set<string>();
  const damAncestors = new Set<string>();
  // Without this, two horses sharing only a common dam-line ancestor would
  // register as unrelated.
  const collectAncestorsByDepth = (root: ReturnType<typeof findHorseByName>) => {
    const depths = new Map<string, number>();
    if (!root) return depths;
    type Frontier = { node: typeof root; depth: number };
    const queue: Frontier[] = [{ node: root, depth: 0 }];
    while (queue.length) {
      const item = queue.shift()!;
      const node = item.node;
      const depth = item.depth;
      if (!node || depth > 4) continue;
      if (!depths.has(node.name) || depths.get(node.name)! > depth) {
        depths.set(node.name, depth);
      }
      if (depth >= 4) continue;
      if (node.sire) {
        const next = findHorseByName(node.sire);
        if (next) queue.push({ node: next, depth: depth + 1 });
      }
      if (node.dam) {
        const next = findHorseByName(node.dam);
        if (next) queue.push({ node: next, depth: depth + 1 });
      }
    }
    return depths;
  };

  const sireDepths = collectAncestorsByDepth(sire);
  const damDepths = collectAncestorsByDepth(dam);
  for (const k of sireDepths.keys()) sireAncestors.add(k);
  for (const k of damDepths.keys()) damAncestors.add(k);

  // Find common ancestors
  const common = [...sireAncestors].filter((x) => damAncestors.has(x));

  if (common.length === 0) {
    return { coefficient: 0, warning: "" };
  }

  // Wright's coefficient: each common ancestor contributes (1/2)^(d_s + d_d + 1)
  // where d_s and d_d are its shallowest depth in each pedigree (0 = self,
  // which is filtered out below). Walking dam lines via BFS above means
  // mare-side relatedness now contributes too.
  let coefficient = 0;
  for (const ancestor of common) {
    const ds = sireDepths.get(ancestor);
    const dd = damDepths.get(ancestor);
    if (ds === undefined || dd === undefined) continue;
    if (ds === 0 || dd === 0) continue; // skip the parents themselves
    coefficient += Math.pow(0.5, ds + dd + 1);
  }

  // Warning for excessive inbreeding
  if (coefficient > 0.125) {
    return { coefficient, warning: "High inbreeding - may reduce vigor" };
  } else if (coefficient > 0.0625) {
    return { coefficient, warning: "Moderate inbreeding - monitor closely" };
  }

  return { coefficient, warning: "" };
}

/**
 * Calculate dosage compatibility between sire and dam
 * Returns a score from 0-1, with higher being better compatibility
 */
export function calculateDosageCompatibility(
  sireName: string,
  damName: string,
): { score: number; description: string } {
  const sireMetrics = calculateDosageMetrics(sireName);
  const damMetrics = calculateDosageMetrics(damName);

  const sireDI = sireMetrics.dosageIndex;
  const damDI = damMetrics.dosageIndex;

  // If we can't calculate dosage for one or both
  if (!isFinite(sireDI) || !isFinite(damDI)) {
    return { score: 0.5, description: "Insufficient pedigree data" };
  }

  // Ideal: balance speed and stamina
  // If sire is high-speed (high DI), breed to stamina-oriented dam (low DI)
  // If both are similar, it's okay but not optimal
  const diff = Math.abs(sireDI - damDI);

  if (diff < 0.5) {
    // Similar dosage profiles - neutral
    return { score: 0.6, description: "Similar dosage profiles" };
  } else if (diff < 1.5) {
    // Good balance
    return { score: 0.8, description: "Good speed/stamina balance" };
  } else if (diff < 2.5) {
    // Excellent complementary profiles
    return { score: 0.95, description: "Excellent complementary dosage" };
  } else {
    // Too different - may not work well
    return { score: 0.4, description: "Very different dosage profiles" };
  }
}

/**
 * Calculate parent performance score based on race history
 * "Breed the best to the best" - good racehorses make better breeding stock
 */
export function calculateParentPerformance(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  let sireScore = 0;
  let damScore = 0;

  // Evaluate sire's performance
  const sireWins = sire.raceHistory.filter((r) => r.position === 1).length;
  const sirePlaces = sire.raceHistory.filter((r) => r.position <= 3).length;
  const sireGraded = sire.raceHistory.filter((r) => r.grade).length;
  const sireGradedWins = sire.raceHistory.filter((r) => r.grade && r.position === 1).length;

  // Sire scoring
  sireScore += sireWins * 2;
  sireScore += sirePlaces * 0.5;
  sireScore += sireGradedWins * 5; // Bonus for graded wins
  sireScore += sireGraded * 0.5; // Bonus for graded appearances

  // Evaluate dam's performance (mares can outbreed their track record)
  const damWins = dam.raceHistory.filter((r) => r.position === 1).length;
  const damPlaces = dam.raceHistory.filter((r) => r.position <= 3).length;
  const damGraded = dam.raceHistory.filter((r) => r.grade).length;
  const damGradedWins = dam.raceHistory.filter((r) => r.grade && r.position === 1).length;

  // Dam scoring (slightly higher weight as quality mares produce high-class runners)
  damScore += damWins * 2.5;
  damScore += damPlaces * 0.75;
  damScore += damGradedWins * 6;
  damScore += damGraded * 0.75;

  // Normalize scores
  const maxScore = 50; // Arbitrary maximum
  const combinedScore = Math.min(sireScore + damScore, maxScore);
  const normalizedScore = combinedScore / maxScore;

  let description = "Limited race record";
  if (normalizedScore > 0.8) description = "Exceptional racing performers";
  else if (normalizedScore > 0.6) description = "Strong racing performers";
  else if (normalizedScore > 0.4) description = "Moderate racing performers";
  else if (normalizedScore > 0.2) description = "Some racing success";

  return { score: normalizedScore, description };
}

/**
 * Calculate conformation compatibility
 * Conformation is the single most important factor
 */
export function calculateConformationCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  const sireConf = sire.conformation || "fair";
  const damConf = dam.conformation || "fair";

  const sireValue = TRAIT_SCORE[sireConf];
  const damValue = TRAIT_SCORE[damConf];

  // Both parents should have good conformation
  const avgValue = (sireValue + damValue) / 2;

  let description = "Average conformation";
  if (avgValue >= 0.875) description = "Excellent conformation on both sides";
  else if (avgValue >= 0.625) description = "Good conformation";
  else if (avgValue >= 0.375) description = "Fair conformation";
  else description = "Poor conformation - risk factor";

  return { score: avgValue, description };
}

/**
 * Calculate temperament compatibility
 * Temperament is important for racehorse confidence
 */
export function calculateTemperamentCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  const sireTemp = sire.temperament || "fair";
  const damTemp = dam.temperament || "fair";

  const sireValue = TRAIT_SCORE[sireTemp];
  const damValue = TRAIT_SCORE[damTemp];

  const avgValue = (sireValue + damValue) / 2;

  let description = "Average temperament";
  if (avgValue >= 0.875) description = "Excellent temperament on both sides";
  else if (avgValue >= 0.625) description = "Good temperament";
  else if (avgValue >= 0.375) description = "Fair temperament";
  else description = "Poor temperament - may affect performance";

  return { score: avgValue, description };
}

/**
 * Overall breeding compatibility score
 * Combines all factors with appropriate weights
 */
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

// Cross-family nicking — Bruce Lowe family × sire-line affinities. Specific
// historical pairings produced exceptional progeny rates. Curated table:
// keys are sire bloodlines; values are { family: bonus } where bonus is the
// score boost (0..1) when dam belongs to that Bruce Lowe family.
const CROSS_FAMILY_AFFINITIES: Record<string, Record<number, number>> = {
  "Northern Dancer": { 1: 0.8, 5: 0.7, 9: 0.6 },
  "Mr. Prospector": { 1: 0.75, 4: 0.7, 9: 0.65 },
  "Sadler's Wells": { 1: 0.85, 14: 0.7 },
  "Storm Cat": { 4: 0.7, 8: 0.65 },
  "Sunday Silence": { 1: 0.7, 9: 0.65, 12: 0.6 },
  "Galileo": { 1: 0.85, 14: 0.75 },
  "A.P. Indy": { 1: 0.7, 8: 0.65 },
  "Seattle Slew": { 1: 0.7, 8: 0.6 },
  "Bold Ruler": { 4: 0.7, 14: 0.65 },
};

export function calculateCrossFamilyAffinity(sire: Horse, dam: Horse): { score: number; description: string } {
  const bloodline = sire.bloodline;
  const family = dam.bruceLoweFamily;
  if (!bloodline || family === undefined || !CROSS_FAMILY_AFFINITIES[bloodline]) {
    return { score: 0.4, description: "No documented cross-family affinity" };
  }
  const bonus = CROSS_FAMILY_AFFINITIES[bloodline][family] ?? 0.4;
  if (bonus >= 0.7) {
    return { score: bonus, description: `Strong cross: ${bloodline} × Family ${family}` };
  }
  if (bonus >= 0.55) {
    return { score: bonus, description: `Notable cross: ${bloodline} × Family ${family}` };
  }
  return { score: bonus, description: `Standard cross: ${bloodline} × Family ${family}` };
}

export function calculateBreedingCompatibility(
  sire: Horse,
  dam: Horse,
): BreedingCompatibilityResult {
  const nicking = checkNickingAffinity(sire.sireName || "", dam.sireName || "");
  const dosage = calculateDosageCompatibility(sire.sireName || "", dam.sireName || "");
  const inbreeding = calculateInbreedingCoefficient(sire.sireName || "", dam.sireName || "");
  const parentPerformance = calculateParentPerformance(sire, dam);
  const conformation = calculateConformationCompatibility(sire, dam);
  const temperament = calculateTemperamentCompatibility(sire, dam);
  const foundationStock = calculateFoundationStockProximity(
    sire.sireName || "",
    dam.sireName || "",
  );
  const founderEffect = calculateFounderEffect(sire.sireName || "", dam.sireName || "");
  const genetic = calculateGeneticCompatibility(sire, dam);
  const blueHen = calculateBlueHenContribution(dam);
  const crossFamily = calculateCrossFamilyAffinity(sire, dam);

  // Calculate inbreeding score (inverse of coefficient - lower is better)
  const inbreedingScore = Math.max(0, 1 - inbreeding.coefficient * 4); // Penalize high inbreeding

  // Weighted overall score (11 factors, sums to 1.0). Cross-family takes 5%
  // pulled proportionally from the larger factors.
  const weights = {
    nicking: 0.07,
    dosage: 0.07,
    inbreeding: 0.13,
    parentPerformance: 0.15,
    conformation: 0.07,
    temperament: 0.05,
    foundationStock: 0.09,
    founderEffect: 0.09,
    genetic: 0.11,
    blueHen: 0.11,
    crossFamily: 0.06,
  };

  const overallScore =
    nicking.affinity * weights.nicking +
    dosage.score * weights.dosage +
    inbreedingScore * weights.inbreeding +
    parentPerformance.score * weights.parentPerformance +
    conformation.score * weights.conformation +
    temperament.score * weights.temperament +
    foundationStock.score * weights.foundationStock +
    founderEffect.score * weights.founderEffect +
    genetic.score * weights.genetic +
    blueHen.score * weights.blueHen +
    crossFamily.score * weights.crossFamily;

  // Generate recommendation
  let recommendation = "";
  if (overallScore >= 0.8) {
    recommendation = "Excellent mating - highly recommended";
  } else if (overallScore >= 0.65) {
    recommendation = "Good mating - should produce quality foal";
  } else if (overallScore >= 0.5) {
    recommendation = "Acceptable mating - moderate expectations";
  } else if (overallScore >= 0.35) {
    recommendation = "Risky mating - low probability of success";
  } else {
    recommendation = "Poor mating - not recommended";
  }

  if (inbreeding.warning) {
    recommendation += `. ${inbreeding.warning}`;
  }
  if (founderEffect.warning) {
    recommendation += `. ${founderEffect.warning}`;
  }
  if (genetic.warning) {
    recommendation += `. ${genetic.warning}`;
  }

  return {
    overallScore,
    factors: {
      nicking: { score: nicking.affinity, description: nicking.description },
      dosage: dosage,
      inbreeding: {
        score: inbreedingScore,
        description: `Coefficient: ${(inbreeding.coefficient * 100).toFixed(1)}%`,
        warning: inbreeding.warning,
      },
      parentPerformance,
      conformation,
      temperament,
      foundationStock,
      founderEffect,
      genetic,
      blueHen,
      crossFamily,
    },
    recommendation,
  };
}
