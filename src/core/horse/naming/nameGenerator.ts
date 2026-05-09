/**
 * nameGenerator.ts - Main procedural horse name generator
 *
 * This file provides the primary interface for generating horse names using various
 * strategies: pedigree-based, thematic, ancestor homage, and regional. It coordinates
 * with sub-modules for specific naming patterns and validates names against Jockey Club rules.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (RegionalSystem), ./pedigreePatterns, ./ancestorHomage, ./thematicNaming, ./regionalConventions, ./jockeyClubRules
 * Related files: horseFactory.ts (uses name generation for horse creation)
 */

import type { Rng } from "@/game/rng";
import type { RegionalSystem } from "@/game/types";
import {
  generatePortmanteau,
  extractAndCombine,
  generateSoundAlike,
  generateReverseHomage,
} from "./pedigreePatterns.ts";
import { generateAncestorHomage } from "./ancestorHomage.ts";
import { generateThematicName, type NamingTheme } from "./thematicNaming.ts";
import { generateRegionalName } from "./regionalConventions.ts";
import { validateHorseName } from "./jockeyClubRules.ts";

/**
 * Context for name generation, providing pedigree and naming preferences.
 */
export interface NamingContext {
  sireName?: string;
  damName?: string;
  namingTheme?: NamingTheme;
  region?: RegionalSystem;
  existingNames: Set<string>;
  deceasedNames?: Set<string>;
}

/**
 * Options for controlling name generation strategy.
 */
export interface NamingOptions {
  strategy?: "pedigree" | "thematic" | "ancestor" | "regional" | "hybrid";
  maxAttempts?: number;
}

/**
 * Generate a procedural horse name based on the provided context and strategy.
 *
 * This is the main entry point for horse name generation. It supports multiple strategies:
 * - pedigree: Combines sire and dam names (portmanteau or word extraction)
 * - ancestor: Pays homage to notable ancestors
 * - thematic: Uses stable personality-based naming themes
 * - regional: Applies regional naming conventions
 * - hybrid: Randomly selects from available strategies based on context
 *
 * @param context - Naming context with pedigree and preferences
 * @param rng - Random number generator for deterministic variation
 * @param options - Options for controlling name generation strategy
 * @param options.strategy - Naming strategy to use (defaults to "hybrid")
 * @param options.maxAttempts - Maximum validation attempts (defaults to 20)
 * @returns Generated horse name that passes validation
 *
 * @example
 * const name = generateProceduralHorseName(
 *   { sireName: "Seattle Slew", damName: "Gold Digger", existingNames: new Set() },
 *   rng,
 *   { strategy: "pedigree" }
 * );
 */
export function generateProceduralHorseName(
  context: NamingContext,
  rng: Rng,
  options: NamingOptions = {},
): string {
  const { strategy = "hybrid", maxAttempts = 20 } = options;
  const { existingNames, deceasedNames } = context;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let candidate: string | undefined;

    const currentStrategy = strategy === "hybrid" ? pickStrategy(context, rng) : strategy;

    switch (currentStrategy) {
      case "pedigree":
        if (context.sireName && context.damName) {
          candidate =
            rng.next() < 0.5
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
      candidate = generateThematicName("generic", rng);
    }

    // Validate name
    const validation = validateHorseName(candidate, existingNames, deceasedNames);
    if (validation.isValid) {
      return candidate;
    }
  }

  // Final fallback: append a number if all else fails (rare)
  const finalFallback = generateThematicName("generic", rng);
  return `${finalFallback.slice(0, 14)} ${rng.int(10, 99)}`;
}

/**
 * Randomly selects a naming strategy based on the available context.
 *
 * @param context - Naming context with pedigree and preferences
 * @param rng - Random number generator
 * @returns Selected naming strategy
 */
function pickStrategy(context: NamingContext, rng: Rng): NamingOptions["strategy"] {
  const r = rng.next();
  if (context.sireName && context.damName && r < 0.4) return "pedigree";
  if ((context.sireName || context.damName) && r < 0.6) return "ancestor";
  if (context.namingTheme && r < 0.85) return "thematic";
  if (context.region) return "regional";
  return "thematic"; // Default to thematic if no region provided
}
