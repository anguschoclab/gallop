/* eslint-disable react-refresh/only-export { createRng, hashStr } from "@/shared/common/rng";;
import type { Backstory } from "@/shared/common/backstories";;
import { generateUUID } from "@/shared/uuid/uuid";;

export function makeWizardRng(seed: string) {
  return createRng(hashStr(`wizard_${seed}_${Date.now()}_${generateUUID()}`));
}

export const TOTAL_HORSES = (b: Backstory) => b.horses.reduce((sum, h) => sum + h.count, 0);
export const FACILITY_UPGRADE_COUNT = (b: Backstory) => Object.keys(b.facilityUpgrades).length;
