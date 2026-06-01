import { createRng, hashStr } from "@/game/rng";
import type { Backstory } from "@/core/newGame/backstories";
import { generateUUID } from "@/core/uuid";

export function makeWizardRng(seed: string) {
  return createRng(hashStr(`wizard_${seed}_${Date.now()}_${generateUUID()}`));
}

export const TOTAL_HORSES = (b: Backstory) => b.horses.reduce((sum, h) => sum + h.count, 0);
export const FACILITY_UPGRADE_COUNT = (b: Backstory) => Object.keys(b.facilityUpgrades).length;
