/**
 * Main procedural horse name generator.
 */

import type { Rng } from "@/game/rng";
import type { RegionalSystem } from "@/game/types";
import { generatePortmanteau, extractAndCombine, generateSoundAlike, generateReverseHomage } from "./pedigreePatterns";
import { generateAncestorHomage } from "./ancestorHomage";
import { generateThematicName, type NamingTheme } from "./thematicNaming";
import { generateRegionalName } from "./regionalConventions";
import { validateHorseName } from "./jockeyClubRules";
import { randomHorseName as fallbackRandomHorseName } from "@/core/common/random";

export interface NamingContext {
  sireName?: string;
  damName?: string;
  namingTheme?: NamingTheme;
  region?: RegionalSystem;
  existingNames: Set<string>;
  deceasedNames?: Set<string>;
}

export interface NamingOptions {
  strategy?: "pedigree" | "thematic" | "ancestor" | "regional" | "hybrid";
  maxAttempts?: number;
}

/**
 * Generate a procedural horse name based on the provided context and strategy.
 */
export function generateProceduralHorseName(
  context: NamingContext,
  rng: Rng,
  options: NamingOptions = {}
): string {
  const { strategy = "hybrid", maxAttempts = 20 } = options;
  const { existingNames, deceasedNames } = context;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let candidate: string | undefined;

    const currentStrategy = strategy === "hybrid" ? pickStrategy(context, rng) : strategy;

    switch (currentStrategy) {
      case "pedigree":
        if (context.sireName && context.damName) {
          candidate = rng.next() < 0.5 
            ? generatePortmanteau(context.sireName, context.damName, rng)
            : extractAndCombine(context.sireName, context.damName, rng);
        } else if (context.sireName || context.damName) {
          candidate = generateSoundAlike(context.sireName || context.damName!, rng);
        }
        break;

      case "ancestor":
        candidate = generateAncestorHomage(context.sireName, context.damName, rng);
        break;

      case "thematic":
        if (context.namingTheme) {
          candidate = generateThematicName(context.namingTheme, rng);
        }
        break;

      case "regional":
        if (context.region) {
          candidate = generateRegionalName(context.region, rng);
        }
        break;
    }

    // Fallback if strategy failed to produce a name
    if (!candidate) {
      candidate = fallbackRandomHorseName(rng);
    }

    // Validate name
    const validation = validateHorseName(candidate, existingNames, deceasedNames);
    if (validation.isValid) {
      return candidate;
    }
  }

  // Final fallback: append a number if all else fails (rare)
  const finalFallback = fallbackRandomHorseName(rng);
  return `${finalFallback.slice(0, 14)} ${rng.int(10, 99)}`;
}

function pickStrategy(context: NamingContext, rng: Rng): NamingOptions["strategy"] {
  const r = rng.next();
  if (context.sireName && context.damName && r < 0.4) return "pedigree";
  if ((context.sireName || context.damName) && r < 0.6) return "ancestor";
  if (context.namingTheme && r < 0.85) return "thematic";
  if (context.region) return "regional";
  return "thematic"; // Default to thematic if no region provided
}
