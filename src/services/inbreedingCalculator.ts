import { findHorseByName, type PedigreeHorse } from "@/core/data/pedigreeData";

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
