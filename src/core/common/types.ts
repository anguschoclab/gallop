/**
 * types.ts - Common type definitions
 *
 * This file provides common type definitions used across the codebase, including
 * Rng (re-exported), Allele, and Locus types for genetics.
 *
 * Dependencies: @/game/rng (Rng)
 * Related files: Used throughout the codebase, especially in genetics and horse modules
 */

import type { Rng } from "@/core/common/rng";

export type { Rng };

export type Allele = number; // 1-10 for stats, or encoded for color
export type Locus = [Allele, Allele];
