import type { Rng } from "@/game/rng";

export type { Rng };

export type Allele = number; // 1-10 for stats, or encoded for color
export type Locus = [Allele, Allele];
