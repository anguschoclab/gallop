/**
 * pedigreeAccessor.ts - Single import surface for pedigree data in core.
 *
 * Consolidates the 10 scattered `@/shared/data/pedigreeData` imports and 2
 * `@/data/stallionDNAData` imports from src/core into one accessor module.
 * Per PR 4 of the megaplan, this is a consolidation step for read-only
 * lookup tables that never change at runtime.
 *
 * Dependencies: @/data/pedigreeData, @/data/stallionDNAData
 * Related files: src/core/data/dataPorts.ts (optional override injection)
 */

import {
  activeStallions2020s,
  pedigreeDataset,
  pedigreeMap,
  findHorseByName,
  getSireByName as dataGetSireByName,
  getDamByName as dataGetDamByName,
  getRandomHorseFromEra as dataGetRandomHorseFromEra,
  getRandomSire as dataGetRandomSire,
  getRandomDam as dataGetRandomDam,
} from "@/shared/data/pedigreeData";
import type { AptitudinalGroup, PedigreeHorse } from "@/shared/data/pedigreeData";
import {
  stallionResearchData,
  hasCompleteData,
  getStallionResearchData,
} from "@/shared/data/stallionDNAData";
import type { StallionResearchData } from "@/shared/data/stallionDNAData";

export type { AptitudinalGroup, PedigreeHorse, StallionResearchData };

/** Override registry — tests can replace any accessor by mutating this object. */
export const pedigreeAccessors = {
  activeStallions2020s: (): PedigreeHorse[] => activeStallions2020s,
  dataset: (): PedigreeHorse[] => pedigreeDataset,
  map: (): Map<string, PedigreeHorse> => pedigreeMap,
  findByName: (name: string): PedigreeHorse | undefined => findHorseByName(name),
  sireByName: (horseName: string): string | undefined => dataGetSireByName(horseName),
  damByName: (horseName: string): string | undefined => dataGetDamByName(horseName),
  randomHorseFromEra: (
    era: PedigreeHorse["era"],
    rng?: import("@/shared/common/rng").Rng,
  ): PedigreeHorse | undefined => dataGetRandomHorseFromEra(era, rng),
  randomSire: (rng?: import("@/shared/common/rng").Rng): PedigreeHorse | undefined =>
    dataGetRandomSire(rng),
  randomDam: (rng?: import("@/shared/common/rng").Rng): PedigreeHorse | undefined =>
    dataGetRandomDam(rng),
  stallionResearch: (name: string): StallionResearchData | undefined =>
    getStallionResearchData(name),
  stallionResearchComplete: (data: StallionResearchData): boolean => hasCompleteData(data),
  stallionResearchMap: (): Map<string, StallionResearchData> => stallionResearchData,
};

/** Convenience re-exports for existing call sites. */
export {
  activeStallions2020s,
  pedigreeDataset,
  pedigreeMap,
  stallionResearchData,
  findHorseByName,
  getStallionResearchData,
  hasCompleteData,
};
